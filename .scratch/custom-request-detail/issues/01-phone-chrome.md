# 01: Phone chrome for a custom request

**What to build:** On a phone, the baker opening a custom request sees a sticky header with the request number, status, and agreed total. Convert to Order, or Copy Payment Link once the request is converted, sits in one bottom bar together with Save when there are unsaved changes. The bar clears the home gesture. On a wide screen, convert stays in the header, the line items sit on the left, and contact, the message, payment preference, and logistics stay in a sticky column. On a phone those same blocks sit above the line items, so the baker can reach the customer and the date before reading every item. The page no longer doubles its side padding. Saving, converting, copying the payment link, and editing fields behave exactly as they do today.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] The header stays visible while scrolling and shows the request number, status, and agreed total
- [x] On a phone, Convert to Order or Copy Payment Link, and Save when there are unsaved changes, share one bottom bar that clears the home gesture
- [x] On a wide screen, convert stays in the header, line items are on the left, and the other blocks stay in a sticky column
- [x] On a phone, contact, WhatsApp, SMS, and the date sit above the line items
- [x] The page no longer adds a second side padding inside the admin frame
- [x] Save, discard, convert, and the payment link still call the same actions as today

**Notes:**
- The page uses the production-order shell. On a phone the contact column comes first. From the wide breakpoint, line items sit on the left and that column sticks below the taller request header.
- Convert and the payment link stay in the header on a wide screen. Below that breakpoint they share the bottom bar with Save and Discard, and the bar clears the home gesture. The wide-screen save bar is unchanged.
- The extra side padding on this page is gone. The admin frame padding remains.
- The admin page needs Google sign-in, so the layout was not opened in the browser. `npx tsc --noEmit` passed.
