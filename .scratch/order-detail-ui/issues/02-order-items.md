# 02: Order line items

**What to build:** The line item cards and the add or edit dialog are comfortable on a phone. Set choices, flavor chips, addon quantity, diameter choices, reference photos, and edit or delete controls meet the shared tap height. Placeholders use a single ellipsis. Motion does not use a blanket transition. Adding, editing, removing, and pricing a line stay the same.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] View cards keep edit and delete controls at the shared tap height
- [x] Set, flavor, addon, and diameter controls in the dialog meet the shared height
- [x] Reference photo actions meet the shared tap size
- [x] Placeholders end with a single ellipsis character
- [x] Blanket transitions are replaced with listed properties
- [x] Add, edit, remove, and price results are unchanged

**Notes:**
- Includes the custom, combo, set, and standard item forms that the dialog already opens.
- Class-only polish on `AdminOrderItem`, `OrderDetailItems`, `CustomOrderItemForm`, `ComboProductForm`, `SetProductForm`, `AddonAdminSelector`, `AdminTierFlavorEditor`, `ProductPicker`, and `ImageSelector` (the photo picker those forms already open). Handlers, pricing, and flavor counts are unchanged.
- `npx tsc --noEmit` passed with 0 errors.
- The production order page was not clicked in the browser: admin sign-in is Google and was not available in this session.
