# Pages form endpoints — preview-first setup

These Cloudflare Pages Functions power the contact and photo/video release forms. They are source code only until deployed and configured.

## Preview-first configuration

Configure the **rebuild / preview Pages project first**, not the current live project. Do not change the current live domain or DNS.

## Preview environment variables

Outgoing form notifications use the Resend API.

- `TURNSTILE_SITE_KEY` — public Turnstile site key configured for the preview hostname.
- `TURNSTILE_SECRET_KEY` — private Turnstile secret; store as a secret.
- `RESEND_API_KEY` — private Resend API key; store as a secret.
- `FORM_NOTIFICATION_TO` — inbox for contact and photo-release notifications.
- `FROM_EMAIL` — sender address on the verified Resend domain, for example `notifications@pazzionstylez.com` if accepted by the Resend account.

The code accepts `CONTACT_EMAIL` as a fallback recipient, but prefer `FORM_NOTIFICATION_TO`. Never commit real secret values to GitHub. Keep API keys and Turnstile secrets private.

## Cloudflare D1 — durable form records

Create a D1 database for the preview and run `migrations/0001_photo_release_records.sql`. This migration creates both `photo_release_records` and `contact_messages`. Bind the database to the Pages project using the exact binding name:

`PHOTO_RELEASES_DB`

The photo-release endpoint fails closed if this binding is missing or a record cannot be saved. It writes the submitted permission, choices, typed signature, signing date, and guardian fields to D1 before attempting notification email. Email delivery failure does not erase the saved record; notification status is tracked separately when possible.

Treat these records as confidential personal data:
- Limit database access to authorized salon administrators.
- Establish and test backup/export and restore procedures before accepting real releases.
- Set a written retention period and deletion process; do not keep records indefinitely by default.
- Use fictional test records during testing.
- Consider qualified North Carolina legal review of release language and retention practices.

## Endpoints

- `GET /api/form-config` — returns the public Turnstile site key and whether Turnstile configuration is present.
- `POST /api/contact` — validates contact details, verifies Turnstile server-side, saves the message to D1, then attempts email notification through Resend. The D1 status records whether notification succeeded.
- `POST /api/photo-release` — validates consent, verifies Turnstile server-side, saves a durable D1 record, then attempts email notification through Resend. Notification status is tracked separately; a notification failure does not erase the saved record.

## Preview test checklist

1. Create/use a separate Cloudflare Pages preview project for branch `preview/cloudflare-record-retention`; do not attach the live custom domain.
2. Set the Preview variables above and a preview-specific Turnstile widget.
3. Confirm the sender address is accepted by Resend and the domain is verified.
4. Create the D1 database, run the migration, and add the `PHOTO_RELEASES_DB` binding.
5. Test valid/invalid contact submissions; consent and decline releases; minor/guardian submissions; Turnstile failure; missing D1 binding; and email failure after a successful D1 save. Confirm each submission is saved even if notification email fails.
6. Verify stored records, notification status, access controls, and a backup restore using fictional data.
7. Plan any production cutover separately after review. Do not change live DNS as part of preview testing.
