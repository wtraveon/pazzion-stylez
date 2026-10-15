# Repository Asset Audit

**Audit date:** 2026-10-15  
**Branch scanned:** `main`  
**Result:** Blocker — the tracked repository has no `assets/` paths, but the site's HTML references the following 19 distinct files.

This list is based on local `src`, `href`, and metadata references in the 16 HTML files tracked in the repository. A missing tracked path does not prove the live deployment is broken (assets may be supplied by a separate deployment or cache); it does mean the repository is not currently a self-contained copy of the site.

## Referenced files absent from the repository

| Expected path | Referenced by |
| --- | --- |
| `assets/images/brand/favicon.png` | Homepage and most content pages |
| `assets/images/brand/pazzion-stylez-mark-84.webp` | Most content pages |
| `assets/images/brand/pazzion-stylez-mark-96.webp` | Most content pages |
| `assets/images/brand/pazzion-stylez-mark.webp` | Homepage |
| `assets/images/brand/hero-signature-style.webp` | Homepage, services, team |
| `assets/images/about/latoya-terry-hair-doctor.webp` | Homepage |
| `assets/images/products/healthy-hair-body-collection.webp` | Homepage |
| `assets/images/products/hair-growth-oil.webp` | Homepage |
| `assets/images/products/scalp-care.webp` | Homepage |
| `assets/images/products/styling-care.webp` | Homepage |
| `assets/images/products/foot-soak.webp` | Homepage |
| `assets/images/gallery/gallery-featured-collection.webp` | Homepage |
| `assets/images/gallery/gallery-sleek-bob.webp` | Homepage and multiple service/team pages |
| `assets/images/gallery/gallery-finished-styles.webp` | Homepage |
| `assets/images/gallery/gallery-braids-protective.webp` | Homepage |
| `assets/images/gallery/gallery-braid-designs.webp` | Homepage |
| `assets/images/gallery/gallery-natural-hair.webp` | Homepage and healthy natural hair page |
| `assets/images/gallery/gallery-loc-styles.webp` | Homepage |
| `assets/images/gallery/gallery-color-styles.webp` | Homepage |

## Recovery checklist

- [ ] Recover the original image files from the original site project or its asset source.
- [ ] Add the files under the exact paths above (keep filenames and letter case unchanged).
- [ ] Search all HTML, CSS, and JavaScript for additional image/font/media references after restoring the folder.
- [ ] Confirm each referenced asset returns HTTP 200 from the live domain.
- [ ] Check images on desktop and mobile and inspect browser console/network errors.
- [ ] Commit the restored assets to `main` and verify the new commit contains the complete `assets/images/` tree.

## Other checks

- The `services/wigs-weaves/index.html` page **does exist** in the repository.
- The repository includes the homepage, shared stylesheet and script, service pages, team pages, policy/privacy pages, products, education, photo-release page, and Cloudflare Pages Functions.
- The presence of Functions code does not confirm that production environment variables/secrets are set or that email delivery succeeds. Follow `functions/README.md` and submit test forms after deployment.
