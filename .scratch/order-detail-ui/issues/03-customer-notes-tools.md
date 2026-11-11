# 03: Customer, notes, and tools

**What to build:** The customer card, date and status actions, order notes, tools drawer, and receipt preview match the shared control height, radius, and icon size. Phone rows are not cramped. Placeholders use a single ellipsis. Contact actions, date saving, note saving, print, receipt preview, copy payment link, and mark paid stay the same.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] Customer actions meet the shared tap height
- [x] Date and status controls in the aside meet the shared height
- [x] Note composer and note actions meet the shared height, and the placeholder uses one ellipsis
- [x] Tools drawer actions and the receipt preview button meet the shared height
- [x] Icons in those controls keep a fixed size
- [x] Contact, dates, notes, print, receipt, payment link, and mark paid behave as they do today

**Notes:**
- Payment and document cards that the page does not render stay out of this ticket.
- Class-only polish on the customer card, phone sheet, workflow actions, assignment calendar, pickup time dialog, notes, tools drawer, and receipt modal. `ClientReceiptCard` is the image that becomes the PNG, so its layout is unchanged.
- Month arrows grow only on the assignment calendar. The shared time picker grows only when this dialog passes `comfortable`. Schedule and the orders calendar keep their previous control size.
- `npx tsc --noEmit` passed with 0 errors.
- The production order page was not clicked in the browser: admin sign-in is Google and was not available in this session.
