-- Durable form records for Cloudflare D1.
-- Bind the preview Pages project database as PHOTO_RELEASES_DB.
CREATE TABLE IF NOT EXISTS photo_release_records (
  record_id TEXT PRIMARY KEY,
  submitted_at TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_phone TEXT NOT NULL DEFAULT '',
  service_date TEXT NOT NULL DEFAULT '',
  service_provider TEXT NOT NULL,
  permission TEXT NOT NULL CHECK (permission IN (
    'I CONSENT to selected photo/video uses',
    'I DO NOT CONSENT to public photo/video use'
  )),
  allowed_uses_json TEXT NOT NULL DEFAULT '[]',
  face_visible TEXT NOT NULL DEFAULT '',
  name_use TEXT NOT NULL DEFAULT '',
  age_status TEXT NOT NULL CHECK (age_status IN ('Client is 18 or older', 'Client is under 18')),
  client_signature TEXT NOT NULL,
  date_signed TEXT NOT NULL,
  acknowledgment TEXT NOT NULL,
  guardian_name TEXT NOT NULL DEFAULT '',
  guardian_relationship TEXT NOT NULL DEFAULT '',
  guardian_email TEXT NOT NULL DEFAULT '',
  guardian_phone TEXT NOT NULL DEFAULT '',
  guardian_signature TEXT NOT NULL DEFAULT '',
  notification_status TEXT NOT NULL DEFAULT 'pending' CHECK (notification_status IN ('pending', 'sent', 'failed')),
  notification_updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_photo_release_submitted_at ON photo_release_records(submitted_at);
CREATE INDEX IF NOT EXISTS idx_photo_release_client_email ON photo_release_records(client_email);

CREATE TABLE IF NOT EXISTS contact_messages (
  record_id TEXT PRIMARY KEY,
  submitted_at TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  topic TEXT NOT NULL,
  preferred_stylist TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'saved' CHECK (status IN ('saved', 'emailed', 'email_failed'))
);
CREATE INDEX IF NOT EXISTS idx_contact_messages_submitted_at ON contact_messages(submitted_at);
