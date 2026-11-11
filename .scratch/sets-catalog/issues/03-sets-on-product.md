# 03: Sets on a product

**What to build:** In the form for a set product or a combo, the baker assigns sets from the product's category and gives each assigned set its own price, the same way sizes and prices are assigned to a cake product. The set flavor limit comes from the set and is not overridden per product. A product with no assigned sets keeps its built-in boxes and behaves exactly as before.

**Blocked by:** 01 (Sets catalog).

**Status:** done

- [x] The product form for a set product or combo lists the sets of the selected category as available
- [x] The baker can add and remove sets on the product and set a price for each one
- [x] Assigned sets are saved in piece-count order and come back when the product is edited
- [x] Reading a product returns its assigned sets with name, piece count, set flavor limit, and icon
- [x] A product saved before this change still opens, saves, and shows its built-in boxes

**Notes:**
- Stored as `availableSetConfigs: [{ setId: ObjectId, price }]`; the delete guard on `DELETE /api/admin/sets/[id]` matches this field.
- Each assigned set needs a price above 0. A set that leaves the product's category is dropped on save.
- The set base price rule still reads the first built-in box. A set product with only catalog sets gets a simple-set base of 0; ticket 04 should price from the assigned sets.
- The admin product form was not browser-verified (admin pages need Google sign-in); validation was checked against a fake database and the storefront was checked live.
