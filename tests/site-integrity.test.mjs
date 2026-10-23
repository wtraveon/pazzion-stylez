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

test("JahNiqua is selectable in booking and has a working direct-contact fallback", async () => {
  const homepage = await readFile(path.join(root, "index.html"), "utf8");
  const script = await readFile(path.join(root, "script.js"), "utf8");
  const routes = await readFile(path.join(root, "booking-routes.js"), "utf8");

  assert.match(homepage, /href="\/?\?stylist=jahniqua#booking">Request Appointment with Jah/i,
    "JahNiqua's homepage team card should lead to her preselected appointment request");
  assert.match(homepage, /data-stylist="jahniqua"/i,
    "JahNiqua should be a selectable stylist in the booking section");
  assert.match(homepage, /id="jahniquaBookingContact"/i,
    "JahNiqua should have a dedicated appointment contact panel");
  assert.match(homepage, /href="tel:\+12523159963"/i,
    "JahNiqua's contact panel should include her phone link");
  assert.match(homepage, /href="sms:\+12523159963"/i,
    "JahNiqua's contact panel should include her text link");
  assert.match(homepage, /href="mailto:jspeight13@yahoo\.com"/i,
    "JahNiqua's contact panel should include her email link");
  assert.match(script, /key==='jahniqua'\?'none':''/,
    "Selecting JahNiqua should hide the LaToya/Kottia online booking status options");
  assert.match(script, /jahniquaBookingContact\.hidden=key!=='jahniqua'/,
    "Selecting JahNiqua should show her direct appointment contact panel");
  assert.match(script, /new URLSearchParams\(window\.location\.search\)\.get\('stylist'\)/,
    "Profile appointment links should be able to preselect a stylist on the homepage");
  const jahProfile = await readFile(path.join(root, "team", "jahniqua-speight", "index.html"), "utf8");
  assert.match(jahProfile, /href="\/?\?stylist=jahniqua#booking"/,
    "JahNiqua's profile should link to her preselected appointment contact flow");
  assert.doesNotMatch(routes, /jahniqua-(?:new|returning)/i,
    "Do not invent Square booking routes for JahNiqua without her confirmed booking URLs");
});


function localReference(ref, file) {
  const value = ref.trim().split(/[?#]/, 1)[0];
  if (!value || value.startsWith("//") || /^[a-z][a-z\d+.-]*:/i.test(value)) return null;
  if (!assetExtensions.test(value)) return null;
  return value.startsWith("/")
    ? path.join(root, value.slice(1))
    : path.resolve(path.dirname(file), value);
}

test("all HTML images declare an alt attribute", async () => {
  const missingAlt = [];
  for (const file of htmlFiles) {
    const html = await readFile(file, "utf8");
    for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
      if (!/\balt\s*=/i.test(match[0])) {
        missingAlt.push(`${path.relative(root, file)}: ${match[0].slice(0, 140)}`);
      }
    }
  }
  assert.deepEqual(missingAlt, [],
    `Images missing alt attributes (use alt="" for decorative images):\n${missingAlt.join("\n")}`);
});

test("each public HTML page has exactly one primary heading", async () => {
  const invalid = [];
  for (const file of htmlFiles) {
    const relative = path.relative(root, file).split(path.sep).join("/");
    if (relative === "404.html") continue;
    const html = await readFile(file, "utf8");
    const count = [...html.matchAll(/<h1\b[^>]*>/gi)].length;
    if (count !== 1) invalid.push(`${relative}: found ${count} h1 elements`);
  }
  assert.deepEqual(invalid, [],
    `Public pages should each have exactly one h1:\n${invalid.join("\n")}`);
});


test("visible form controls have accessible labels", async () => {
  const problems = [];
  for (const file of htmlFiles) {
    const html = await readFile(file, "utf8");
    const labels = [...html.matchAll(/<label\b[^>]*>[\s\S]*?<\/label>/gi)].map(match => match[0]);
    const labelTargets = new Set(
      [...html.matchAll(/<label\b[^>]*\bfor=["']([^"']+)["'][^>]*>/gi)].map(match => match[1])
    );
    for (const match of html.matchAll(/<(input|select|textarea)\b[^>]*>/gi)) {
      const tag = match[0];
      if (/\btype=["']hidden["']/i.test(tag) || /\baria-hidden=["']true["']/i.test(tag)) continue;
      const id = tag.match(/\bid=["']([^"']+)["']/i)?.[1];
      const wrappedByLabel = labels.some(label => label.includes(tag));
      if (!(id && labelTargets.has(id)) && !wrappedByLabel) {
        problems.push(`${path.relative(root, file)}: ${tag.slice(0, 160)}`);
      }
    }
  }
  assert.deepEqual(problems, [], `Form controls missing accessible labels:\n${problems.join("\n")}`);
});

test("links opening new tabs protect the opener", async () => {
  const unsafe = [];
  for (const file of htmlFiles) {
    const html = await readFile(file, "utf8");
    for (const match of html.matchAll(/<a\b[^>]*>/gi)) {
      const tag = match[0];
      if (!/\btarget=["']_blank["']/i.test(tag)) continue;
      const rel = tag.match(/\brel=["']([^"']*)["']/i)?.[1] || "";
      const tokens = rel.toLowerCase().split(/\s+/);
      if (!tokens.includes("noopener") && !tokens.includes("noreferrer")) {
        unsafe.push(path.relative(root, file) + ": " + tag.slice(0, 180));
      }
    }
  }
  assert.deepEqual(unsafe, [], "Links with target=\"_blank\" must include rel=\"noopener\" or rel=\"noreferrer\":\n" + unsafe.join("\n"));
});

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

test("internal page links resolve to existing HTML pages", async () => {
  const broken = [];
  for (const file of htmlFiles) {
    const html = await readFile(file, "utf8");
    for (const match of html.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi)) {
      const href = match[1].trim();
      if (!href || href.startsWith("#") || href.startsWith("//") || /^[a-z][a-z\d+.-]*:/i.test(href)) continue;
      const pathname = decodeURIComponent(href.split(/[?#]/, 1)[0]);
      if (!pathname) continue;
      let target = pathname.startsWith("/")
        ? path.join(root, pathname.slice(1))
        : path.resolve(path.dirname(file), pathname);
      try {
        const statPath = target.endsWith(path.sep) || !path.extname(target)
          ? path.join(target, "index.html")
          : target;
        await access(statPath);
      } catch {
        broken.push(`${path.relative(root, file)} -> ${href}`);
      }
    }
  }
  assert.deepEqual(broken, [], `Broken internal page links:\\n${broken.join("\\n")}`);
});

test("internal fragment links point to existing element IDs", async () => {
  const broken = [];
  const htmlCache = new Map();
  async function readHtml(file) {
    if (!htmlCache.has(file)) htmlCache.set(file, await readFile(file, "utf8"));
    return htmlCache.get(file);
  }
  for (const file of htmlFiles) {
    const html = await readHtml(file);
    for (const match of html.matchAll(/<a\b[^>]*\bhref=["']([^"']*#[^"']*)["'][^>]*>/gi)) {
      const href = match[1].trim();
      if (!href || href.startsWith("//") || /^[a-z][a-z\d+.-]*:/i.test(href)) continue;
      const hashAt = href.indexOf("#");
      const fragment = decodeURIComponent(href.slice(hashAt + 1));
      if (!fragment) continue;
      const pathname = decodeURIComponent(href.slice(0, hashAt).split("?", 1)[0]);
      let target = pathname
        ? (pathname.startsWith("/")
          ? path.join(root, pathname.slice(1))
          : path.resolve(path.dirname(file), pathname))
        : file;
      if (pathname && (target.endsWith(path.sep) || !path.extname(target))) target = path.join(target, "index.html");
      let targetHtml;
      try {
        targetHtml = await readHtml(target);
      } catch {
        continue; // Missing page paths are reported by the internal-link test.
      }
      const ids = new Set([...targetHtml.matchAll(/\bid=["']([^"']+)["']/gi)].map(([, id]) => id));
      if (!ids.has(fragment)) broken.push(`${path.relative(root, file)} -> ${href} (missing #${fragment})`);
    }
  }
  assert.deepEqual(broken, [], `Broken internal fragment links:\\n${broken.join("\\n")}`);
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

test("public HTML pages have unique, nonempty meta descriptions", async () => {
  const descriptions = new Map();
  const problems = [];
  for (const file of htmlFiles) {
    const relative = path.relative(root, file).split(path.sep).join("/");
    if (relative === "404.html") continue;
    const html = await readFile(file, "utf8");
    const tag = [...html.matchAll(/<meta\b[^>]*>/gi)]
      .map(match => match[0])
      .find(meta => /\bname=["']description["']/i.test(meta));
    const description = tag?.match(/\bcontent=["']([^"']*)["']/i)?.[1]?.trim();
    if (!description) {
      problems.push(`${relative}: missing or empty meta description`);
      continue;
    }
    const normalized = description.replace(/\s+/g, " ").toLowerCase();
    if (descriptions.has(normalized)) {
      problems.push(`${relative}: duplicate meta description also used by ${descriptions.get(normalized)}`);
    } else {
      descriptions.set(normalized, relative);
    }
  }
  assert.deepEqual(problems, [], `Meta description issues:\n${problems.join("\n")}`);
});

test("public HTML pages declare their own canonical URL", async () => {
  const missingOrIncorrect = [];
  for (const file of htmlFiles) {
    const relative = path.relative(root, file).split(path.sep).join("/");
    if (relative === "404.html") continue;
    const expectedPath = relative === "index.html"
      ? "/"
      : relative.endsWith("/index.html")
        ? "/" + relative.slice(0, -"index.html".length)
        : "/" + relative;
    const html = await readFile(file, "utf8");
    const canonicalTag = [...html.matchAll(/<link\b[^>]*>/gi)]
      .map(match => match[0])
      .find(tag => /\brel=["']canonical["']/i.test(tag));
    const canonicalHref = canonicalTag?.match(/\bhref=["']([^"']+)["']/i)?.[1];
    let canonicalUrl;
    try {
      canonicalUrl = new URL(canonicalHref);
    } catch {
      missingOrIncorrect.push(`${relative}: missing or invalid canonical URL`);
      continue;
    }
    if (canonicalUrl.origin !== "https://pazzionstylez.com" || canonicalUrl.pathname !== expectedPath
      || canonicalUrl.search || canonicalUrl.hash) {
      missingOrIncorrect.push(`${relative}: expected https://pazzionstylez.com${expectedPath}, got ${canonicalHref}`);
    }
  }
  assert.deepEqual(missingOrIncorrect, [],
    `Missing or incorrect canonical URLs:\n${missingOrIncorrect.join("\n")}`);
});

test("all public HTML pages are discoverable from the sitemap", async () => {
  const sitemap = await readFile(path.join(root, "sitemap.xml"), "utf8");
  const sitemapPaths = new Set(
    [...sitemap.matchAll(/<loc>https:\/\/pazzionstylez\.com([^<]*)<\/loc>/gi)]
      .map(([, urlPath]) => {
        const normalized = urlPath.replace(/\/$/, "");
        return normalized || "/";
      })
  );

  const missingFromSitemap = [];
  for (const file of htmlFiles) {
    const relative = path.relative(root, file).split(path.sep).join("/");
    if (relative === "404.html") continue;
    const urlPath = relative === "index.html"
      ? "/"
      : relative.endsWith("/index.html")
        ? "/" + relative.slice(0, -"index.html".length)
        : "/" + relative;
    const normalized = urlPath.replace(/\/$/, "") || "/";
    if (!sitemapPaths.has(normalized)) missingFromSitemap.push(`${relative} -> ${urlPath}`);
  }
  assert.deepEqual(missingFromSitemap, [],
    `Public HTML pages missing from sitemap.xml:\n${missingFromSitemap.join("\n")}`);
});

test("sitemap contains only valid canonical production URLs", async () => {
  const sitemap = await readFile(path.join(root, "sitemap.xml"), "utf8");
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/gi)].map(([, value]) => value.trim());
  assert.ok(urls.length > 0, "Expected at least one URL in sitemap.xml");
  const invalid = [];
  for (const value of urls) {
    let url;
    try {
      url = new URL(value);
    } catch {
      invalid.push(`invalid URL: ${value}`);
      continue;
    }
    if (url.protocol !== "https:" || url.hostname !== "pazzionstylez.com"
      || url.username || url.password || url.search || url.hash) {
      invalid.push(`noncanonical production URL: ${value}`);
    }
  }
  assert.deepEqual(invalid, [], `Invalid sitemap URLs:\n${invalid.join("\n")}`);
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

test("deployment security headers and robots sitemap declaration stay configured", async () => {
  const headers = await readFile(path.join(root, "_headers"), "utf8");
  const requiredHeaders = [
    "X-Content-Type-Options: nosniff",
    "X-Frame-Options: DENY",
    "Referrer-Policy: strict-origin-when-cross-origin",
    "Strict-Transport-Security: max-age=31536000"
  ];
  for (const header of requiredHeaders) {
    assert.ok(headers.includes(header), `Missing deployment security header: ${header}`);
  }

  const robots = await readFile(path.join(root, "robots.txt"), "utf8");
  assert.ok(robots.includes("User-agent: *"), "robots.txt should define rules for all crawlers");
  assert.ok(robots.includes("Disallow: /api/"), "robots.txt should keep API endpoints out of crawler discovery");
  assert.ok(robots.includes("Sitemap: https://pazzionstylez.com/sitemap.xml"), "robots.txt should declare the production sitemap");
});



test("product cards disclose that Square links open the general storefront", async () => {
  const productPage = await readFile(path.join(root, "products", "index.html"), "utf8");
  const tiles = [...productPage.matchAll(/<article class="ps-product-tile">([\s\S]*?)<\/article>/gi)].map(([, tile]) => tile);
  assert.equal(tiles.length, 11, "Expected all eleven product tiles to be present");
  for (const tile of tiles) {
    assert.match(tile, /href="https:\/\/pazzion-stylez-llc\.square\.site\/"[^>]*aria-label="Open the Square store to find [^"]+"/i,
      "Product image links should clearly state that Square opens the storefront");
    assert.match(tile, />Browse Square store <span aria-hidden="true">↗<\/span>/i,
      "Product CTA should not imply a product-specific checkout destination");
  }
  assert.match(productPage, /opens the Square storefront, not a product-specific checkout page/i,
    "The product page should explain that shoppers need to find the item in the Square storefront");
});


test("homepage and salon policy agree on deposits and new-client consultations", async () => {
  const homepage = await readFile(path.join(root, "index.html"), "utf8");
  const policies = await readFile(path.join(root, "policies", "index.html"), "utf8");
  for (const [name, html] of [["homepage", homepage], ["policies page", policies]]) {
    assert.match(html, /No deposit is required/i, `${name} should communicate the no-deposit policy`);
    assert.match(html, /\$25 consultation/i, `${name} should disclose the new-client consultation fee`);
  }
});

test("homepage JSON-LD structured data parses as valid JSON", async () => {
  const homepage = await readFile(path.join(root, "index.html"), "utf8");
  const blocks = [...homepage.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  assert.ok(blocks.length > 0, "Homepage should include JSON-LD structured data");
  for (const [, json] of blocks) {
    assert.doesNotThrow(() => JSON.parse(json), "Each JSON-LD block should contain valid JSON");
  }
});


test("homepage product section accurately describes general Square storefront links", async () => {
  const homepage = await readFile(path.join(root, "index.html"), "utf8");
  const tiles = [...homepage.matchAll(/<article class="product-card ps-home-product">([\\s\\S]*?)<\\/article>/gi)].map(([, tile]) => tile);
  assert.equal(tiles.length, 11, "Expected eleven homepage product tiles");
  for (const tile of tiles) {
    assert.match(tile, />Browse Square store ↗<\\/a>/i,
      "Homepage product links should describe the general Square storefront");
  }
  assert.match(homepage, /Product cards open the general Square storefront/i,
    "Homepage should explain that product links open the general storefront");
  assert.match(homepage, /not a product-specific checkout page/i,
    "Homepage should disclose that product cards are not item-specific checkout links");
  assert.doesNotMatch(homepage, /Select products are available in 4 oz, 8 oz and 16 oz sizes, with current pricing ranging from \\$5–\\$20/i,
    "Homepage must not state unverified product sizes and prices");
});
