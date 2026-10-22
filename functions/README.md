# Pages form endpoints — preview-first setup

These Cloudflare Pages Functions handle the website contact and photo/video release forms. Contact messages and photo-release records are saved to Cloudflare D1 before notification email is attempted. The code uses the Cloudflare Email Sending API, not Resend. Source code alone does not confirm production deployment or configuration.

## Required preview configuration

Configure and test a separate Cloudflare Pages preview project before changing production. Do not attach the production custom domain or change live DNS during preview testing.

- `TURNSTILE_SITE_KEY` — public Cloudflare Turnstile site key for the preview hostname.
- `TURNSTILE_SECRET_KEY` — private Turnstile secret; store as a secret.
- `CLOUDFLARE_ACCOUNT_ID` — Cloudflare account ID used by the Email Sending API.
- `CLOUDFLARE_EMAIL_API_TOKEN` — private API token with the required email-sending permission; store as a secret.
- `FORM_NOTIFICATION_TO` — inbox for website inquiries and photo-release notifications.
- `FROM_EMAIL` — sender address authorized for use with the Cloudflare Email Sending API.
- `PHOTO_RELEASES_DB` — D1 database binding (exact binding name) for both contact and photo-release records.

Never commit secret values to GitHub or place them in HTML/JavaScript. Keep preview and production configuration separate.

## D1 setup

1. Create a D1 database for the preview environment.
2. Apply `migrations/0001_photo_release_records.sql` to that database.
3. Bind the database to the Pages project as `PHOTO_RELEASES_DB`.
4. Confirm the two tables exist: `photo_release_records` and `contact_messages`.
5. Limit database access to authorized administrators. Set a written retention/deletion policy and test a backup/export and restore before accepting real releases.

The migration stores the typed signature and guardian details submitted on a photo/video release. Treat these records as confidential personal data. Use fictional records while testing and consider qualified North Carolina legal review of the release wording and retention policy.

## Endpoints

- `GET /api/form-config` — returns the public Turnstile site key and whether Turnstile configuration is present.
- `POST /api/contact` — validates the contact message, verifies Turnstile server-side, saves it to D1, then attempts email notification.
- `POST /api/photo-release` — validates the consent fields, verifies Turnstile server-side, saves the release to D1, then attempts email notification.

Both POST endpoints fail closed if D1 is missing or the record cannot be saved. If the email provider is unavailable after a successful save, the endpoint returns the saved record reference and reports that notification failed; the record is not discarded. Notification status is stored separately where possible. The record reference is not an authorization token and there is no public endpoint to retrieve records.

## Preview test checklist

1. Deploy this branch only to a separate preview Pages project; do not change production DNS/domain.
2. Configure preview-specific Turnstile keys, email settings, and the D1 binding.
3. Test malformed and invalid submissions, a valid contact message, consent and declined releases, under-18 guardian-required submissions, invalid/future signing dates, Turnstile failure, and a missing D1 binding.
4. Verify records are present in D1 and notification status is accurate for both successful and failed email attempts.
5. Test database access controls and a backup restore with fictional data.
6. Review the preview and release language before planning a separate production cutover. Do not accept real releases until storage, access controls, retention, and restore have been verified.
