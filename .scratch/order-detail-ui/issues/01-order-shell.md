# 01: Order page shell

**What to build:** On a phone the baker sees the customer, the date actions, and the calendar above the line items. On a wide screen the line items stay on the left and that aside stays on the right. The bottom of the page clears the two-row bar. The bar sits under the sidebar drawer, and its status control, Save, and Mark as paid match the shared tap height. The back control and the tools button match that height and do not crush the title on a narrow phone. Saving a status, marking paid, and opening tools do the same thing as today.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] On a phone, customer, date actions, and calendar sit above the line items
- [x] From the wide layout breakpoint, line items stay in the left column and the aside stays on the right
- [x] Page content clears the two-row phone bar
- [x] The phone bar sits under the sidebar drawer and keeps the safe-area inset
- [x] Bar status, Save, and Mark as paid use the shared height and radius
- [x] Back and Tools use the shared height, radius, and fixed icon size without crushing the title
- [x] Status save, mark paid, and opening tools are unchanged

`npx tsc --noEmit` passed. The order page needs the admin Google sign-in, so the phone layout was not opened in the browser.

**Notes:**
- Do not add a docked-sidebar offset. The bar hides before the sidebar docks.
