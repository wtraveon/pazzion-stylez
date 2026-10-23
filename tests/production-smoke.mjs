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

const homepageResponse = await request("/");
assert.equal(homepageResponse.status, 200, `Homepage returned HTTP ${homepageResponse.status}`);
const homepage = await homepageResponse.text();
assert.match(homepage, /<title>[^<]*Pazzion Stylez/i, "Homepage title should identify Pazzion Stylez");
assert.match(homepage, /Browse the general Pazzion Stylez Square storefront and search for the product name/i,
  "Live homepage FAQ must accurately explain how to find products in the general Square storefront");
assert.doesNotMatch(homepage, /Pickup and shipping options are shown during checkout/i,
  "Live homepage must not promise unverified Square checkout options");
const productPage = await getText("/products/");
assert.match(productPage, /<div class="hero-actions">[^]*?<a class="btn btn-primary"[^>]*>Browse Square store<\/a>/i,
  "Live product hero CTA must use the accurate general-storefront label");
assert.doesNotMatch(productPage.match(/<div class="hero-actions">[^]*?<\/div>/i)?.[0] || "", /Shop Available Products/i,
  "Live product hero must not show the outdated Shop Available Products label");
assert.match(productPage, /Product links open the general Square storefront, not individual product pages/i,
  "Live product page must clarify that product links do not open individual product listings");
assert.match(homepage, /href=["']\/?\?stylist=jahniqua#booking["'][^>]*>Request Appointment with Jah/i,
  "Live homepage should expose JahNiqua's preselected appointment request path");
assert.match(homepage, /data-stylist=["']jahniqua["']/i,
  "Live homepage should include JahNiqua in stylist selection");
assert.match(homepage, /href=["']tel:\+12523159963["']/i,
  "Live homepage should expose JahNiqua's direct call option");
assert.match(homepage, /href=["']sms:\+12523159963["']/i,
  "Live homepage should expose JahNiqua's direct text option");
assert.match(homepage, /href=["']mailto:jspeight13@yahoo\.com["']/i,
  "Live homepage should expose JahNiqua's direct email option");
const jahProfile = await getText("/team/jahniqua-speight/");
assert.match(jahProfile, /href=["']\/?\?stylist=jahniqua#booking["'][^>]*>Request Appointment/i,
  "Live JahNiqua profile should link to her appointment request path");
assert.match(jahProfile, /href=["']tel:\+12523159963["']/i,
  "Live JahNiqua profile should expose her call option");
assert.match(jahProfile, /href=["']sms:\+12523159963["']/i,
  "Live JahNiqua profile should expose her text option");
assert.match(jahProfile, /href=["']mailto:jspeight13@yahoo\.com["']/i,
  "Live JahNiqua profile should expose her email option");
assert.match(homepage, /Select LaToya, Kottia, or JahNiqua to continue to that stylist[’']s Square booking page/i,
  "Live homepage should explain that all three stylists have online Square booking");
assert.doesNotMatch(homepage, /online booking link is not configured|select LaToya or Kottia to continue to online booking|contact JahNiqua Speight directly to confirm her services and availability|To arrange an appointment with JahNiqua, contact her directly/i,
  "Live homepage must not show outdated JahNiqua booking instructions");
const jahProfile = await getText("/team/jahniqua-speight/");
assert.match(jahProfile, /continue to JahNiqua[’']s Square booking page/i,
  "Live JahNiqua profile should describe her online booking route");
assert.doesNotMatch(jahProfile, /contact her to arrange your appointment|direct online booking link is not configured/i,
  "Live JahNiqua profile must not retain outdated booking instructions");

const bookingScriptPath = homepage.match(/<script\b[^>]*\bsrc=["']([^"']*script\.js(?:\?[^"']*)?)["'][^>]*>/i)?.[1];
assert.ok(bookingScriptPath, "Live homepage should load the booking script");
const bookingScript = await getText(bookingScriptPath);
assert.match(bookingScript, /new URLSearchParams\(window\.location\.search\)\.get\('stylist'\)/,
  "Live booking script should support stylist preselection from profile links");

for (const [header, expected] of [
  ["x-content-type-options", "nosniff"],
  ["x-frame-options", "DENY"],
  ["referrer-policy", "strict-origin-when-cross-origin"]
]) {
  assert.equal(homepageResponse.headers.get(header), expected, `Live homepage must send ${header}: ${expected}`);
}
assert.match(homepageResponse.headers.get("strict-transport-security") || "", /max-age=31536000/,
  "Live homepage should send HSTS with a one-year max-age");

const robots = await getText("/robots.txt");
assert.ok(robots.includes("Disallow: /api/"), "Live robots.txt should disallow API paths");
assert.ok(robots.includes("Sitemap: https://pazzionstylez.com/sitemap.xml"), "Live robots.txt should point to the production sitemap");

const sitemap = await getText("/sitemap.xml");
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, url]) => url.trim());
assert.ok(sitemapUrls.includes("https://pazzionstylez.com/"), "Live sitemap should include the canonical homepage");
assert.ok(sitemapUrls.length > 0, "Live sitemap should contain at least one URL");
assert.equal(new Set(sitemapUrls).size, sitemapUrls.length, "Live sitemap should not contain duplicate URLs");
assert.ok(sitemapUrls.every(url => url.startsWith("https://pazzionstylez.com/")),
  "Live sitemap URLs should stay on the canonical HTTPS domain");

const liveDescriptions = new Map();

const publishedPageResults = await Promise.all(sitemapUrls.map(async url => {
  const parsed = new URL(url);
  const response = await request(parsed.pathname + parsed.search);
  assert.equal(response.status, 200, `Sitemap page ${parsed.pathname} returned HTTP ${response.status}`);
  assert.match(response.headers.get("content-type") || "", /text\/html/i,
    `Sitemap page ${parsed.pathname} should return HTML`);
  const html = await response.text();
  assert.match(html, /<title>[^<]+<\/title>/i, `Sitemap page ${parsed.pathname} should have a page title`);
  const descriptionTag = [...html.matchAll(/<meta\b[^>]*>/gi)]
    .map(match => match[0])
    .find(tag => /\bname=["']description["']/i.test(tag));
  const description = descriptionTag?.match(/\bcontent=["']([^"']*)["']/i)?.[1]?.trim();
  assert.ok(description, `Sitemap page ${parsed.pathname} should have a nonempty meta description`);
  const normalizedDescription = description.replace(/\s+/g, " ").toLowerCase();
  assert.ok(!liveDescriptions.has(normalizedDescription),
    `Sitemap page ${parsed.pathname} duplicates the meta description on ${liveDescriptions.get(normalizedDescription)}`);
  liveDescriptions.set(normalizedDescription, parsed.pathname);
  const canonicalMatch = html.match(/<link\b[^>]*\brel=["']canonical["'][^>]*\bhref=["']([^"']+)["'][^>]*>/i)
    || html.match(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*\brel=["']canonical["'][^>]*>/i);
  assert.ok(canonicalMatch, `Sitemap page ${parsed.pathname} should declare a canonical URL`);
  assert.equal(new URL(canonicalMatch[1], url).href, url,
    `Sitemap page ${parsed.pathname} canonical URL should match its sitemap URL`);
  return parsed.pathname;
}));
console.log(`Published sitemap pages verified: ${publishedPageResults.length}`);

const policyPage = await getText("/policies/");
assert.match(policyPage, /does not require deposits for services or consultations/i,
  "Live policy page must state that services and consultations do not require deposits");
assert.match(policyPage, /No deposit is collected, so there is no deposit to forfeit/i,
  "Live no-show policy must not contradict the no-deposit policy");

const bookingRoutesSource = await getText("/booking-routes.js");
const routePairs = [...bookingRoutesSource.matchAll(/['"](latoya-new|latoya-returning|kottia-new|kottia-returning|jahniqua-new|jahniqua-returning)['"]\s*:\s*['"](https:\/\/(?:book|app)\.squareup\.com\/appointments\/[^'"]+)['"]/g)];
const routes = new Map(routePairs.map(([, key, url]) => [key, url]));
for (const key of ["latoya-new", "latoya-returning", "kottia-new", "kottia-returning", "jahniqua-new", "jahniqua-returning"]) {
  assert.ok(routes.has(key), `Missing live Square booking route: ${key}`);
  assert.ok(["book.squareup.com", "app.squareup.com"].includes(new URL(routes.get(key)).hostname), `${key} must use the official Square booking host`);
}
assert.equal(routes.size, 6, "Expected two client-status routes per online-booking stylist");
assert.equal(routes.get("jahniqua-new"), routes.get("jahniqua-returning"), "JahNiqua should use her verified Square booking link for both client statuses");

// Check the actual Square endpoints as well as the local mapping. Square may
// challenge automated clients (403/429); those statuses still prove the host
// was reached. A missing route or server failure is treated as a real failure.
const squareResults = await Promise.all([...routes.entries()].map(async ([key, url]) => {
  let lastError;
  // Square occasionally stalls or challenges automated clients. Retry transient
  // network/timeout failures once so one flaky endpoint does not abort all checks.
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
      response = await fetch(url, {
        redirect: "follow",
        signal: controller.signal,
        headers: { "user-agent": "Mozilla/5.0 (compatible; PazzionStylez-ProductionSmoke/1.0)" }
      });
    } catch (error) {
      lastError = error;
      if (attempt === 2) break;
      continue;
    } finally {
      clearTimeout(timer);
    }

    // HTTP failures are deterministic test failures, not transient network errors:
    // report the real status immediately rather than retrying and masking it.
    assert.ok(
      ![404, 410].includes(response.status) && response.status < 500,
      `Square route ${key} returned HTTP ${response.status}: ${url}`
    );
    return { key, status: response.status, attempt };
  }
  throw new Error(`Square route ${key} failed after 2 attempts: ${lastError?.name || "network error"}: ${url}`);
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
  assert.equal(response.headers.get("cache-control"), "no-store",
    `${endpoint} must not cache form validation responses`);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff",
    `${endpoint} must set X-Content-Type-Options: nosniff`);
  const result = await response.json();
  assert.equal(result.success, false, `${endpoint} should reject the invalid test payload`);
}

console.log("Production smoke checks passed: homepage, current policy, four Square route mappings, Turnstile config, and both form API validation paths.");
console.log("Note: successful API validation does not prove real email delivery; send a consented test submission from a real browser to verify inbox receipt.");
