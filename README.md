# Pazzion Stylez LLC Website

Official website for Pazzion Stylez LLC, a hair and beauty salon in Wilson, North Carolina.

- **Live website:** https://pazzionstylez.com/
- **Repository:** https://github.com/wtraveon/pazzion-stylez
- **Default branch:** `main`

## Project structure

| Path | Purpose |
| --- | --- |
| `index.html` | Main homepage and salon information |
| `styles.css` | Shared site styling and responsive layout |
| `script.js` | Front-end interactions |
| `booking-routes.js` | Booking route configuration |
| `services/` | Service landing page and individual service pages |
| `team/` | Stylist profile pages |
| `products/` | Product information |
| `education/` | Hair-care education |
| `policies/` | Salon policies |
| `privacy/` | Privacy information |
| `photo-release/` | Photo-release page |
| `functions/api/` | Cloudflare Pages Functions API endpoints |
| `functions/_lib/forms.js` | Shared form validation and delivery helpers |
| `functions/README.md` | Form/API deployment notes |

## Local preview

This is a static HTML/CSS/JavaScript site with Cloudflare Pages Functions. For a quick front-end preview, serve the repository root with any local static web server and open the local URL. API form submissions require a compatible Cloudflare Pages Functions runtime and configured environment variables.

## Cloudflare Pages configuration

The repository uses the `functions/` directory for API routes. Configure these variables/secrets in the Cloudflare Pages project settings before expecting form delivery to work:

- `TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY` (secret)
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_EMAIL_API_TOKEN` (secret)
- `FORM_NOTIFICATION_TO`
- `FROM_EMAIL`

Use the specific configuration guidance in [functions/README.md](functions/README.md). Do not commit secret values to Git.

## Asset completeness

The tracked repository contains the `assets/` tree. The counts in [ASSET_AUDIT.md](ASSET_AUDIT.md) are a baseline snapshot and should not be treated as current totals; the automated integrity suite now checks local asset references and duplicate IDs on every push and pull request.

## Validation status

GitHub Actions runs the form regression tests, static site integrity tests, and JavaScript syntax checks on every push to `main` and pull request. A separate [production smoke-check workflow](.github/workflows/production-smoke.yml) checks the live homepage and policy, published booking-route mappings and Square endpoint reachability, Turnstile configuration, and invalid-payload handling for both form APIs after pushes and on a daily schedule.

See the evidence-based [Diagnostic Coverage Matrix](docs/DIAGNOSTIC_COVERAGE.md) for the latest checked workflow runs, verified coverage, and remaining manual sign-off items.

### Production verification limits and manual sign-off

The production smoke workflow checks published pages, booking URL mappings, HTTP reachability, Turnstile configuration, and invalid-payload handling. These are automated smoke checks, **not end-to-end proof** that customers can complete a booking or that form notifications arrive.

- **Square booking routes:** HTTP 403/429 responses indicate automated access was challenged or rate-limited. The workflow now prints an explicit `MANUAL VERIFICATION REQUIRED` warning for these responses. A reachable URL or non-5xx status does not prove the booking calendar loads or a booking can be completed. Open each flagged route in a normal browser and verify the booking experience.
- **Form delivery:** API validation tests intentionally submit invalid payloads; they do not send a real notification. Full contact and photo-release details are emailed to the configured salon inbox; a minimal SMS alert with the form type and reference is sent to 252-360-9630. Configure Twilio credentials in Cloudflare Pages secrets, then submit a consented test through each live form and confirm both email receipt and SMS delivery. Do not mark delivery verified based on a successful smoke workflow alone.
- **Release sign-off:** Record the date, route/form tested, result, and inbox confirmation. If a live check cannot be completed, leave that flow marked **unverified** rather than treating the automated check as a pass.
