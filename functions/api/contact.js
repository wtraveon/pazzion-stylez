import { clean, json, readJson, validEmail, validPhone, verifyTurnstile, methodNotAllowed } from "../_lib/forms.js";

export async function onRequestPost({ request, env }) {
  const data = await readJson(request);
  if (!data) return json({ success: false, message: "Please submit the form again. The request was not valid." }, 400);
  if (clean(data._honey, 200)) return json({ success: true, record_id: "received" });

  const name = clean(data.name, 120);
  const email = clean(data.email, 254);
  const phone = clean(data.phone, 40);
  const topic = clean(data.topic, 120);
  const preferred = clean(data.preferred_stylist, 100);
  const message = clean(data.message, 5000);
  const token = clean(data.turnstile_token, 4096);

  if (!name || !topic || !message || (!email && !phone)) {
    return json({ success: false, message: "Please complete your name, topic, message, and an email address or phone number." }, 400);
  }
  if (email && !validEmail(email)) return json({ success: false, message: "Please enter a valid email address." }, 400);
  if (!validPhone(phone)) return json({ success: false, message: "Please enter a valid phone number." }, 400);
  if (topic === "Hair or beauty service" && !["LaToya Terry", "Kottia Cotton"].includes(preferred)) {
    return json({ success: false, message: "Please select a preferred stylist for service inquiries." }, 400);
  }
  if (!(await verifyTurnstile(token, request, env))) {
    return json({ success: false, message: "Spam verification failed. Please complete verification and try again." }, 403);
  }
  if (!env.PHOTO_RELEASES_DB) {
    return json({ success: false, message: "Online messages are not configured yet. Please call or email Pazzion Stylez directly." }, 503);
  }

  const recordId = crypto.randomUUID();
  try {
    await env.PHOTO_RELEASES_DB.prepare(
      "INSERT INTO contact_messages (record_id, submitted_at, name, email, phone, topic, preferred_stylist, message, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new')"
    ).bind(recordId, new Date().toISOString(), name, email, phone, topic, preferred, message).run();
  } catch {
    return json({ success: false, message: "We could not securely save your message. Please call or email Pazzion Stylez directly." }, 503);
  }
  return json({
    success: true,
    record_id: recordId,
    message: "Your message has been securely saved. The salon has not been emailed automatically, so please call or text if your request is urgent."
  });
}

export function onRequest({ request }) {
  if (request.method !== "POST") return methodNotAllowed();
}
