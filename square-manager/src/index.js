const API_VERSION = "2026-09-16";
const SQUARE_SANDBOX = "https://connect.squareupsandbox.com";
const SQUARE_API = "https://connect.squareupsandbox.com/v2";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}
function html(message) {
  return new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Pazzion Stylez Square Manager</title><main style="font:16px system-ui;max-width:680px;margin:12vh auto;padding:24px"><h1>Pazzion Stylez Square Manager</h1><p>${message}</p></main>`, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}
function b64url(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function sha256(text) {
  return b64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
}
function allowed(request, env) {
  const header = request.headers.get("authorization") || "";
  return !!env.ADMIN_KEY && header === `Bearer ${env.ADMIN_KEY}`;
}
async function squareFetch(path, token, init = {}) {
  return fetch(SQUARE_API + path, {
    ...init,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Square-Version": API_VERSION,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/") {
      return json({ name: "Pazzion Stylez Square Manager", status: "deployed", environment: "sandbox", routes: ["/health", "/oauth/start", "/oauth/callback", "/api/catalog"] });
    }
    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, app: "Pazzion Stylez Square Manager", mode: "sandbox", configured: !!(env.SQUARE_APP_ID && env.SQUARE_APP_SECRET && env.ADMIN_KEY && env.TOKEN_STORE) });
    }
    if (request.method === "GET" && url.pathname === "/oauth/start") {
      if (!env.SQUARE_APP_ID || !env.SQUARE_REDIRECT_URL || !env.SQUARE_STATE_KV) return json({ error: "OAuth environment is not fully configured." }, 503);
      const state = b64url(crypto.getRandomValues(new Uint8Array(32)));
      await env.SQUARE_STATE_KV.put("oauth:" + state, "pending", { expirationTtl: 600 });
      const auth = new URL(SQUARE_SANDBOX + "/oauth2/authorize");
      auth.searchParams.set("client_id", env.SQUARE_APP_ID);
      auth.searchParams.set("scope", "ITEMS_READ ITEMS_WRITE MERCHANT_PROFILE_READ");
      auth.searchParams.set("session", "false");
      auth.searchParams.set("state", state);
      auth.searchParams.set("redirect_uri", env.SQUARE_REDIRECT_URL);
      return Response.redirect(auth.toString(), 302);
    }
    if (request.method === "GET" && url.pathname === "/oauth/callback") {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const error = url.searchParams.get("error");
      if (error) return html("Square authorization was not completed. You can close this window and try again.");
      if (!code || !state || !env.SQUARE_STATE_KV || !env.TOKEN_STORE || !env.SQUARE_APP_ID || !env.SQUARE_APP_SECRET || !env.SQUARE_REDIRECT_URL) return json({ error: "Missing OAuth parameters or configuration." }, 400);
      const stateKey = "oauth:" + state;
      const valid = await env.SQUARE_STATE_KV.get(stateKey);
      if (!valid) return json({ error: "Invalid or expired OAuth state. Restart authorization." }, 400);
      await env.SQUARE_STATE_KV.delete(stateKey);
      const tokenResponse = await fetch(SQUARE_SANDBOX + "/oauth2/token", {
        method: "POST",
        headers: { "content-type": "application/json", "Square-Version": API_VERSION },
        body: JSON.stringify({
          client_id: env.SQUARE_APP_ID,
          client_secret: env.SQUARE_APP_SECRET,
          code,
          grant_type: "authorization_code",
          redirect_uri: env.SQUARE_REDIRECT_URL,
        }),
      });
      const tokenData = await tokenResponse.json();
      if (!tokenResponse.ok || !tokenData.access_token) return json({ error: "Square token exchange failed.", details: tokenData.errors || "Check app settings and redirect URL." }, 502);
      await env.TOKEN_STORE.put("square:sandbox:oauth", JSON.stringify({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || null,
        expires_at: tokenData.expires_at || null,
        merchant_id: tokenData.merchant_id || null,
        created_at: new Date().toISOString(),
      }));
      return html("Sandbox authorization succeeded. The credentials were stored securely. You can close this window and return to your setup.");
    }
    if (url.pathname.startsWith("/api/")) {
      if (!allowed(request, env)) return json({ error: "Unauthorized" }, 401);
      if (!env.TOKEN_STORE) return json({ error: "TOKEN_STORE binding is not configured." }, 503);
      const stored = await env.TOKEN_STORE.get("square:sandbox:oauth");
      if (!stored) return json({ error: "Square Sandbox is not connected yet. Visit /oauth/start first." }, 409);
      const credentials = JSON.parse(stored);
      if (request.method === "GET" && url.pathname === "/api/catalog") {
        const cursor = url.searchParams.get("cursor");
        const q = new URLSearchParams({ types: "ITEM" });
        if (cursor) q.set("cursor", cursor);
        const response = await squareFetch("/catalog/list?" + q.toString(), credentials.access_token);
        const data = await response.json();
        return json(data, response.status);
      }
      if (request.method === "GET" && url.pathname === "/api/locations") {
        const response = await squareFetch("/locations", credentials.access_token);
        return json(await response.json(), response.status);
      }
      return json({ error: "Route not found" }, 404);
    }
    return json({ error: "Not found" }, 404);
  },
};
