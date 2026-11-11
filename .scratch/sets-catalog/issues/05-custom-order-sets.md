# 05: Sets in the custom-order wizard

**What to build:** In the custom-order wizard, a set category or combo category shows the sets assigned to it in place of the fixed 6/12/18/24 boxes, and limits flavors to the chosen set's flavor limit. For a combo the limit applies to the treats and the cake keeps one flavor. The estimate uses the set's base price, or the category price per piece times the piece count when the set has none. Editing a line item from the cart summary brings the chosen set and flavors back. The server refuses a request with more flavors than the limit. A category with no assigned sets works as it does today.

**Blocked by:** 01 (Sets catalog).

**Status:** done

- [x] A set or combo category with assigned sets shows them with their icons in piece-count order
- [x] The flavor picker allows up to the chosen set's flavor limit and says how many may be chosen
- [x] The estimate follows the set base price, else the category price per piece times the piece count
- [x] The line item keeps the set and the readable size and flavor text that admins already see
- [x] Edit from the cart summary restores the chosen set, the flavors, and the estimate
- [x] A request with too many flavors for the chosen set is refused with a clear error
- [x] A category without assigned sets still shows the fixed boxes and prices as before

**Notes:**
- Sets come from `GET /api/sets?categoryId=`. The step waits for that response; the fixed boxes appear only when the category has none. A failed fetch shows an error instead of the boxes.
- The set portion is `set.basePrice` when it is a number, otherwise the category base price times the piece count. A combo line adds the category base price once more as the cake, then addons once. One custom-order line is one creation, so nothing is multiplied by a line quantity.
- The line stores `details.setId` and keeps the size text admins already read: `Quantity: 6 (Box of 6)` or `Combo Box: 6 pieces + 4" Pick (Box of 6)`. Edit restores the set from `setId`, and the flavors from the same text as before.
- `POST /api/custom-orders` checks the set and the flavor count (treats only, for a combo) and rewrites the size text and the estimate from the catalog. A category with no sets keeps the client estimate.
- The category step still hides combo categories. The combo set picker, treat limit, single cake flavor, and cake-plus-set estimate run when a combo category is the chosen one.
- Verified in the browser: a set category with no sets still shows Box of 6/12/18/24 at $4 a piece; with mocked sets it shows the set cards, trims 3 flavors to 2 with a notice, prices a $40 set, and Edit brings that set and those flavors back. A mocked combo showed cake $120 + set $40 = $160, and a set with no base price at $120 × 12. The refusal rules were checked against the pure function, since no catalog sets exist in the database yet.
