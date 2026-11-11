# Bakery orders

Language for how a customer’s cake or product line is priced, including extras attached to that line.

## Language

**Line item**:
One cake or product entry inside an order, with its own line quantity.
_Avoid_: Order line, row

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
