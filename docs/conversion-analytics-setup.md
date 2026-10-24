# Conversion analytics setup

## Events implemented

`conversion-tracking.js` emits the following browser event names when visitors click relevant links:

- `booking_cta_click` — booking buttons and stylist booking actions
- `product_store_click` — a Square storefront link inside a product card, with the product name
- `storefront_click` — a Square storefront link outside a product card
- `contact_call_click`, `contact_text_click`, `contact_email_click` — contact links

Each event is also dispatched as a `pazzion:conversion` CustomEvent. The script forwards events to `gtag` when Google Analytics 4 is configured, and pushes events into `dataLayer` when Google Tag Manager has initialized it.

## Required before analytics can be called live

1. The site owner must provide the approved GA4 Measurement ID (format `G-XXXXXXXXXX`) or GTM container ID (format `GTM-XXXXXXX`).
2. Add the corresponding Google tag/container through the site's approved consent and privacy approach. Do not paste a guessed ID.
3. Confirm the privacy notice and any required consent behavior before enabling analytics cookies or storage.
4. In GA4 DebugView or GTM Preview, verify each event and mark `booking_cta_click` and `product_store_click` as key events if desired.
5. Test on the deployed site, including mobile booking, then confirm events in the live analytics property.

This adapter does not create an analytics property, load a Google tag, or send data to an analytics vendor by itself. Until a tag/container is configured and validated, these are event hooks only. It intentionally does not send form contents or personally identifying contact details.
