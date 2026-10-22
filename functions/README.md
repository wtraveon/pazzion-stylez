# Pages form endpoints — setup notes

These Cloudflare Pages Functions power the website's contact and photo/video release forms. The current implementation verifies Turnstile server-side and sends notifications through the Cloudflare Email Sending API. Source code does not confirm that the live Pages deployment or production configuration is correct.

## Required environment variables

Configure these in the intended Cloudflare Pages project. Test in a separate preview environment before changing production:

- `TURNSTILE_SITE_KEY` — public Cloudflare Turnstile site key for the preview hostname(s).
- `TURNSTILE_SECRET_KEY` — private Turnstile secret; store as a secret, never in source control.
- `CLOUDFLARE_ACCOUNT_ID` — Cloudflare account ID used by the Email Sending API.
- `CLOUDFLARE_EMAIL_API_TOKEN` — private API token with the required email-sending permission; store as a secret.
- `FORM_NOTIFICATION_TO` — inbox that should receive website inquiries and photo-release submissions.
- `FROM_EMAIL` — sender address authorized for the Cloudflare Email Sending API.

Never commit real secret values to GitHub or put them in HTML/JavaScript. Configure preview and production values separately.

## Endpoints

- `GET /api/form-config` — returns the public Turnstile site key and whether required Turnstile configuration is present.
- `POST /api/contact` — validates the contact message, verifies Turnstile server-side, then emails the salon inbox.
- `POST /api/photo-release` — validates consent fields, verifies Turnstile server-side, then emails the salon inbox.

## Important photo-release retention limitation

The current handlers do **not** write submissions to a database. The returned reference ID is an email-submission reference, not a durable database record ID. Email delivery can fail, messages can be deleted, and inbox access is not a substitute for an intentional records-retention process.

Before relying on online releases as the salon's record of permission, implement and test durable storage (for example, Cloudflare D1), restrict access, define a retention/deletion policy, and test backup/restore. Do not collect real release records in a preview environment; use fictional test data.

## Safe rollout checklist

1. Use a separate Cloudflare Pages preview project; do not attach the production custom domain or change live DNS during testing.
2. Set preview-specific Turnstile values and email API credentials.
3. Test valid and invalid contact submissions, consented and declined releases, guardian-required submissions, Turnstile failures, and email delivery failures.
4. Implement durable photo-release storage before treating the form as the sole legal record.
5. Verify access controls, retention, deletion, and backup/restore with fictional records.
6. Only after review and successful preview tests, plan a separate production cutover.
