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
  return typeof value === "string" && value.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
export function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
}

export function validPhone(value) {
  if (!value) return true;
  if (!/^[+()\d.\s-]{7,25}$/.test(value)) return false;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
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
  if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_EMAIL_API_TOKEN ||
      !env.FORM_NOTIFICATION_TO || !env.FROM_EMAIL) {
    return { ok: false, configurationError: true };
  }
  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/email/sending/send`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.CLOUDFLARE_EMAIL_API_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: env.FROM_EMAIL,
          to: [env.FORM_NOTIFICATION_TO],
          subject,
          html,
          ...(replyTo ? { reply_to: replyTo } : {})
        })
      }
    );
    const result = await response.json().catch(() => ({}));
    return {
      ok: response.ok && result.success === true,
      id: result.result?.message_id || null
    };
  } catch {
    return { ok: false };
  }
}

export async function readJson(request) {
  const type = request.headers.get("Content-Type") || "";
  if (!type.toLowerCase().includes("application/json")) return null;

  const maxBytes = 20000;
  const declaredLength = Number(request.headers.get("Content-Length") || 0);
  if (declaredLength > maxBytes || !request.body) return null;

  // Enforce the limit while reading, including requests without Content-Length.
  const reader = request.body.getReader();
  const chunks = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const data = JSON.parse(new TextDecoder().decode(bytes));
    return data && typeof data === "object" && !Array.isArray(data) ? data : null;
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

export function methodNotAllowed() {
  return new Response("Method Not Allowed", {
    status: 405,
    headers: { "Allow": "POST", "Cache-Control": "no-store" }
  });
}
