# 06: Sets in admin views, manual forms, conversion, and receipts

**What to build:** Everywhere an order is shown or produced, a set line shows its set name and chosen flavors: admin order views, the print page, the client receipt, the payment page, and the confirmation email. The baker's manual order forms offer the catalog sets; the set flavor limit is shown as a hint only, and the custom piece count stays available so the baker can make an exception. Converting a custom request into an order carries the set across. Historical orders show exactly as before.

**Blocked by:** 04 (Sets on the storefront), 05 (Sets in the custom-order wizard).

**Status:** done

- [x] Admin order views and the print page show the set name and chosen flavors for a set line
- [x] The client receipt, payment page, and confirmation email show the set name and chosen flavors
- [x] The manual set and combo forms offer catalog sets and show the flavor limit as a hint
- [x] The baker can still enter a custom piece count and exceed the flavor limit in manual forms
- [x] Converting a custom request with a set produces an order line with that set and its flavors
- [x] Orders and custom requests created before this change display the same as before

**Notes:**
- A line shows the catalog set only when it has `setId` or `setName`. The label is `name · piece count pieces`. Lines that only have a box label (`quantityConfigId`) keep today's text.
- Admin order detail, the order list, the print page, the client receipt, the payment page, the profile order card, and the confirmation email use that label. Flavors already stored on the line stay visible; a catalog combo also shows the cake flavor and the treats.
- Custom requests already store the set name inside the size text and the flavors in the flavor text, so those admin and profile views did not need a new layout.
- The manual set form lists the product's assigned sets. The manual combo form lists the sets of the chosen category, and the fixed 6/12/24 boxes when that category has none. Both keep the custom piece count. The flavor limit is a hint; choosing more is allowed.
- Converting a custom request looks up `details.setId` and copies the set name, piece count, treat flavors, and combo cake flavor onto the production line. The readable size and flavor text stay too.
- Checked with a small script: a legacy box label produces no catalog label, and a legacy line description does not gain a set name. Admin screens need a Google sign-in, so the forms were not clicked through in the browser.
