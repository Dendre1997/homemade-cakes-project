# 04: Products

**What to build:** The baker browses, opens, creates, and edits products with the same glass surfaces, field heights, and overflow behavior as an order. Search, category, collection, and seasonal filters return the same products. Adding a product to a collection or a seasonal event still uses today's modal. Set prices on a product stay the same numbers, in taller fields. View, Edit, Delete, and the remove actions are comfortable to tap.

**Blocked by:** 01: Catalog hub and list shell

**Status:** ready-for-agent

- [ ] The product list, product card, product page, and product form use the glass surface and the shared control heights
- [ ] Long product names truncate instead of overflowing
- [ ] View, Edit, Delete, and remove-from-collection or seasonal actions are about 44px on a phone
- [ ] Set price fields on the product form are `h-11` / `h-10` and `rounded-xl`
- [ ] Search, filters, the add-to-collection or seasonal modal, image upload, and save behave as they do today
- [ ] Recipes are not part of this slice

**Notes:**
- The hub card component is shared. Product-specific layout is this ticket.
