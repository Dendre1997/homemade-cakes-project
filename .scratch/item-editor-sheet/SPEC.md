# Item editor sheet

## Problem Statement

The baker edits a line item in a dialog that still feels like a short, centered card. On a phone the outer margins waste width, the title sits under the close control, and the save buttons scroll away with the fields. Combo and custom editing keep their own steps, but those steps are one long cramped column.

## Solution

On a phone the same editor opens as a full-width sheet from the bottom. On a wider screen it is a centered glass dialog. The title and close control stay pinned. The fields scroll on their own. The action row that already belongs to the open mode stays pinned at the bottom, with the same handlers as today. Fields sit in quiet sections so product, flavors, addons, and price are easy to scan.

## User Stories

1. As a baker on a phone, I want the item editor to use the full width, so that I am not typing in a narrow floating card.
2. As a baker on a phone, I want the editor to rise from the bottom and stop above the home indicator, so that the last buttons stay reachable.
3. As a baker on a wide screen, I want the same editor centered with a comfortable width, so that the desktop dialog still feels balanced.
4. As a baker, I want the title and the close control in a fixed header, so that I always know which line I am editing and can leave.
5. As a baker, I want the close control tall enough and clear of the title, so that I do not tap the title by mistake.
6. As a baker, I want the fields to scroll independently, so that a long flavor list does not push the actions off the screen.
7. As a baker editing a standard cake, I want the live total, Cancel, and Save Changes pinned, so that I can save without hunting the end of the form.
8. As a baker editing a combo, I want Cancel and Next pinned on the first step, so that I can continue without scrolling past the cake fields.
9. As a baker editing a combo, I want Back, Cancel, and Add to Order pinned on the second step, so that the treat step keeps its own actions.
10. As a baker editing a custom line, I want Cancel and the existing submit button pinned, so that the custom form saves the same way.
11. As a baker, I want the mode switch to keep doing what it does today, so that standard and custom editing still swap the same way.
12. As a baker, I want product, size, and set choices in one section, so that the core of the line is obvious.
13. As a baker, I want flavors in their own section with room for long names, so that the plus and minus controls stay tappable.
14. As a baker, I want addons and inscription notes grouped together, so that extras are not mixed into the size row.
15. As a baker, I want price and reference photos grouped together, so that the money and the pictures are easy to check.
16. As a baker on a narrow phone, I want one column of fields, so that two inputs are not crushed side by side.
17. As a baker on a wider screen, I want related fields in two columns, so that size and flavor can sit together.
18. As a baker adding from the catalog inside this editor, I want the search and the product list to scroll inside the sheet, so that the list does not escape the dialog.
19. As a baker, I want long product, set, and flavor names to wrap or truncate inside their row, so that nothing spills sideways.
20. As a baker, I want the combo to stay two steps, so that the cake is confirmed before the treats.
21. As a baker, I want section grouping inside each combo step, so that the steps stay separate and still look calm.
22. As a baker, I want other dialogs, including the receipt, to stay centered, so that this sheet does not restyle the whole admin.
23. As a baker creating a new order, I want the set form on that page left alone, so that this polish stays on the line editor.
24. As a baker, I want price, flavor counts, uploads, and save requests to stay the same, so that a prettier dialog does not change the order.

## Implementation Decisions

- One dialog shell: a bottom sheet below the small breakpoint, and a centered glass dialog from that breakpoint up. The shared dialog keeps its centered default. This editor overrides that surface only on its own content.
- The shell is a column with a pinned header, a scrolling body, and a pinned action bar. The close control lives in the header.
- Standard cake pins the existing total, Cancel, and Save Changes. Combo pins the buttons of the current step. Custom pins Cancel and the existing submit control. Handlers stay on those buttons.
- The standard total bar remains available in the same cases it is available today, including when a combo line is not in custom mode.
- Combo stays two steps. Sections are grouped inside the current step. Next still opens the second step.
- Section cards group the fields of the standard editor, the combo form, and the custom form. Phone layout is one column. From the small breakpoint, paired fields use two columns.
- Shared pickers for products, addons, tier flavors, and reference photos keep their behavior. Only control height, radius, and narrow-text wrapping are refined there.
- The set form on the new-order page is out of this work.
- No new save path and no merged Save button across modes.

## Testing Decisions

- A good check is the sheet on a narrow width, the centered dialog on a wide width, pinned actions for standard, combo step 1, combo step 2, and custom, and a save that still calls the same handler.
- There is no project test runner. The check is `npx tsc --noEmit`. The admin order page needs Google sign-in, so a browser pass may be blocked.
- Do not assert private state. The visible result is the shell, the sections, and the same buttons.

## Out of Scope

- Price math, flavor counts, uploads, and the save requests.
- The set form used while creating a new order.
- The receipt dialog and every other centered dialog.
- Customer, notes, tools, and the line-item cards outside this editor.

## Further Notes

- Confirmed: each mode pins its own action row; shared widgets only get height, radius, and wrapping; combo stays two steps; only this editor becomes a sheet.
- One ticket. The shell and the sections are one demo.
