# 02: Client addon quantity and server price check

**What to build:** On a custom-order request and on a shop product in the cart, a customer who picks an addon that allows quantity can choose from 1 up to that addon’s maximum. The addon quantity belongs to one cake or product. A line with two of that cake charges the addon once per cake. The server checks the catalog price and clamps the quantity to the maximum before saving. An older line with no quantity is still priced as one.

**Blocked by:** 01: Addon catalog quantity settings

**Status:** ready-for-agent

- [ ] Custom order and the shop product page show a quantity control only when the addon allows it
- [ ] The line price is (cake or product price + addon unit price × addon quantity) × line quantity
- [ ] Submit rejects or clamps a quantity outside 1…maximum and does not trust a client-sent unit price over the catalog
- [ ] An addon with the toggle off still adds its variant price once per cake
