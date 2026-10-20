# Order detail — Customer contact actions & layout

## Problem Statement

On the admin order detail page, customer phone and email are plain text. Bakers often contact customers from a phone while multitasking; copying numbers or switching apps is friction. The card layout also feels like a generic form dump compared to the rest of the glass order detail experience.

## Solution

Redesign the **Customer** card with clear **Contact** and **Pickup** sections. Email opens the mail client via `mailto:`. Tapping the **phone number** opens a small **slide-out panel** with three actions: **Text (SMS)**, **Call**, and **WhatsApp**, using the same phone normalization as messaging elsewhere. Delivery address links to **Google Maps** search when present. Message bodies stay empty (baker writes the text). Same behavior on mobile and desktop.

## User Stories

1. As a baker on my phone, I want to tap the customer phone and choose Text, so that Messages opens with the number ready.
2. As a baker, I want to call the customer from the same phone menu, so that I do not dial manually.
3. As a baker messaging Instagram clients, I want WhatsApp from that menu, so that I use the channel they prefer.
4. As a baker, I want SMS/WhatsApp without a pre-filled body, so that I control tone and content.
5. As a baker, I want to tap email to open mail, so that I can send receipts or follow-ups quickly.
6. As a baker, I want contact fields with icons and scannable rows, so that the card matches the rest of order detail.
7. As a baker, I want pickup method and address separated from contact info, so that logistics are obvious at a glance.
8. As a baker with a delivery address, I want Open in Maps, so that I can navigate without copying the string.
9. As a baker editing customer info, I want the existing inline edit flow unchanged, so that corrections still save via the order PUT API.
10. As a baker with a malformed or missing phone, I want the UI to degrade gracefully (no broken links), so that I am not stuck.
11. As a developer, I want phone link building centralized with `formatPhoneForMessaging`, so that Canadian 10-digit numbers normalize consistently.
12. As a baker on desktop, I want the same contact actions as on mobile, so that behavior is predictable.

## Implementation Decisions

- Pure helper module builds `tel`, `sms`, and WhatsApp URLs from a raw phone string via existing `formatPhoneForMessaging`; SMS uses `sms:+{digits}` with no body; WhatsApp uses `https://wa.me/{digits}` with no text query.
- Maps helper builds a Google Maps search URL from a non-empty address string.
- **Phone UI**: the displayed number is a button; opening it shows a Radix popover/sheet-style panel listing Text, Call, WhatsApp as link-buttons (external navigation, not in-app send).
- **Email UI**: `mailto:` anchor with icon row in view mode only.
- **Layout**: section headings Contact and Pickup; header row with title and Edit; glass card styling preserved; edit mode fields unchanged in behavior.
- No API or schema changes; no CRM or order history lookup.
- Reuse patterns from custom-order messaging and copilot customer cards for href shapes only.

## Testing Decisions

- **Seam**: pure URL builders (phone actions + maps search) — unit tests if/when the project adds a test runner; until then, manual QA on iOS/Android/desktop for sms/tel/wa.me/mailto/maps.
- Do not snapshot-test the React card; verify behavior manually on an order with phone, email, and address.

## Out of Scope

- Prefilled quick messages for standard orders (future ticket).
- CRM / repeat-customer lookup by phone or email.
- Resend or in-app SMS.
- Changing guest vs logged-in customer identity model.

## Further Notes

- Grill decisions: Q1-C in slide-out on number click; Q2-A; Q3-A; Q4-B; Q5-B; Q6-A; Q7-B; Q8-A.
