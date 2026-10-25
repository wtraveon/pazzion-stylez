# Diagnostic Coverage — Pazzion Stylez

**Snapshot:** 2026-10-25  
**Repository:** [wtraveon/pazzion-stylez](https://github.com/wtraveon/pazzion-stylez)  
**Commit checked:** `7ea1c74af4d7dbc92b27283d9199956e1d73d509`

This matrix separates automated checks from manual production verification. A green workflow is not evidence that third-party booking, email delivery, search-engine indexing, or full accessibility has been end-to-end verified.

## Repair-order status

| Priority | Area | Current result | Evidence / next action |
| --- | --- | --- | --- |
| 1 | Reconcile production with GitHub `main` | Automated live HTTP checks match current expected product-page CTA and other critical content. A web-extracted product-page snapshot showed the old CTA; that conflicts with the passing direct production smoke test and is likely stale crawler content, not enough evidence of a deployment failure. | [Production smoke checks](https://github.com/wtraveon/pazzion-stylez/actions/runs/40201470280) passed on this commit. Confirm current content in a normal browser with a hard refresh if the old CTA remains visible to a user. |
| 2 | Automated test suite | **Passing** | [Website checks](https://github.com/wtraveon/pazzion-stylez/actions/runs/40201470277) and [site regression tests](https://github.com/wtraveon/pazzion-stylez/actions/runs/40201470360) passed. Tests validate source integrity, metadata/JSON-LD, links, booking mappings, form helper behavior, and JavaScript syntax. |
| 3 | Lighthouse | **Passing; desktop emulation conflict resolved in workflow** | [Lighthouse audit](https://github.com/wtraveon/pazzion-stylez/actions/runs/40201470322) completed all four audits: homepage mobile/desktop and products mobile/desktop. Workflow uses mobile form factor for mobile runs and `--preset=desktop` for desktop runs, not conflicting emulation flags. |
| 4 | Customer-facing workflows | **Partially checked; manual sign-off still needed** | All six Square route mappings exist. Automated endpoint results were LaToya new 200, LaToya returning 200, Kottia new 429, Kottia returning 200, JahNiqua new 429, JahNiqua returning 429. HTTP 429 means Square rate-limited automation; manually test the flagged routes and complete a booking flow. Form APIs reject invalid payloads correctly, but real email receipt is not proven. |
| 5 | Policy, SEO, accessibility | **Automated policy/SEO checks pass; manual items remain** | Production smoke checks verified the current no-deposit policy, all 16 sitemap URLs returning HTML with unique descriptions and matching canonical URLs, plus required security headers. Search-engine indexing and manual keyboard/screen-reader/device checks remain outstanding. |

## Lighthouse scores

Scores from the latest completed run's JSON reports:

| Page | Device | Performance | Accessibility | Best practices | SEO |
| --- | --- | ---: | ---: | ---: | ---: |
| Homepage | Desktop | 100 | 100 | 100 | 100 |
| Homepage | Mobile | 94 | 100 | 100 | 100 |
| Products | Desktop | 98 | 100 | 100 | 100 |
| Products | Mobile | 96 | 100 | 100 | 100 |

These are lab scores from this run, not a guarantee for every device or visit. The mobile Largest Contentful Paint (LCP) was about 2.8 seconds on the homepage and 2.7 seconds on the products page; desktop LCP was under 1.2 seconds for both pages.

## Automated workflow evidence

- [Website checks — passing](https://github.com/wtraveon/pazzion-stylez/actions/runs/40201470277)
- [Site smoke test — passing](https://github.com/wtraveon/pazzion-stylez/actions/runs/40201470360)
- [Production smoke checks — passing](https://github.com/wtraveon/pazzion-stylez/actions/runs/40201470280)
- [Lighthouse performance audit — passing](https://github.com/wtraveon/pazzion-stylez/actions/runs/40201470322)

## Remaining manual release sign-off

- [ ] Open all six stylist/client-status routes in a normal browser, particularly the three Square routes that rate-limited automated access. Confirm the calendar loads and verify a booking can proceed without submitting an unintended real appointment.
- [ ] Confirm the actual deposit/prepayment and $25 consultation configuration in Square Dashboard.
- [ ] Submit a consented test through the live contact form and confirm the notification reaches the configured inbox.
- [ ] Submit a consented test through the live photo-release form and confirm the notification reaches the configured inbox.
- [ ] Confirm Square storefront navigation opens a separate tab/window on desktop and mobile browsers.
- [ ] Check Google Search Console/Bing Webmaster Tools for crawl and index status.
- [ ] Perform manual keyboard-only, focus visibility, screen-reader, contrast, zoom/reflow, and representative mobile/desktop checks across key pages and forms.

Record the date, environment, route/form, outcome, and evidence for each completed item. Do not mark an item verified until its manual test is complete.
