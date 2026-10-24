/* Privacy-conscious conversion event adapter.
 * Emits local pazzion:conversion events and forwards to GA4/GTM only when the
 * site has already configured gtag or a Google Tag Manager dataLayer.
 * Never sends names, email addresses, phone numbers, or form contents.
 */
(function () {
  "use strict";

  function emitConversion(eventName, parameters) {
    const detail = Object.assign({ event_category: "conversion" }, parameters || {});
    window.dispatchEvent(new CustomEvent("pazzion:conversion", {
      detail: Object.assign({ event_name: eventName }, detail)
    }));

    // GA4 gtag integration, if configured elsewhere on the site.
    if (typeof window.gtag === "function") {
      window.gtag("event", eventName, detail);
    }

    // GTM integration, if a container has initialized dataLayer.
    if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push(Object.assign({ event: eventName }, detail));
    }
  }

  function getProductName(link) {
    const card = link.closest(".product-card, .ps-product-tile");
    const heading = card && card.querySelector("h3");
    return heading ? heading.textContent.trim().slice(0, 100) : undefined;
  }

  document.addEventListener("click", function (event) {
    const link = event.target.closest("a");
    if (!link) return;

    const href = link.getAttribute("href") || "";
    const section = link.closest("section");
    const sectionName = section && (section.id || section.getAttribute("aria-label"));

    if (link.matches(".booking-link, [data-book-stylist]") ||
        href === "#booking" || /\/appointments\//i.test(href)) {
      emitConversion("booking_cta_click", {
        link_text: (link.textContent || "").trim().replace(/\s+/g, " ").slice(0, 100),
        section: sectionName || "unknown",
        stylist: link.getAttribute("data-book-stylist") || undefined
      });
      return;
    }

    if (href.includes("pazzion-stylez-llc.square.site")) {
      const productName = getProductName(link);
      emitConversion(productName ? "product_store_click" : "storefront_click", {
        product_name: productName,
        section: sectionName || "unknown"
      });
      return;
    }

    if (href.startsWith("tel:")) {
      emitConversion("contact_call_click", { contact_type: "phone", section: sectionName || "unknown" });
    } else if (href.startsWith("sms:")) {
      emitConversion("contact_text_click", { contact_type: "sms", section: sectionName || "unknown" });
    } else if (href.startsWith("mailto:")) {
      emitConversion("contact_email_click", { contact_type: "email", section: sectionName || "unknown" });
    }
  });
})();
