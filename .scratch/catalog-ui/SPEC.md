# Catalog visual polish

## Problem Statement

The baker's catalog — the Inventory hub, its eight sections, and products — still uses the older admin cards, short controls, and unlabeled search fields. A custom request and a production order already share glass surfaces, `h-11` controls on a phone, `h-10` controls on a wide screen, and action bars that stay clear of the sidebar. Moving between an order and the catalog feels like two different tools, and several catalog controls are smaller than a comfortable touch target.

## Solution

Restyle the catalog to the same visual system as a production order and a custom request. Every create, edit, delete, search, filter, upload, and reorder action keeps today's behavior. The work lands as four slices: the hub and lists, the short column forms, the addon form, and products.

## User Stories

1. As a baker, I want the Inventory hub to use the same glass cards as an order, so that the catalog feels like the rest of the panel.
2. As a baker, I want each hub card to name a set as a set, so that the language matches the rest of the bakery.
3. As a baker, I want a clear page title and a Back to Catalog control on every inventory section, so that I can return to the hub without hunting.
4. As a baker, I want the list of existing categories, collections, flavors, addons, diameters, sets, shapes, and allergens on a glass surface, so that the list is easy to scan.
5. As a baker on a phone, I want Details, Edit, and Delete in one horizontal row, so that the row does not stack into a tall column of icons.
6. As a baker, I want those row actions about 44px tall on a phone and `h-10` on a wide screen, so that I can tap them reliably.
7. As a baker using a screen reader, I want a name for Details, Edit, and Delete when the visible word is hidden, so that the icon buttons are understandable.
8. As a baker, I want the details dialog to close from a 44px control, so that the corner button is as easy to hit as the other actions.
9. As a baker, I want the details dialog to contain its own scroll, so that the page behind it does not chain-scroll.
10. As a baker, I want each inventory search field labeled, so that I know what the field filters.
11. As a baker, I want search fields at the same height as order form fields, with rounded corners and a proper ellipsis in the placeholder.
12. As a baker, I want search to keep filtering the same list it filters today.
13. As a baker reordering flavors, I want a drag handle large enough to grab, so that I can reorder on a phone.
14. As a baker, I want flavor category tabs to animate only color, background, border, and shadow, so that the tab change stays calm.
15. As a baker saving a flavor order, I want the save bar to sit in the content column on a wide screen and clear the home gesture on a phone, so that it does not cover the sidebar.
16. As a baker, I want drag-and-drop flavor order, discard, and save to change the same data they change today.
17. As a baker, I want category, collection, flavor, diameter, set, shape, and allergen forms on the same glass surface, so that creating one matches creating another.
18. As a baker, I want those form fields at `h-11` on a phone and `h-10` on a wide screen, with `rounded-xl`, so that they match an order.
19. As a baker on a phone, I want Save and Cancel stuck to the bottom of a column form, under the sidebar and clear of the home gesture, so that I do not scroll the whole form to save.
20. As a baker on a wide screen, I want Save at the end of the form, so that the desktop layout I already know stays put.
21. As a baker, I want creating and editing those records to send the same data as today.
22. As a baker editing an addon, I want variants, prices, and photos in that same visual system, so that the densest form is still comfortable.
23. As a baker, I want upload and remove-variant controls at least 44px, so that I do not miss them on a phone.
24. As a baker, I want adding a variant and typing a price to work exactly as they do today.
25. As a baker, I want the product list, product card, product page, and product form to use the same glass, heights, and overflow rules.
26. As a baker, I want product search, category, collection, and seasonal filters to return the same products as today.
27. As a baker, I want adding a product to a collection or a seasonal event to use the same modal flow as today.
28. As a baker, I want set prices on a product to stay the same numbers, only in taller fields.
29. As a baker, I want recipes left untouched, so that this polish does not wander into the recipe scaler.
30. As a baker, I want the unfinished flavor route left as it is, so that a visual pass does not pretend that page is built.

## Implementation Decisions

- The visual benchmark is the production order page and the custom request page: glass surface (`rounded-2xl`, `border-primary/15`, `bg-background/20`, backdrop blur), `rounded-xl` fields, `h-11` on small screens, `h-10` from the `sm` breakpoint, `min-w-0` and truncation where a name can overflow, and about 44px for icon actions.
- Inventory keeps today's surfaces. A section still shows its form in a column beside the list. A product is still created and edited on its own page. Category and allergen edit routes stay. No new modal or side panel is introduced.
- On a phone, Save and Cancel for a column form and for the addon form stick to the bottom, under the sidebar, and clear the safe area. On a wide screen those buttons stay at the end of the form.
- The flavor-order bar keeps today's save and discard actions. It is offset by the docked sidebar width and clears the safe area.
- The hub card for sets says sets and piece count. It does not call a set a box.
- Shared list rows and hub cards may also appear on discounts and content. Restyling the shared row and card is visual only; those screens keep their current actions.
- Recipes are out of this spec. The stub flavor page is not built out.

## Testing Decisions

- A good check shows the same search results, the same edit target, the same delete confirmation, and the same flavor order save as before the restyle. It does not assert class names.
- There is no project test runner. Each slice is checked with `npx tsc --noEmit` and a manual pass of the hub, one list, the addon form, and a product form.
- The admin panel needs Google sign-in, so a browser pass may stop at the login screen. Say so when that happens.

## Out of Scope

- Any change to create, update, delete, search, filter, upload, reorder, or routing behavior.
- Recipes.
- Building the unfinished flavor page.
- New automated UI tests.

## Further Notes

- Four tickets: hub and lists, column forms, the addon form, then products. The last three wait on the shared hub and list shell so they inherit one header and one row.
