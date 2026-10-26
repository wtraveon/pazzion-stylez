import { json } from "../_lib/forms.js";

export function onRequestGet({ env }) {
  const turnstileConfigured = Boolean(env.TURNSTILE_SITE_KEY && env.TURNSTILE_SECRET_KEY);
  const emailNotificationsConfigured = Boolean(
    env.CLOUDFLARE_ACCOUNT_ID &&
    env.CLOUDFLARE_EMAIL_API_TOKEN &&
    env.FORM_NOTIFICATION_TO &&
    env.FROM_EMAIL
  );
  return json({
    turnstile_enabled: turnstileConfigured,
    sitekey: turnstileConfigured ? env.TURNSTILE_SITE_KEY : "",
    configuration_error: !turnstileConfigured,
    email_notifications_configured: emailNotificationsConfigured
  });
}

export function onRequest({ request }) {
  if (request.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405, headers: { "Allow": "GET", "Cache-Control": "no-store" } });
  }
}
