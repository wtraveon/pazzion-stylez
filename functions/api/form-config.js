import { json } from "../_lib/forms.js";

export function onRequestGet({ env }) {
  const configured = Boolean(env.TURNSTILE_SITE_KEY && env.TURNSTILE_SECRET_KEY);
  return json({
    turnstile_enabled: configured,
    sitekey: configured ? env.TURNSTILE_SITE_KEY : "",
    configuration_error: !configured
  });
}

export function onRequest({ request }) {
  if (request.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405, headers: { "Allow": "GET", "Cache-Control": "no-store" } });
  }
}
