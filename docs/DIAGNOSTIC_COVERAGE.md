# Diagnostic Coverage — Pazzion Stylez

**Snapshot:** 2026-10-25  
**Repository:** [wtraveon/pazzion-stylez](https://github.com/wtraveon/pazzion-stylez)  
**Commit checked:** `8614c90eb64bc78cbece31a21b391ed678f837d7`

This matrix distinguishes automated checks from manual production verification. A green workflow is not evidence that third-party booking, email delivery, search-engine indexing, or full accessibility has been end-to-end verified.

| Area | Current result | Evidence / next action |
| --- | --- | --- |
| Live pages and search visibility | Live page checks passed; search-engine visibility not confirmed | [Site smoke test](https://github.com/wtraveon/pazzion-stylez/actions/runs/40201235599) passed. Sitemap/robots source presence is not proof of indexing or rankings; verify with Google Search Console/Bing Webmaster Tools. |
| Repository and source structure | Inspected | Static HTML/CSS/JS, Cloudflare Pages Functions, booking route map, tests, and security-header configuration are present in source. |
| CI regression suite | **Passing** | [Website checks](https://github.com/wtraveon/pazzion-stylez/actions/runs/40201235606) passed on the checked commit. |
| Production smoke tests | **Passing, with manual verification gaps** | [Production smoke checks](https://github.com/wtraveon/pazzion-stylez/actions/runs/40201235598) passed. This covers automated reachability/configuration and invalid-payload checks, not a completed customer booking or successful inbox delivery. |
| Lighthouse performance scores | **Audit completed; inspect report artifact for numeric scores** | [Lighthouse run and report artifact](https://github.com/wtraveon/pazzion-stylez/actions/runs/40201235597). Audits ran for homepage and products page on mobile and desktop. This status records completion, not a score threshold or performance sign-off. |
| Square booking completion | Needs live test | Open every booking route in a normal browser, test the calendar and appointment flow, and verify the actual Square deposit/prepayment settings. Automated 403/429 responses can be access challenges/rate limits and are not proof of booking failure or success. |
| Contact form email delivery | Needs live test | Submit a consented test through the live contact form and confirm the notification reaches the configured inbox. Invalid-payload smoke checks do not prove delivery. |
| Photo-release form email delivery | Needs live test | Submit a consented test through the live photo-release form and confirm inbox receipt. |
| SEO sitemap and robots configuration | Present in source; production fetch/indexing not fully verified | Check the live `/sitemap.xml` and `/robots.txt` responses, then validate indexing separately in webmaster tools. |
| Security headers | Configured in source; live response not independently signed off here | Review the root `_headers` file and validate actual production response headers with a header checker or browser devtools. |
| Cross-device visual and accessibility testing | Not fully verified | Lighthouse responsive audits ran on mobile and desktop for two pages. Still perform manual keyboard, focus, screen-reader, contrast, zoom/reflow, and representative device/browser checks across key pages and forms. |

## Automated workflow evidence

- [Website checks — passing](https://github.com/wtraveon/pazzion-stylez/actions/runs/40201235606)
- [Site smoke test — passing](https://github.com/wtraveon/pazzion-stylez/actions/runs/40201235599)
- [Production smoke checks — passing](https://github.com/wtraveon/pazzion-stylez/actions/runs/40201235598)
- [Lighthouse performance audit — completed](https://github.com/wtraveon/pazzion-stylez/actions/runs/40201235597)

## Release sign-off checklist

- [ ] Complete a real booking test for each Square route/stylist and verify deposit/prepayment settings in Square Dashboard.
- [ ] Confirm live contact-form notification arrives in the configured inbox.
- [ ] Confirm live photo-release-form notification arrives in the configured inbox.
- [ ] Review numeric Lighthouse scores and any report warnings from the artifact.
- [ ] Fetch production sitemap, robots, and security headers and record results.
- [ ] Perform manual accessibility and responsive checks on homepage, service pages, booking handoff, and forms.
- [ ] Check Google Search Console/Bing Webmaster Tools for crawl/index status.

Record the test date, environment, route/form, outcome, and evidence for each completed item. Leave items unchecked until verified.
