const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff"
};

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

export function clean(value, max = 2000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function validEmail(value) {
  return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value);
}

export function validPhone(value) {
  return !value || /^[+()\\d.\\s-]{7,25}$/.test(value);
}

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

export function emailHtml(title, fields, recordId) {
  const rows = fields.map(([label, value]) =>
    `<tr><th align="left" style="padding:8px;border-bottom:1px solid #eee;vertical-align:top">${escapeHtml(label)}</th><td style="padding:8px;border-bottom:1px solid #eee;white-space:pre-wrap">${escapeHtml(Array.isArray(value) ? (value.join(", ") || "None selected") : (value || "Not provided"))}</td></tr>`
  ).join("");
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#222"><h2>${escapeHtml(title)}</h2><p>Reference: <strong>${escapeHtml(recordId)}</strong></p><table style="border-collapse:collapse;width:100%;max-width:760px">${rows}</table><p style="color:#666;font-size:12px">Submitted through the Pazzion Stylez website. Store this message securely and follow your applicable retention practices.</p></body></html>`;
}

export async function verifyTurnstile(token, request, env) {
  if (!env.TURNSTILE_SECRET_KEY || !env.TURNSTILE_SITE_KEY || !token) return false;
  const body = new URLSearchParams();
  body.set("secret", env.TURNSTILE_SECRET_KEY);
  body.set("response", token);
  const ip = request.headers.get("CF-Connecting-IP");
  if (ip) body.set("remoteip", ip);
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    });
    const result = await response.json();
    return response.ok && result.success === true;
  } catch {
    return false;
  }
}

export async function sendEmail(env, subject, html, replyTo) {
  const apiKey = env.RESEND_API_KEY;
  const recipient = env.FORM_NOTIFICATION_TO || env.CONTACT_EMAIL;
  const sender = env.FROM_EMAIL;

  if (!apiKey || !recipient || !sender) {
    return { ok: false, configurationError: true };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: sender,
        to: [recipient],
        subject,
        html,
        ...(replyTo ? { reply_to: replyTo } : {})
      })
    });
    const result = await response.json().catch(() => ({}));
    return { ok: response.ok && typeof result?.id === "string" && result.id.length > 0 };
  } catch {
    return { ok: false };
  }
}

export async function readJson(request) {
  const type = request.headers.get("Content-Type") || "";
  if (!type.toLowerCase().includes("application/json")) return null;
  const length = Number(request.headers.get("Content-Length") || 0);
  if (length > 20000) return null;
  try {
    const data = await request.json();
    return data && typeof data === "object" && !Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

export function methodNotAllowed() {
  return new Response("Method Not Allowed", {
    status: 405,
    headers: { "Allow": "POST", "Cache-Control": "no-store" }
  });
}
