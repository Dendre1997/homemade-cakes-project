# 03: Sets on a product

**What to build:** In the form for a set product or a combo, the baker assigns sets from the product's category and gives each assigned set its own price, the same way sizes and prices are assigned to a cake product. The set flavor limit comes from the set and is not overridden per product. A product with no assigned sets keeps its built-in boxes and behaves exactly as before.

**Blocked by:** 01 (Sets catalog).

**Status:** ready-for-agent

- [ ] The product form for a set product or combo lists the sets of the selected category as available
- [ ] The baker can add and remove sets on the product and set a price for each one
- [ ] Assigned sets are saved in piece-count order and come back when the product is edited
- [ ] Reading a product returns its assigned sets with name, piece count, set flavor limit, and icon
- [ ] A product saved before this change still opens, saves, and shows its built-in boxes
