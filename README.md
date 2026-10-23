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

The tracked repository now contains the `assets/` tree. A recursive audit of the 16 tracked HTML pages found 32 distinct referenced image/media assets and no missing referenced paths. See [ASSET_AUDIT.md](ASSET_AUDIT.md) for the current scan result and remaining unreferenced assets to review.

## Validation status

The repository structure and local file references have been inspected, but this README is not a claim that production forms, every browser/device, or every external booking flow has been end-to-end tested. Confirm Cloudflare environment settings, then test the live forms and booking links after deployment. A successful repository asset audit does not by itself confirm that the live deployment is serving the latest commit.
