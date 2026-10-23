# Repository Asset Audit

**Baseline audit date:** 2026-10-23  
**Baseline branch:** `main`  
**Baseline commit scanned:** `942979878b4eaf0883131b2d09fa3a5f02540297`

> The counts below are a snapshot from the baseline commit, not a claim that the current branch has identical file counts. The current `main` branch runs `tests/site-integrity.test.mjs` in GitHub Actions. It checks tracked HTML pages for duplicate IDs and missing local static assets, consistent cache-busting versions for both `script.js` and `styles.css`, and sitemap URL uniqueness and tracked-page targets. These checks passed on commit `d5ac7312b6a742232803af445cfd95a3f32d3379` on 2026-10-23.

## Result

- **16** tracked HTML pages scanned.
- **56** tracked files under `assets/`.
- **32** distinct local image/media paths referenced by HTML.
- **0** referenced image/media paths missing from the tracked repository.
- **371** local links checked across the HTML pages; **0** broken local targets found.
- **0** duplicate HTML IDs found.

The previous 2026-10-15 audit stated that the repository had no `assets/` directory. That finding is stale: the assets are now present. This scan checks references in HTML attributes (`src`, `href`, and `content`) against the recursive Git tree. The baseline source scan checked 371 relative/local links and duplicate IDs across those 16 HTML pages. It does not check CSS URLs, runtime-generated URLs, live HTTP status, browser rendering, JavaScript behavior, external links, or image visual correctness.

## Follow-up review

The repository contains additional assets that are not directly referenced by the current HTML scan. Some may be responsive image variants, legacy product photos, gallery uploads, or files used from CSS/JavaScript. Review before deleting anything.

Examples of currently unreferenced assets include:
- Responsive brand image variants such as `assets/images/brand/hero-signature-style-480.webp`.
- Older product image variants such as `assets/images/products/beard-oil.webp` and `assets/images/products/scalp-treatment.webp`.
- Gallery uploads such as `assets/images/gallery/image44.jpeg`.

## Production validation status — 2026-10-23

The production smoke workflow passed on commit `d5ac7312b6a742232803af445cfd95a3f32d3379` on 2026-10-23. The latest run verifies live homepage and Products page guidance, sitemap pages and metadata, security headers, booking script preselection, stylist contact links, published Square booking routes for all three stylists and both client-status keys, Square endpoint reachability, Turnstile configuration, and invalid-payload handling for the contact and photo-release APIs. It also checks that the homepage, privacy page, and photo-release page use consistent script cache versions. The live Products hero CTA was confirmed as **Browse Square store**. Both the website-integrity workflow and production-smoke workflow passed on this commit.

The following still need manual or real-browser validation:

- Review desktop and mobile rendering and inspect browser console/network errors.
- Complete a real browser booking flow for each Square route. Automated reachability does not prove a route's full booking experience, especially if Square rate-limits automated requests.
- Submit a consented test contact and photo-release form in the deployed Cloudflare Pages runtime and confirm notification email delivery.

A clean static audit and passing production smoke checks improve confidence but do not prove every browser interaction or email delivery path works end to end.
