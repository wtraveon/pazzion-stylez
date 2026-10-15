# Pages form endpoints — setup notes

These Cloudflare Pages Functions power the contact and photo/video release forms. They are source code only until deployed to a Pages project and configured.

## Preview-first configuration

Configure the **rebuild / preview Pages project first**, not the current live project. Do not change the current live domain or DNS while testing.

### Cloudflare Pages environment variables

Set these for Preview and Production separately as appropriate. For the initial preview, only set Preview values:

- `TURNSTILE_SITE_KEY` — public Turnstile site key allowed for the preview hostname.
- `TURNSTILE_SECRET_KEY` — private Turnstile secret; store as a secret, never in source control.
- `RESEND_API_KEY` — private Resend API key; store as a secret.
- `CONTACT_EMAIL` — inbox that should receive website inquiries and photo-release notifications.
- `FROM_EMAIL` — sender address verified with Resend.

Never commit real secret values to GitHub or put them in HTML/JavaScript.

## Cloudflare D1 — permanent release record

Create a D1 database for the preview project and run the migration in `migrations/0001_photo_release_records.sql`. Bind that database to the Pages project with the exact binding name:

`PHOTO_RELEASES_DB`

The photo-release endpoint now **fails closed** if this binding is missing or the record cannot be saved. It writes the complete submitted permission, choices, typed signature, signing date, and guardian fields to D1 before attempting notification email. Email delivery failure does not erase the saved record; the endpoint records notification status when possible and returns the reference ID.

Treat this database as confidential personal data:
- Limit database access to authorized salon administrators.
- Enable and verify available backup/export procedures before accepting real releases.
- Set a written retention period and deletion process consistent with salon/legal requirements; do not keep records indefinitely by default.
- Do not use real client information during testing. Use clearly fictional test records.
- Test retrieval and restoration of a backup before relying on this as the sole record.
- Consider having a qualified North Carolina attorney review the release language and retention process before operational use.

The reference ID is a D1 record ID once the endpoint returns success. It is not a substitute for backups or an audited records-management policy.

## Endpoints

- `GET /api/form-config` — returns only the public Turnstile site key and whether required Turnstile configuration is present.
- `POST /api/contact` — validates the contact message, verifies Turnstile server-side, then emails the salon inbox.
- `POST /api/photo-release` — validates consent, verifies Turnstile server-side, saves a durable D1 record, then emails the salon inbox.

## Safe preview test checklist

1. Create a separate Cloudflare Pages project for the rebuild, connected to branch `preview/cloudflare-record-retention`; do not attach the live custom domain.
2. Add preview-only environment variables and the `PHOTO_RELEASES_DB` binding.
3. Configure a preview-specific Turnstile widget/key and verify the sender domain in Resend.
4. Apply the D1 migration.
5. Test valid/invalid contact submissions; consent and decline releases; minor/guardian submissions; Turnstile failure; missing database binding; and email failure after a successful database save.
6. Verify the stored record, notification status, access permissions, and a backup restore using test data.
7. Only after all tests pass should a separate production cutover be planned. Do not change live DNS as part of preview testing.
