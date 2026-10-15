import { clean, json, readJson, validEmail, validPhone, verifyTurnstile, methodNotAllowed } from "../_lib/forms.js";

export async function onRequestPost({ request, env }) {
  const data = await readJson(request);
  if (!data) return json({ success: false, message: "Please submit the form again. The request was not valid." }, 400);
  if (clean(data._honey, 200)) return json({ success: true, record_id: "received" });

  const client = clean(data.client_name, 120);
  const email = clean(data.client_email, 254);
  const phone = clean(data.client_phone, 40);
  const serviceDate = clean(data.service_date, 10);
  const provider = clean(data.service_provider, 100);
  const permission = clean(data.permission, 100);
  const uses = Array.isArray(data.allowed_uses) ? data.allowed_uses.map(v => clean(v, 120)).filter(Boolean).slice(0, 10) : [];
  const face = clean(data.face_visible, 100);
  const nameUse = clean(data.name_use, 100);
  const age = clean(data.age_status, 100);
  const signature = clean(data.client_signature, 120);
  const signedDate = clean(data.date_signed, 10);
  const acknowledgment = clean(data.acknowledgment, 40);
  const guardianName = clean(data.guardian_name, 120);
  const guardianRelationship = clean(data.guardian_relationship, 100);
  const guardianEmail = clean(data.guardian_email, 254);
  const guardianPhone = clean(data.guardian_phone, 40);
  const guardianSignature = clean(data.guardian_signature, 120);
  const token = clean(data.turnstile_token, 4096);

  if (!client || !validEmail(email) || !provider || !permission || !age || !signature || !signedDate || acknowledgment !== "Confirmed") {
    return json({ success: false, message: "Please complete all required fields and confirm the acknowledgment." }, 400);
  }
  if (!validPhone(phone) || !validPhone(guardianPhone)) {
    return json({ success: false, message: "Please enter a valid phone number." }, 400);
  }
  if (!["LaToya Terry", "Kottia Cotton", "Other / not sure"].includes(provider)) {
    return json({ success: false, message: "Please choose a valid service provider." }, 400);
  }
  if (!["I CONSENT to selected photo/video uses", "I DO NOT CONSENT to public photo/video use"].includes(permission)) {
    return json({ success: false, message: "Please choose a valid permission option." }, 400);
  }
  if (!["Client is 18 or older", "Client is under 18"].includes(age)) {
    return json({ success: false, message: "Please choose the client's age status." }, 400);
  }

  const isConsent = permission === "I CONSENT to selected photo/video uses";
  const allowed = [
    "Pazzion Stylez website / online portfolio", "Social media",
    "Salon marketing / promotional materials", "Educational materials"
  ];
  if (isConsent && (!uses.length || uses.some(use => !allowed.includes(use)) ||
      !["Face may be visible", "Do not show my face"].includes(face) ||
      !["Name may be used", "Do not use my name"].includes(nameUse))) {
    return json({ success: false, message: "Please complete your photo-use choices." }, 400);
  }
  if (age === "Client is under 18" &&
      (!guardianName || !guardianRelationship || !validEmail(guardianEmail) || !guardianSignature)) {
    return json({ success: false, message: "Parent or legal guardian details are required for a client under 18." }, 400);
  }

  const today = new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(signedDate) || signedDate > today) {
    return json({ success: false, message: "Please enter a valid signing date." }, 400);
  }
  if (serviceDate && !/^\d{4}-\d{2}-\d{2}$/.test(serviceDate)) {
    return json({ success: false, message: "Please enter a valid service date." }, 400);
  }
  if (!(await verifyTurnstile(token, request, env))) {
    return json({ success: false, message: "Spam verification failed. Please complete verification and try again." }, 403);
  }
  if (!env.PHOTO_RELEASES_DB) {
    return json({ success: false, message: "Photo-release records are not configured yet. Please contact the salon before any photos or video are used." }, 503);
  }

  const recordId = crypto.randomUUID();
  try {
    await env.PHOTO_RELEASES_DB.prepare(
      `INSERT INTO photo_release_records (
        record_id, submitted_at, client_name, client_email, client_phone, service_date,
        service_provider, permission, allowed_uses_json, face_visible, name_use, age_status,
        client_signature, date_signed, acknowledgment, guardian_name, guardian_relationship,
        guardian_email, guardian_phone, guardian_signature, notification_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'not-configured')`
    ).bind(
      recordId, new Date().toISOString(), client, email, phone, serviceDate, provider, permission,
      JSON.stringify(isConsent ? uses : []), isConsent ? face : "", isConsent ? nameUse : "",
      age, signature, signedDate, acknowledgment, guardianName, guardianRelationship,
      guardianEmail, guardianPhone, guardianSignature
    ).run();
  } catch {
    return json({ success: false, message: "We could not securely save the release. Please contact the salon before any photos or video are used." }, 503);
  }

  return json({
    success: true,
    record_id: recordId,
    notification_sent: false,
    message: "Your photo-release preference has been securely recorded. The salon has not been emailed automatically; keep your reference number."
  });
}

export function onRequest({ request }) {
  if (request.method !== "POST") return methodNotAllowed();
}
