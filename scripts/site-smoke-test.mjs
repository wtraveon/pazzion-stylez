#!/usr/bin/env node
/**
 * Dependency-free static smoke checks for the Pazzion Stylez static site.
 * Run with: node scripts/site-smoke-test.mjs
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const errors = [];
const warnings = [];
const htmlFiles = [];

async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', '.github'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) htmlFiles.push(full);
  }
}
const fail = (message) => errors.push(message);
const warn = (message) => warnings.push(message);
const rel = (file) => path.relative(root, file).replaceAll(path.sep, '/');

await walk(root);
if (!htmlFiles.length) fail('No HTML files found.');

const pages = new Map();
for (const file of htmlFiles) {
  const html = await readFile(file, 'utf8');
  pages.set(file, html);
  const label = rel(file);
  const titles = [...html.matchAll(/<title\\b[^>]*>([\\s\\S]*?)<\\/title>/gi)];
  const descriptionTags = [...html.matchAll(/<meta\\b(?=[^>]*\\bname=[\"']description[\"'])[^>]*>/gi)].map((m) => m[0]);
  const descriptions = descriptionTags.map((tag) => tag.match(/\\bcontent=[\"']([^\"']*)[\"']/i)?.[1] ?? \"\");
  const canonicalTags = [...html.matchAll(/<link\\b(?=[^>]*\\brel=[\"']canonical[\"'])[^>]*>/gi)];
  if (titles.length !== 1 || !titles[0][1].trim()) fail(`\${label}: expected exactly one non-empty title.`);
  if (descriptions.length !== 1 || !descriptions[0].trim()) fail(`\${label}: expected exactly one non-empty meta description.`);
  if (canonicalTags.length !== 1) fail(`\${label}: expected exactly one canonical link.`);

  const ids = new Set([...html.matchAll(/\bid=["']([^"']+)["']/gi)].map((m) => m[1]));
  const seenIds = new Set();
  for (const m of html.matchAll(/\bid=["']([^"']+)["']/gi)) {
    if (seenIds.has(m[1])) warn(`${label}: duplicate id "${m[1]}".`);
    seenIds.add(m[1]);
  }

  for (const m of html.matchAll(/\b(?:href|src|data-full)=["']([^"']+)["']/gi)) {
    const value = m[1].trim();
    if (!value || value.startsWith(('https://')) || value.startsWith('http://') ||
        /^(mailto:|tel:|sms:|javascript:|data:|blob:|\/\/)/i.test(value)) continue;
    if (value.startsWith('#')) {
      const fragment = decodeURIComponent(value.slice(1));
      if (fragment && !ids.has(fragment)) fail(`${label}: fragment target #${fragment} does not exist.`);
      continue;
    }
    const clean = decodeURIComponent(value.split(/[?#]/, 1)[0]);
    if (!clean) continue;
    const target = clean.startsWith('/')
      ? path.join(root, clean.replace(/^\/+/, ''))
      : path.resolve(path.dirname(file), clean);
    let targetStat;
    try { targetStat = await stat(target); }
    catch {
      if (value.startsWith('/')) fail(`${label}: local target missing: ${value}`);
      else fail(`${label}: local target missing: ${value}`);
      continue;
    }
    if (targetStat.isDirectory()) {
      try { await stat(path.join(target, 'index.html')); }
      catch { fail(`${label}: directory target has no index.html: ${value}`); }
    }
  }

  for (const m of html.matchAll(/<img\b([^>]*)>/gi)) {
    const attrs = m[1];
    if (!/\balt=["'][^"']*["']/i.test(attrs)) fail(`${label}: image missing alt attribute.`);
    if (!/\bwidth=["']\d+["']/i.test(attrs) || !/\bheight=["']\d+["']/i.test(attrs)) {
      warn(`${label}: image missing explicit width/height (layout shift risk).`);
    }
  }

  const jsonLd = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const block of jsonLd) {
    try { JSON.parse(block[1]); }
    catch { fail(`${label}: invalid JSON-LD block.`); }
  }
}

const routesFile = path.join(root, 'booking-routes.js');
try {
  const routes = await readFile(routesFile, 'utf8');
  for (const key of ['latoya-new', 'latoya-returning', 'kottia-new', 'kottia-returning', 'jahniqua-new', 'jahniqua-returning']) {
    if (!routes.includes(`'${key}'`)) fail(`booking-routes.js: missing route key ${key}.`);
  }
  for (const url of routes.matchAll(/['"](https?:\/\/[^'"]+)['"]/g)) {
    if (!/square\.com\//i.test(url[1])) fail(`booking-routes.js: unexpected booking host ${url[1]}.`);
  }
} catch { fail('booking-routes.js is missing or unreadable.'); }

const robotsPath = path.join(root, 'robots.txt');
try {
  const robots = await readFile(robotsPath, 'utf8');
  if (!/Sitemap:\s*https?:\/\//i.test(robots)) fail('robots.txt must declare an absolute sitemap URL.');
} catch { fail('robots.txt is missing or unreadable.'); }

const sitemapPath = path.join(root, 'sitemap.xml');
try {
  const sitemap = await readFile(sitemapPath, 'utf8');
  if (!/<urlset\b/i.test(sitemap) || !/<loc>https:\/\//i.test(sitemap)) fail('sitemap.xml is missing urlset or absolute HTTPS locations.');
  for (const m of sitemap.matchAll(/<loc>(https?:\/\/[^<]+)<\/loc>/gi)) {
    if (!m[1].startsWith('https://pazzionstylez.com/')) warn(`Sitemap URL is outside the canonical site: ${m[1]}`);
  }
} catch { fail('sitemap.xml is missing or unreadable.'); }

console.log(`Checked ${htmlFiles.length} HTML pages.`);
for (const message of warnings) console.warn(`WARN: ${message}`);
for (const message of errors) console.error(`FAIL: ${message}`);
if (errors.length) {
  console.error(`\nStatic smoke test failed with ${errors.length} error(s) and ${warnings.length} warning(s).`);
  process.exitCode = 1;
} else {
  console.log(`Static smoke test passed with ${warnings.length} warning(s).`);
}
