// Agent goals + structured output schemas.
// Safety: observe & report only. Fake identity only. Never download. Never pay.

export const FAKE_IDENTITY = {
  name: "Ramesh Testkumar",
  phone: "9999999991",
  email: "ramesh.testkumar.fake@example.com",
  city: "Testpur",
};

const SAFETY = `SAFETY RULES (mandatory): You are investigating a suspected scam website to build a fraud report. Only observe and record. Never download, install or run any file. Never enter real personal data, real payment details, card numbers or OTPs. Never complete a payment. If the site asks you to download an app or APK, record that fact and stop that path.`;

export const RECON_GOAL = `${SAFETY}
Explore this suspected scam page and the visible flow (without submitting forms). Record:
1. What brand, bank, government body or company the page impersonates or claims to be, if any.
2. The type of scam it appears to be (e.g. loan app, KYC update, lottery, investment, job offer, electricity bill).
3. Every UPI ID (strings like name@bank, e.g. xyz@ybl, xyz@paytm) visible anywhere on the page or in QR captions.
4. Every phone number and WhatsApp number.
5. Every Telegram handle or t.me link.
6. Every email address.
7. Every bank account number with IFSC if shown.
8. Other URLs/domains this page links to that look related to the same operation.
9. A 2-3 sentence summary of what the page does and how it hooks victims.
Return JSON exactly matching the output schema. Use empty arrays when nothing is found.`;

export const baitGoal = () => `${SAFETY}
This suspected scam page likely has a lead-capture form (name/phone/email) whose submission reveals a hidden next step shown only to hooked victims. If a form exists on the page:
1. Fill it with EXACTLY these obviously fake test details and nothing else: name "${FAKE_IDENTITY.name}", phone "${FAKE_IDENTITY.phone}", email "${FAKE_IDENTITY.email}", city "${FAKE_IDENTITY.city}". For any other required field, invent an obviously fake value.
2. Submit the form and observe what appears next (a payment page, a WhatsApp link, an UPI QR, an app download prompt — do NOT download).
3. Record every UPI ID, phone number, WhatsApp number, Telegram handle, email and bank account revealed AFTER submission, and what payment or action the site asks for.
If there is no form, record that and extract any contact/payment identifiers visible.
Return JSON exactly matching the output schema. Use empty arrays when nothing is found.`;

const identifierProps = {
  upi_ids: { type: "array", items: { type: "string" } },
  phone_numbers: { type: "array", items: { type: "string" } },
  telegram_handles: { type: "array", items: { type: "string" } },
  emails: { type: "array", items: { type: "string" } },
  bank_accounts: { type: "array", items: { type: "string" } },
  other_urls: { type: "array", items: { type: "string" } },
};

export const RECON_SCHEMA = {
  type: "object",
  properties: {
    brand_impersonated: { type: "string" },
    scam_type: { type: "string" },
    page_summary: { type: "string" },
    ...identifierProps,
  },
};

export const BAIT_SCHEMA = {
  type: "object",
  properties: {
    form_found: { type: "boolean" },
    next_page_summary: { type: "string" },
    payment_requested: { type: "string" },
    ...identifierProps,
  },
};
