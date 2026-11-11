# 04: Sets on the storefront

**What to build:** On a set product or combo with assigned sets, the customer picks a set by its icon and name, then picks flavors up to that set's flavor limit. For a combo the limit applies to the treats and the cake keeps one flavor. The cart and checkout show the chosen set and flavors. The server prices the line from the catalog and refuses an order that has more flavors than the limit or a flavor the product does not offer. Products without assigned sets, and cart lines added before this change, work as they do today.

**Blocked by:** 02 (One set price rule), 03 (Sets on a product).

**Status:** ready-for-agent

- [ ] The product page shows the assigned sets with their icons and the product's price for each
- [ ] The flavor picker allows up to the chosen set's flavor limit and says how many may be chosen
- [ ] Switching to a set with a lower limit trims or asks to fix the flavors already picked
- [ ] The cart line keeps the set, a snapshot of its name and piece count, and the chosen flavors
- [ ] Cart and checkout show the set name and the chosen flavors
- [ ] Checkout totals and created orders use the catalog price of the assigned set
- [ ] An order with too many flavors or a flavor outside the product is refused with a clear error
- [ ] A product with built-in boxes and an existing cart line from before the change still price and check out as before
