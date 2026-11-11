# Bakery orders

Language for how a customer’s cake or product line is priced, including extras attached to that line.

## Language

**Line item**:
One cake or product entry inside an order, with its own line quantity.
_Avoid_: Order line, row

**Cake size**:
The diameter, or the set, chosen for one line item.
_Avoid_: Addon variant

**Set**:
A catalog box holding a fixed piece count, which the baker assigns to categories and products the same way as a diameter.
_Avoid_: Box size, quantity config, pack

**Piece count**:
How many pieces one set holds.
_Avoid_: Quantity, box quantity

**Set flavor limit**:
The most flavors a customer may choose for one set, defined by the baker on that set. The customer only picks the flavors; the baker splits the pieces between them.
_Avoid_: Max flavors, mix limit

**Set product**:
A product sold in sets.
_Avoid_: Box product

**Set category**:
A category whose items are sold in sets.

**Combo**:
A set sold together with one small cake. The set flavor limit applies to the treats; the cake has one flavor.
_Avoid_: Combo box, bundle

**Line quantity**:
How many of that same cake or product the line item contains.
_Avoid_: Item count, qty

**Addon**:
A catalog extra the customer can attach to one cake or product.
_Avoid_: Decoration, extra, deco

**Addon variant**:
One priced choice of an addon.
_Avoid_: Option, size

**Addon quantity**:
How many of that addon belong to a single cake or product. The line price includes that count once per unit of line quantity.
_Avoid_: Order quantity, item quantity
