import { clean, json, readJson, validEmail, validPhone, validDate, verifyTurnstile, emailHtml, sendEmail, sendSms, methodNotAllowed } from "../_lib/forms.js";

export async function onRequestPost({ request, env }) {
  const data = await readJson(request);
  if (!data) return json({ success: false, message: "Please submit the form again. The request was not valid." }, 400);

  // Silently accept honeypot submissions without storing or emailing them.
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
  if (!["LaToya Terry", "Kottia Cotton", "JahNiqua Speight", "Other / not sure"].includes(provider)) {
    return json({ success: false, message: "Please choose a valid service provider." }, 400);
  }
  if (!["I CONSENT to selected photo/video uses", "I DO NOT CONSENT to public photo/video use"].includes(permission)) {
    return json({ success: false, message: "Please choose a permission option." }, 400);
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
  if (age === "Client is under 18") {
    if (!guardianName || !guardianRelationship || !validEmail(guardianEmail) || !guardianSignature) {
      return json({ success: false, message: "Parent or legal guardian details are required for a client under 18." }, 400);
    }
  }

  const dateParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const todayInSalonTime = Object.fromEntries(
    dateParts.filter(part => part.type !== "literal").map(part => [part.type, part.value])
  );
  const salonDate = `${todayInSalonTime.year}-${todayInSalonTime.month}-${todayInSalonTime.day}`;
  const signed = validDate(signedDate) && signedDate <= salonDate;
  if (!signed) return json({ success: false, message: "Please enter a valid signing date." }, 400);
  if (serviceDate && !validDate(serviceDate)) {
    return json({ success: false, message: "Please enter a valid service date." }, 400);
  }
  if (!(await verifyTurnstile(token, request, env, "photo_release"))) {
    return json({ success: false, message: "Spam verification failed. Please complete verification and try again." }, 403);
  }

  const recordId = crypto.randomUUID();
  const fields = [
    ["Client full name", client], ["Client email", email], ["Client phone", phone],
    ["Service date", serviceDate], ["Service provider", provider], ["Permission", permission],
    ["Allowed uses", isConsent ? uses : []], ["Face visibility", isConsent ? face : "Not authorized / not applicable"],
    ["Name use", isConsent ? nameUse : "Not authorized / not applicable"], ["Age status", age],
    ["Client typed signature", signature], ["Date signed", signedDate], ["Acknowledgment", acknowledgment],
    ["Guardian name", guardianName], ["Guardian relationship", guardianRelationship],
    ["Guardian email", guardianEmail], ["Guardian phone", guardianPhone], ["Guardian typed signature", guardianSignature]
  ];
  const [sent, sms] = await Promise.all([
    sendEmail(env, `Photo/video release submitted: ${client}`, emailHtml("Pazzion Stylez photo/video release submission", fields, recordId), email),
    sendSms(env, `Pazzion Stylez: New photo/video release form submission. Ref: ${recordId}. Check salon email for signed details.`)
  ]);
  if (!sent.ok || !sms.ok) {
    const configurationError = sent.configurationError || sms.configurationError;
    return json({ success: false, message: configurationError
      ? "Photo-release notifications are not fully configured. Please contact the salon at 252-360-9630 before any photos or video are used."
      : "We could not confirm both email and text notifications. Please contact the salon at 252-360-9630 before relying on this submission." }, 503);
  }
  return json({ success: true, record_id: recordId });
}

export function onRequest({ request }) {
  if (request.method !== "POST") return methodNotAllowed();
}
