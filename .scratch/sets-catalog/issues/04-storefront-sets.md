# 04: Sets on the storefront

**What to build:** On a set product or combo with assigned sets, the customer picks a set by its icon and name, then picks flavors up to that set's flavor limit. For a combo the limit applies to the treats and the cake keeps one flavor. The cart and checkout show the chosen set and flavors. The server prices the line from the catalog and refuses an order that has more flavors than the limit or a flavor the product does not offer. Products without assigned sets, and cart lines added before this change, work as they do today.

**Blocked by:** 02 (One set price rule), 03 (Sets on a product).

**Status:** done

- [x] The product page shows the assigned sets with their icons and the product's price for each
- [x] The flavor picker allows up to the chosen set's flavor limit and says how many may be chosen
- [x] Switching to a set with a lower limit trims or asks to fix the flavors already picked
- [x] The cart line keeps the set, a snapshot of its name and piece count, and the chosen flavors
- [x] Cart and checkout show the set name and the chosen flavors
- [x] Checkout totals and created orders use the catalog price of the assigned set
- [x] An order with too many flavors or a flavor outside the product is refused with a clear error
- [x] A product with built-in boxes and an existing cart line from before the change still price and check out as before

**Notes:**
- A product with assigned sets is priced only from them (`setLinePrice`); its stored base price is the first set's price (simple) or cake price + first set's price (combo). Products with no assigned sets, including an empty list, keep their built-in boxes and price exactly as before. No product had catalog sets when this shipped, so no stored base price needed migrating.
- Cart lines carry `selectedConfig.setId`, `setName`, `pieceCount`; `quantityConfigId` holds the set name so existing order views still show a label. The server re-takes the name and piece count from the catalog.
- `checkSetLines` runs in `/api/orders` (both branches) and `/api/checkout/calculate`. It checks only products with assigned sets; built-in box lines keep today's client-side 3-flavor limit with no server check.
- A cart line without a set id for a product that has since been given catalog sets is refused with "please add it again"; it has no catalog set to price from.
- `OrderDetailItems` now passes the set id to the shared price rule so editing a catalog-set order keeps its price. Its box picker still lists built-in boxes only; that belongs to ticket 06.
- Storefront verified in the browser with a mocked product response (set cards, limit text, trimming alert, mini-cart and cart lines). The server path for products with assigned sets was verified against a fake database, since none exist yet.
