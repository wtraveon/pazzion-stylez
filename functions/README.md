# Pages form endpoints — setup notes

These Cloudflare Pages Functions power the website's contact and photo/video release forms. The current implementation sends notifications through the Cloudflare Email Sending API; it does not use Resend. Source code alone does not confirm the live Pages deployment or production configuration.

## Required environment variables

Configure these in the Cloudflare Pages project that is intended to serve the site. Test in a separate preview environment before changing production:

- `TURNSTILE_SITE_KEY` — public Cloudflare Turnstile site key for the preview hostname(s).
- `TURNSTILE_SECRET_KEY` — private Turnstile secret; store as a secret, never in source control.
- `CLOUDFLARE_ACCOUNT_ID` — Cloudflare account ID used by the Email Sending API.
- `CLOUDFLARE_EMAIL_API_TOKEN` — private API token with the required email-sending permission; store as a secret.
- `FORM_NOTIFICATION_TO` — inbox that should receive website inquiries and photo-release submissions.
- `FROM_EMAIL` — sender address authorized for use with the Cloudflare Email Sending API, for example an approved address at the site's domain.

Do not commit actual secret values to GitHub or place them in HTML/JavaScript. Set production and preview values separately.

## Endpoints

- `GET /api/form-config` — returns only the public Turnstile site key and whether required Turnstile configuration is present.
- `POST /api/contact` — validates the contact message, verifies the Turnstile token server-side, then emails the salon inbox.
- `POST /api/photo-release` — validates the consent fields, verifies Turnstile server-side, then emails the salon inbox.

The API reports success only after the email provider accepts the message. The returned reference ID is an email-submission reference, not a database record ID. This version does not create a database or replace the salon's separate retention/back-up process; configure a suitable secure records process for signed releases before relying on these submissions as the sole legal record.

## Safe rollout checklist

1. Deploy a preview build without changing the current domain, DNS, or live Pages project.
2. Add the environment variables above to that preview project and confirm the sender address/domain is approved for the Cloudflare Email Sending API.
3. Use a preview-specific Turnstile widget and keys.
4. Test valid and invalid contact submissions, declined and consented releases, guardian-required submissions, spam challenges, and email delivery.
5. Confirm photo-release emails are retained and access-controlled appropriately.
6. Only after the preview is verified, plan a separate production cutover. Do not change live DNS as part of preview testing.
