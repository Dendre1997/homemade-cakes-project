# 02: One set price rule

**What to build:** Prefactor. The price of a set product line is computed today in several separate places (cart pricing, both order-creation branches, the client price calculator, and the product page), each with a slightly different fallback when the chosen box is not found. Gather them into one shared rule so later tickets change pricing in one place. Prices for every existing product, cart line, and order stay exactly as they are now.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] Simple set and combo line prices come from one shared rule on both client and server
- [x] A simple set line, a combo line, and a line whose box is no longer on the product price the same as before the change
- [x] Discounts, addons, and the combo cake flavor price apply the same as before
- [x] Order creation in both the pending-confirmation and the standard path uses the shared rule

Notes:
- The admin order-edit price preview also computed set prices and now uses the same rule.
- Each caller's box matching, missing-box fallback, and rounding are kept as named options, so they can be unified deliberately in ticket 04.
- Verified by running the old code of every caller against the shared rule on 141,120 input combinations: no difference with valid data. With corrupt data (missing base price or a box without a price) client previews now show 0 where they showed NaN; the product form and admin product routes never save such data.
