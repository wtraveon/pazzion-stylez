# Repository Asset Audit

**Baseline audit date:** 2026-10-23  
**Baseline branch:** `main`  
**Baseline commit scanned:** `942979878b4eaf0883131b2d09fa3a5f02540297`

> The counts below are a snapshot from the baseline commit, not a claim that the current branch has identical file counts. The current `main` branch runs `tests/site-integrity.test.mjs` in GitHub Actions. It checks tracked HTML pages for duplicate IDs and missing local static assets, consistent cache-busting versions for both `script.js` and `styles.css`, and sitemap URL uniqueness and tracked-page targets. The latest check passed on commit `4d919238befbbaca9778b6d7189d510f8f573aa4`.

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

## Production validation still required

- Confirm each referenced asset returns HTTP 200 from the live domain.
- Compare the live deployed homepage and policy pages with the current `main` branch; indexed/search-cached copies may lag.
- Check desktop and mobile rendering and inspect browser console/network errors.
- Test booking links end-to-end with real Square pages.
- Test contact and photo-release forms in the deployed Cloudflare Pages runtime with correctly configured environment variables and test inbox delivery.

A clean tracked asset-path audit is not proof of a successful production deployment or end-to-end site health.
