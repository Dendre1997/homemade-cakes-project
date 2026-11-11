# 02: One set price rule

**What to build:** Prefactor. The price of a set product line is computed today in several separate places (cart pricing, both order-creation branches, the client price calculator, and the product page), each with a slightly different fallback when the chosen box is not found. Gather them into one shared rule so later tickets change pricing in one place. Prices for every existing product, cart line, and order stay exactly as they are now.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Simple set and combo line prices come from one shared rule on both client and server
- [ ] A simple set line, a combo line, and a line whose box is no longer on the product price the same as before the change
- [ ] Discounts, addons, and the combo cake flavor price apply the same as before
- [ ] Order creation in both the pending-confirmation and the standard path uses the shared rule
