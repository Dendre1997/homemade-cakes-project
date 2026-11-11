# 05: Sets in the custom-order wizard

**What to build:** In the custom-order wizard, a set category or combo category shows the sets assigned to it in place of the fixed 6/12/18/24 boxes, and limits flavors to the chosen set's flavor limit. For a combo the limit applies to the treats and the cake keeps one flavor. The estimate uses the set's base price, or the category price per piece times the piece count when the set has none. Editing a line item from the cart summary brings the chosen set and flavors back. The server refuses a request with more flavors than the limit. A category with no assigned sets works as it does today.

**Blocked by:** 01 (Sets catalog).

**Status:** ready-for-agent

- [ ] A set or combo category with assigned sets shows them with their icons in piece-count order
- [ ] The flavor picker allows up to the chosen set's flavor limit and says how many may be chosen
- [ ] The estimate follows the set base price, else the category price per piece times the piece count
- [ ] The line item keeps the set and the readable size and flavor text that admins already see
- [ ] Edit from the cart summary restores the chosen set, the flavors, and the estimate
- [ ] A request with too many flavors for the chosen set is refused with a clear error
- [ ] A category without assigned sets still shows the fixed boxes and prices as before
