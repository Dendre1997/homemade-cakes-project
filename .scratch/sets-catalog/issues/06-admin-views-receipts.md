# 06: Sets in admin views, manual forms, conversion, and receipts

**What to build:** Everywhere an order is shown or produced, a set line shows its set name and chosen flavors: admin order views, the print page, the client receipt, the payment page, and the confirmation email. The baker's manual order forms offer the catalog sets; the set flavor limit is shown as a hint only, and the custom piece count stays available so the baker can make an exception. Converting a custom request into an order carries the set across. Historical orders show exactly as before.

**Blocked by:** 04 (Sets on the storefront), 05 (Sets in the custom-order wizard).

**Status:** ready-for-agent

- [ ] Admin order views and the print page show the set name and chosen flavors for a set line
- [ ] The client receipt, payment page, and confirmation email show the set name and chosen flavors
- [ ] The manual set and combo forms offer catalog sets and show the flavor limit as a hint
- [ ] The baker can still enter a custom piece count and exceed the flavor limit in manual forms
- [ ] Converting a custom request with a set produces an order line with that set and its flavors
- [ ] Orders and custom requests created before this change display the same as before
