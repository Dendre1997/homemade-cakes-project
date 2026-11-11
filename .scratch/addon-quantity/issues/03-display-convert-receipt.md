# 03: Addon quantity on admin view, conversion, and receipt

**What to build:** After a request or order is saved, the admin sees each addon’s quantity and the same money the customer was charged. Converting a custom request copies that quantity onto the production order. The receipt shows the quantity and the line total that already counts it once per cake. Older addons with no quantity display and price as one. This ticket does not add a quantity editor on an existing production order.

**Blocked by:** 02: Client addon quantity and server price check

**Status:** ready-for-agent

- [ ] Custom-request review, the production order, and the receipt show addon quantity and the matching total
- [ ] Conversion copies the saved addon quantity onto the new order
- [ ] A saved addon without a quantity still displays and prices as one
