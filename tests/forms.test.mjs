import test from "node:test";
import assert from "node:assert/strict";
import {
  clean, validEmail, validDate, validPhone, escapeHtml, emailHtml, readJson, methodNotAllowed
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
