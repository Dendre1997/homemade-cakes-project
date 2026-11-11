# 01: Catalog hub and list shell

**What to build:** The baker opens Inventory and sees glass cards, with the sets card talking about sets and piece count. Each of the eight sections has a clear header, a labeled search field at the same height as an order field, and a glass list. Details, Edit, and Delete sit in one row, tall enough to tap, and still named when the word is hidden. Flavor reorder keeps today's drag, discard, and save, with a larger handle and a save bar that clears the sidebar and the home gesture.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] The Inventory hub uses the glass surface, and the sets card says sets and piece count
- [x] All eight section lists use that glass surface, a clear header, and a labeled search field (`h-11` on a phone, `h-10` on a wide screen, `rounded-xl`, ellipsis in the placeholder)
- [x] Details, Edit, and Delete stay on one row, about 44px on a phone and `h-10` on a wide screen, with an accessible name when the label is hidden
- [x] The details dialog closes from a 44px control and contains its own scroll
- [x] Flavor tabs do not use `transition-all`, the drag handle is comfortable to grab, and the order bar clears the docked sidebar and the safe area
- [x] Search, opening details, edit, delete, routing, and flavor drag-and-drop still do what they do today

**Notes:**
- Column forms, the addon form, and products are later tickets. This slice is the hub, the list shell, and the shared row.
- `npx tsc --noEmit` passed. The admin catalog needs Google sign-in, so the pages were not opened in the browser.
