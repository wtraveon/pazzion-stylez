# Pazzion Stylez Square Manager (Sandbox-first)

This Worker provides a minimal Square OAuth callback and protected catalog-read endpoints. It is not production-ready until deployed, secrets configured, redirect URL registered, and tested.

## Deploy with Cloudflare

1. In Cloudflare Dashboard, create a Worker named `pazzion-stylez-square-manager`.
2. Connect this folder/repository directory to the Worker using Cloudflare's Git integration, or deploy with Wrangler.
3. Create two Cloudflare KV namespaces and replace the IDs in `wrangler.toml`.
   - `SQUARE_STATE_KV`: temporary OAuth state (10-minute TTL).
   - `TOKEN_STORE`: stores the Sandbox OAuth token response. Restrict dashboard access; consider a stronger encrypted store and token refresh implementation before production.
4. Add Worker secrets using **Settings → Variables and Secrets → Add → Secret**:
   - `SQUARE_APP_ID`: the Sandbox Application ID from Square Developer Console.
   - `SQUARE_APP_SECRET`: the Sandbox Application secret.
   - `ADMIN_KEY`: a long, randomly generated admin key; keep it private.
5. Set `SQUARE_REDIRECT_URL` to the deployed Worker URL plus `/oauth/callback`. The URL must exactly match the Sandbox Redirect URL in Square.
6. Deploy, then open `/health` and verify configuration.
7. In Square Developer Console → OAuth → Sandbox, register the exact `/oauth/callback` URL.
8. Open `/oauth/start` to authorize the Sandbox account. Do not authorize Production yet.
9. Test catalog access with an Authorization header `Bearer <ADMIN_KEY>` against `/api/catalog`.

## Important limitations

- Sandbox only. Production URLs/credentials are intentionally not implemented.
- Catalog listing and location reading only. Catalog writes, image upload, refresh-token rotation, disconnect/revoke, audit trail, and per-user authorization are not implemented yet.
- Do not place credentials in Git, website JavaScript, browser storage, screenshots, or chat.
- Before production use, implement refresh-token rotation, token encryption/access restrictions, request validation, CSRF-safe admin access, rate limits, logging without secrets, and explicit authorization/confirmation for destructive catalog writes.
