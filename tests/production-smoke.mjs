import assert from "node:assert/strict";

const base = process.env.SITE_BASE_URL || "https://pazzionstylez.com";
const timeoutMs = 15000;

async function request(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(new URL(path, base), {
      ...options,
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "PazzionStylez-ProductionSmoke/1.0", ...(options.headers || {}) }
    });
  } finally {
    clearTimeout(timer);
  }
}

async function getText(path) {
  const response = await request(path);
  assert.equal(response.status, 200, `${path} returned HTTP ${response.status}`);
  return response.text();
}

const homepage = await getText("/");
assert.match(homepage, /<title>[^<]*Pazzion Stylez/i, "Homepage title should identify Pazzion Stylez");

const policyPage = await getText("/policies/");
assert.match(policyPage, /does not require deposits for services or consultations/i,
  "Live policy page must state that services and consultations do not require deposits");
assert.match(policyPage, /No deposit is collected, so there is no deposit to forfeit/i,
  "Live no-show policy must not contradict the no-deposit policy");

const bookingRoutesSource = await getText("/booking-routes.js");
const routePairs = [...bookingRoutesSource.matchAll(/['"](latoya-new|latoya-returning|kottia-new|kottia-returning)['"]\s*:\s*['"](https:\/\/book\.squareup\.com\/appointments\/[^'"]+)['"]/g)];
const routes = new Map(routePairs.map(([, key, url]) => [key, url]));
for (const key of ["latoya-new", "latoya-returning", "kottia-new", "kottia-returning"]) {
  assert.ok(routes.has(key), `Missing live Square booking route: ${key}`);
  assert.equal(new URL(routes.get(key)).hostname, "book.squareup.com", `${key} must use the official Square booking host`);
}
assert.equal(routes.size, 4, "Unexpected number of online Square booking routes");

// Check the actual Square endpoints as well as the local mapping. Square may
// challenge automated clients (403/429); those statuses still prove the host
// was reached. A missing route or server failure is treated as a real failure.
const squareResults = await Promise.all([...routes.entries()].map(async ([key, url]) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "Mozilla/5.0 (compatible; PazzionStylez-ProductionSmoke/1.0)" }
    });
    assert.ok(
      ![404, 410].includes(response.status) && response.status < 500,
      `Square route ${key} returned HTTP ${response.status}: ${url}`
    );
    return { key, status: response.status };
  } finally {
    clearTimeout(timer);
  }
}));
console.log("Square endpoint reachability:", squareResults.map(({ key, status }) => `${key}=${status}`).join(", "));

const configResponse = await request("/api/form-config", {
  headers: { accept: "application/json" }
});
assert.equal(configResponse.status, 200, `/api/form-config returned HTTP ${configResponse.status}`);
assert.match(configResponse.headers.get("content-type") || "", /application\/json/i,
  "/api/form-config must return JSON");
const config = await configResponse.json();
assert.equal(config.turnstile_enabled, true, "Production Turnstile must be configured");
assert.ok(typeof config.sitekey === "string" && config.sitekey.length > 0,
  "Production form configuration must expose a public Turnstile site key");

for (const endpoint of ["/api/contact", "/api/photo-release"]) {
  const response = await request(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: "{}"
  });
  assert.equal(response.status, 400, `${endpoint} should reject an empty payload with HTTP 400, got ${response.status}`);
  assert.match(response.headers.get("content-type") || "", /application\/json/i,
    `${endpoint} should return JSON validation errors`);
  const result = await response.json();
  assert.equal(result.success, false, `${endpoint} should reject the invalid test payload`);
}

console.log("Production smoke checks passed: homepage, current policy, four Square route mappings, Turnstile config, and both form API validation paths.");
console.log("Note: successful API validation does not prove real email delivery; send a consented test submission from a real browser to verify inbox receipt.");
