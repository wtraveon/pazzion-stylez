import test from "node:test";
import assert from "node:assert/strict";
import {
  clean, validEmail, validDate, validPhone, escapeHtml, emailHtml, readJson, methodNotAllowed, verifyTurnstile, sendEmail
} from "../functions/_lib/forms.js";

test("clean trims strings and caps their length", () => {
  assert.equal(clean("  hello  "), "hello");
  assert.equal(clean("abcdef", 3), "abc");
  assert.equal(clean(123), "");
});

test("validEmail accepts common valid addresses", () => {
  for (const value of [
    "person@example.com",
    "first.last+tag@example.co.uk",
    "a_b%z@example-domain.org"
  ]) assert.equal(validEmail(value), true, value);
});

test("validEmail rejects malformed addresses and numeric-only TLDs", () => {
  for (const value of [
    "", "missing-at.example.com", "@example.com", "person@localhost",
    ".person@example.com", "person..name@example.com", "person.@example.com",
    "person@example..com", "person@-example.com", "person@example-.com",
    "person@example.123", "person name@example.com", "a".repeat(65) + "@example.com",
    "person@" + "a".repeat(64) + ".com"
  ]) assert.equal(validEmail(value), false, value);
});

test("validDate accepts real calendar dates only", () => {
  assert.equal(validDate("2024-02-29"), true);
  assert.equal(validDate("2026-10-23"), true);
  for (const value of ["2025-02-29", "2026-13-01", "2026-04-31", "10/23/2026", "2026-1-01"]) {
    assert.equal(validDate(value), false, value);
  }
});

test("validPhone supports optional international notation and extensions", () => {
  for (const value of ["2524681243", "+1 (252) 468-1243", "252-468-1243 ext 123", "2524681243 x42"]) {
    assert.equal(validPhone(value), true, value);
  }
  for (const value of ["abc1234567", "123", "252-468-1243 ext abc", "2524681243 x1234567"]) {
    assert.equal(validPhone(value), false, value);
  }
  assert.equal(validPhone(""), true);
});

test("HTML escaping neutralizes markup and quote characters", () => {
  assert.equal(escapeHtml(`<script "x"='y'>&`), "&lt;script &quot;x&quot;=&#39;y&#39;&gt;&amp;");
});

test("emailHtml escapes user-provided fields and renders array values", () => {
  const html = emailHtml("<Notice>", [["Name", "<img src=x>"], ["Uses", ["Website", "Social"]]], "ref-1");
  assert.match(html, /&lt;Notice&gt;/);
  assert.match(html, /&lt;img src=x&gt;/);
  assert.match(html, /Website, Social/);
  assert.match(html, /ref-1/);
});

test("readJson accepts JSON objects and rejects invalid request shapes", async () => {
  const valid = await readJson(new Request("https://example.test/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "A" })
  }));
  assert.deepEqual(valid, { name: "A" });

  for (const request of [
    new Request("https://example.test/api", { method: "POST", headers: { "Content-Type": "text/plain" }, body: "{}" }),
    new Request("https://example.test/api", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" }),
    new Request("https://example.test/api", { method: "POST", headers: { "Content-Type": "application/json" }, body: "[]" })
  ]) assert.equal(await readJson(request), null);
});

test("readJson enforces the byte limit even without Content-Length", async () => {
  const body = "x".repeat(20001);
  const request = new Request("https://example.test/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body })
  });
  assert.equal(await readJson(request), null);
});

test("methodNotAllowed responds with 405 and an Allow header", () => {
  const response = methodNotAllowed();
  assert.equal(response.status, 405);
  assert.equal(response.headers.get("Allow"), "POST");
});


test("verifyTurnstile requires the expected hostname and action", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({
      success: true, hostname: "pazzionstylez.com", action: "contact"
    }), { status: 200 });
    const request = new Request("https://pazzionstylez.com/api/contact", { method: "POST" });
    const env = { TURNSTILE_SITE_KEY: "site-key", TURNSTILE_SECRET_KEY: "secret" };
    assert.equal(await verifyTurnstile("token", request, env, "contact"), true);
    assert.equal(await verifyTurnstile("token", request, env, "photo_release"), false);

    globalThis.fetch = async () => new Response(JSON.stringify({
      success: true, hostname: "attacker.example", action: "contact"
    }), { status: 200 });
    assert.equal(await verifyTurnstile("token", request, env, "contact"), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("verifyTurnstile fails closed when token or configuration is missing", async () => {
  const request = new Request("https://pazzionstylez.com/api/contact", { method: "POST" });
  assert.equal(await verifyTurnstile("", request, {}, "contact"), false);
});

test("sendEmail sanitizes subject newlines and reports provider success", async () => {
  const originalFetch = globalThis.fetch;
  let captured;
  try {
    globalThis.fetch = async (url, options) => {
      captured = { url: String(url), options, body: JSON.parse(options.body) };
      return new Response(JSON.stringify({ success: true, result: { message_id: "msg-1" } }), { status: 200 });
    };
    const result = await sendEmail({
      CLOUDFLARE_ACCOUNT_ID: "account",
      CLOUDFLARE_EMAIL_API_TOKEN: "token",
      FORM_NOTIFICATION_TO: "salon@example.com",
      FROM_EMAIL: "website@example.com"
    }, "Hello\r\nBcc: attacker@example.com", "<p>Message</p>", "client@example.com");

    assert.equal(result.ok, true);
    assert.equal(result.id, "msg-1");
    assert.equal(captured.body.subject, "Hello Bcc: attacker@example.com");
    assert.equal(captured.body.reply_to, "client@example.com");
    assert.deepEqual(captured.body.to, ["salon@example.com"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});


test("sendEmail fails safely when required configuration is missing", async () => {
  const result = await sendEmail({}, "Subject", "<p>Body</p>");
  assert.deepEqual(result, { ok: false, configurationError: true });
});

test("sendEmail reports provider rejection without exposing provider details", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({
      success: false,
      errors: [{ code: 1000, message: "Sensitive provider detail" }]
    }), { status: 400 });
    const result = await sendEmail({
      CLOUDFLARE_ACCOUNT_ID: "account",
      CLOUDFLARE_EMAIL_API_TOKEN: "token",
      FORM_NOTIFICATION_TO: "salon@example.com",
      FROM_EMAIL: "website@example.com"
    }, "Subject", "<p>Body</p>");
    assert.deepEqual(result, { ok: false, id: null, deliveryError: true });
  } finally {
    globalThis.fetch = originalFetch;
  }
});


test("sendEmail requires the notification inbox to be delivered or queued", async () => {
  const originalFetch = globalThis.fetch;
  const env = {
    CLOUDFLARE_ACCOUNT_ID: "account",
    CLOUDFLARE_EMAIL_API_TOKEN: "token",
    FORM_NOTIFICATION_TO: "salon@example.com",
    FROM_EMAIL: "website@example.com"
  };
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({
      success: true,
      result: { message_id: "msg-suppressed", delivered: [], queued: [], permanent_bounces: [], suppressed_recipients: ["salon@example.com"] }
    }), { status: 200 });
    assert.equal((await sendEmail(env, "Subject", "<p>Body</p>")).ok, false);

    globalThis.fetch = async () => new Response(JSON.stringify({
      success: true,
      result: { message_id: "msg-queued", delivered: [], queued: ["SALON@example.com"], permanent_bounces: [], suppressed_recipients: [] }
    }), { status: 200 });
    const queued = await sendEmail(env, "Subject", "<p>Body</p>");
    assert.equal(queued.ok, true);
    assert.equal(queued.id, "msg-queued");

    globalThis.fetch = async () => new Response(JSON.stringify({
      success: true,
      result: { message_id: "msg-bounced", delivered: [], queued: [], permanent_bounces: ["salon@example.com"], suppressed_recipients: [] }
    }), { status: 200 });
    assert.equal((await sendEmail(env, "Subject", "<p>Body</p>")).ok, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("sendEmail treats non-JSON provider responses as a failed delivery", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response("upstream unavailable", { status: 502 });
    const result = await sendEmail({
      CLOUDFLARE_ACCOUNT_ID: "account",
      CLOUDFLARE_EMAIL_API_TOKEN: "token",
      FORM_NOTIFICATION_TO: "salon@example.com",
      FROM_EMAIL: "website@example.com"
    }, "Subject", "<p>Body</p>");
    assert.deepEqual(result, { ok: false, id: null, deliveryError: true });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("verifyTurnstile rejects provider errors and malformed responses", async () => {
  const originalFetch = globalThis.fetch;
  const request = new Request("https://pazzionstylez.com/api/contact", { method: "POST" });
  const env = { TURNSTILE_SITE_KEY: "site-key", TURNSTILE_SECRET_KEY: "secret" };
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({
      success: false, hostname: "pazzionstylez.com", action: "contact"
    }), { status: 200 });
    assert.equal(await verifyTurnstile("token", request, env, "contact"), false);

    globalThis.fetch = async () => new Response("not json", { status: 502 });
    assert.equal(await verifyTurnstile("token", request, env, "contact"), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});


test("sendEmail fails safely when the provider request times out or disconnects", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => { throw new DOMException("The operation was aborted", "AbortError"); };
    const result = await sendEmail({
      CLOUDFLARE_ACCOUNT_ID: "account",
      CLOUDFLARE_EMAIL_API_TOKEN: "token",
      FORM_NOTIFICATION_TO: "salon@example.com",
      FROM_EMAIL: "website@example.com"
    }, "Subject", "<p>Body</p>");
    assert.deepEqual(result, { ok: false });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("verifyTurnstile fails closed when verification network request fails", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => { throw new TypeError("network unavailable"); };
    const request = new Request("https://pazzionstylez.com/api/contact", { method: "POST" });
    const env = { TURNSTILE_SITE_KEY: "site-key", TURNSTILE_SECRET_KEY: "secret" };
    assert.equal(await verifyTurnstile("token", request, env, "contact"), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
