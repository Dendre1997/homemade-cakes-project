# Request card shows flavors once

## Problem Statement

On the list of custom requests, a line item prints its flavors twice. The baker sees the saved flavor text and, under it, the same flavors again as a cleaned list. A set looks like "Blueberry , Lemon" followed by "Blueberry, Lemon". A combo does the same with the cake flavor and the treat flavors. A tier cake is not doubled.

## Solution

The request card shows the flavors of each line item once. A line without tiers shows one cleaned list. A set lists each chosen flavor once. A combo lists the cake flavor and the treat flavors once. A tier cake still lists each tier and its flavor once, and does not also print the flavor string. The detail form and the production order line stay as they are.

## User Stories

1. As a baker scanning the request list, I want each line item's flavors shown once, so that I do not read the same choice twice.
2. As a baker scanning a set line, I want each chosen flavor named once, so that the piece mix is clear.
3. As a baker scanning a set line, I want the flavor names without a stray space before the comma, so that the list is readable.
4. As a baker scanning a combo line, I want the cake flavor and the treat flavors shown once, so that I can see both parts of the combo.
5. As a baker scanning a single-flavor cake, I want that flavor shown once, so that a simple cake does not look like two flavors.
6. As a baker scanning a tier cake, I want each tier and its flavor listed once, so that the tiers stay the source of the flavor line.
7. As a baker scanning a tier cake, I want no second copy of the flavor string under the tiers, so that the card does not repeat the cake.
8. As a baker scanning a line with no flavor yet, I want one empty state, so that "flavor not set" is not printed twice.
9. As a baker scanning a request with several line items, I want each line item's flavors once, so that a set next to a cake does not double either line.
10. As a baker opening the request detail, I want that form unchanged by this card fix, so that editing flavors stays where it already is.
11. As a baker opening the production order, I want that line unchanged by this card fix, so that the order page is not part of this change.
12. As a baker, I want the size, inscription, and addons on the card to stay, so that only the repeated flavor line goes away.

## Implementation Decisions

- The duplicate is two readers of the same saved flavor text on the request list card. One reader is the shared tier display, which prints the flavor string when the line has no tiers. The other reader prints the cleaned flavor summary under it.
- The card keeps one flavor line. When the line has no tiers, that line is the cleaned summary. When the line has tiers, that line is the tier list only.
- A set summary is the chosen flavor names joined once, with surrounding spaces removed. A combo summary names the cake flavor and the treat flavors once. A single flavor stays one name.
- The shared tier display used by receipts, the cart, and the production order is not changed. The request card stops asking it for a flavor string that the card also prints itself.
- No saved field changes. The flavor text on the line item stays as it is.

## Testing Decisions

- A good check is the text on the request list card. A set with two flavors appears once. A combo's cake flavor and treat flavors appear once. A tier cake lists each tier once and does not repeat a flavor sentence under that list. A line with no flavor shows one empty state.
- The seam is the request list card. There is no project test runner. The check is `npx tsc --noEmit` and one look at the card.
- The detail form and the production order line are not part of the check, except to confirm they were not edited.

## Out of Scope

- The request detail form and its flavor chips.
- The production order line, conversion, and receipts.
- Changing how flavors are saved.
- The shared tier display's behavior on every other screen.

## Further Notes

- One ticket. The two lines are on the same card, so splitting the cleanup would leave the duplicate in place until both land.
