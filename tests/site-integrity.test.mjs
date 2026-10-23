import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(fullPath));
    else if (entry.isFile() && entry.name.endsWith(".html")) files.push(fullPath);
  }
  return files;
}

const htmlFiles = await walk(root);
const assetExtensions = /\.(?:css|js|mjs|png|jpe?g|webp|gif|svg|ico|woff2?|ttf|mp4|webm|pdf)$/i;

function localReference(ref, file) {
  const value = ref.trim().split(/[?#]/, 1)[0];
  if (!value || value.startsWith("//") || /^[a-z][a-z\d+.-]*:/i.test(value)) return null;
  if (!assetExtensions.test(value)) return null;
  return value.startsWith("/")
    ? path.join(root, value.slice(1))
    : path.resolve(path.dirname(file), value);
}

test("HTML pages have unique IDs", async () => {
  const duplicates = [];
  for (const file of htmlFiles) {
    const html = await readFile(file, "utf8");
    const ids = [...html.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)].map(match => match[1]);
    const seen = new Set();
    for (const id of ids) {
      if (seen.has(id)) duplicates.push(`${path.relative(root, file)}: ${id}`);
      seen.add(id);
    }
  }
  assert.deepEqual(duplicates, [], `Duplicate HTML IDs found:\n${duplicates.join("\n")}`);
});

test("local static asset references resolve to existing files", async () => {
  const missing = [];
  for (const file of htmlFiles) {
    const html = await readFile(file, "utf8");
    const refs = [];
    for (const match of html.matchAll(/\b(?:src|href|poster|data-full)\s*=\s*["']([^"']+)["']/gi)) {
      refs.push(match[1]);
    }
    for (const match of html.matchAll(/\bsrcset\s*=\s*["']([^"']+)["']/gi)) {
      for (const candidate of match[1].split(",")) {
        const url = candidate.trim().split(/\s+/)[0];
        if (url) refs.push(url);
      }
    }
    for (const ref of refs) {
      const target = localReference(ref, file);
      if (!target) continue;
      try {
        await access(target);
      } catch {
        missing.push(`${path.relative(root, file)} -> ${ref}`);
      }
    }
  }
  assert.deepEqual(missing, [], `Missing local assets:\n${missing.join("\n")}`);
});

test("pages that load script.js use the same cache-busting version", async () => {
  const versions = new Map();
  for (const file of htmlFiles) {
    const html = await readFile(file, "utf8");
    for (const match of html.matchAll(/<script\b[^>]*\bsrc=["']([^"']*script\.js(?:\?[^"']*)?)["'][^>]*>/gi)) {
      const url = match[1];
      const version = new URL(url, "https://pazzionstylez.com/").searchParams.get("v");
      versions.set(path.relative(root, file), version || "(missing)");
    }
  }
  assert.ok(versions.size > 0, "Expected at least one page to load script.js");
  const uniqueVersions = [...new Set(versions.values())];
  assert.equal(uniqueVersions.length, 1, `Inconsistent script.js cache versions: ${JSON.stringify(Object.fromEntries(versions))}`);
  assert.notEqual(uniqueVersions[0], "(missing)", "script.js must have a cache-busting version");
});


test("pages that load styles.css use the same cache-busting version", async () => {
  const versions = new Map();
  for (const file of htmlFiles) {
    const html = await readFile(file, "utf8");
    for (const match of html.matchAll(/<link\b[^>]*\bhref=["']([^"']*styles\.css(?:\?[^"']*)?)["'][^>]*>/gi)) {
      const url = match[1];
      const version = new URL(url, "https://pazzionstylez.com/").searchParams.get("v");
      versions.set(path.relative(root, file), version || "(missing)");
    }
  }
  assert.ok(versions.size > 0, "Expected at least one page to load styles.css");
  const uniqueVersions = [...new Set(versions.values())];
  assert.equal(uniqueVersions.length, 1, `Inconsistent styles.css cache versions: ${JSON.stringify(Object.fromEntries(versions))}`);
  assert.notEqual(uniqueVersions[0], "(missing)", "styles.css must have a cache-busting version");
});

test("sitemap URLs point to tracked HTML pages", async () => {
  const sitemapPath = path.join(root, "sitemap.xml");
  const sitemap = await readFile(sitemapPath, "utf8");
  const urls = [...sitemap.matchAll(/<loc>(https:\/\/pazzionstylez\.com([^<]*))<\/loc>/gi)];
  assert.ok(urls.length > 0, "Expected public URLs in sitemap.xml");
  const missing = [];
  const seen = new Set();
  for (const [, fullUrl, urlPath] of urls) {
    if (seen.has(fullUrl)) missing.push(`duplicate URL: ${fullUrl}`);
    seen.add(fullUrl);
    const relative = urlPath.replace(/^\//, "");
    const target = path.join(root, relative, relative.endsWith(".html") ? "" : "index.html");
    try {
      await access(target);
    } catch {
      missing.push(`missing HTML page: ${fullUrl} -> ${path.relative(root, target)}`);
    }
  }
  assert.deepEqual(missing, [], `Invalid sitemap entries:\n${missing.join("\n")}`);
});
