import { clean, json, readJson, validEmail, validPhone, verifyTurnstile, emailHtml, sendEmail, sendSms, methodNotAllowed } from "../_lib/forms.js";

export async function onRequestPost({ request, env }) {
  const data = await readJson(request);
  if (!data) return json({ success: false, message: "Please submit the form again. The request was not valid." }, 400);

  // Silently accept honeypot submissions without sending them.
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
  if (!["Hair or beauty service", "Product order", "Class or education", "Future academy interest", "General question"].includes(topic)) {
    return json({ success: false, message: "Please choose a valid inquiry topic." }, 400);
  }
  if (email && !validEmail(email)) return json({ success: false, message: "Please enter a valid email address." }, 400);
  if (!validPhone(phone)) return json({ success: false, message: "Please enter a valid phone number." }, 400);
  if (topic === "Hair or beauty service" && !["LaToya Terry", "Kottia Cotton", "JahNiqua Speight"].includes(preferred)) {
    return json({ success: false, message: "Please select a preferred stylist for service inquiries." }, 400);
  }
  if (!(await verifyTurnstile(token, request, env, "contact"))) {
    return json({ success: false, message: "Spam verification failed. Please complete verification and try again." }, 403);
  }

  const recordId = crypto.randomUUID();
  const fields = [
    ["Reference", recordId], ["Name", name], ["Email", email], ["Phone", phone],
    ["Topic", topic], ["Preferred stylist", preferred], ["Message", message]
  ];
  const [sent, sms] = await Promise.all([
    sendEmail(env, `Website inquiry: ${topic}`, emailHtml("New Pazzion Stylez website inquiry", fields, recordId), email || undefined),
    sendSms(env, `Pazzion Stylez: New contact form submission (topic: ${topic}). Ref: ${recordId}. Check salon email for details.`)
  ]);
  if (!sent.ok || !sms.ok) {
    const configurationError = sent.configurationError || sms.configurationError;
    return json({ success: false, message: configurationError
      ? "Website notifications are not fully configured yet. Please call Pazzion Stylez at 252-360-9630."
      : "We could not confirm both email and text notifications. Please call Pazzion Stylez at 252-360-9630 before submitting again." }, 503);
  }
  return json({ success: true, record_id: recordId });
}

export function onRequest({ request }) {
  if (request.method !== "POST") return methodNotAllowed();
}
