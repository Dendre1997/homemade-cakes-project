# Custom order — Candy bar category grouping & pickup slot notice

## Problem Statement

The custom-order category step lists every catalog category in one flat grid, including many separate “set” types (candy-bar-style products). That feels cluttered compared to cakes and other singles. After submit, customers often message the bakery to change pickup time; the form should set expectations without restricting edits during the wizard.

## Solution

On step 2, all categories with `categoryType === "set"` are grouped under one virtual entry labeled **Candy bar**. Tapping Candy bar opens a drill-in list of the real set categories; **All categories** returns to the top level. The Candy bar avatar uses a **dynamic collage**: one image fills the circle when only one set has art; two side-by-side; three as two on top and one full-width below; four as 2×2—never empty placeholder cells. Zero set images → single emoji placeholder like other categories.

On step 1, after the customer **selects** a time slot, show a short English notice: pickup time is **final after submit**, but they may still change date and slot **until then**. No form behavior changes (do not clear slot on date change; do not lock slots).

## User Stories

1. As a customer, I want set products grouped under Candy bar, so the first screen is easier to scan.
2. As a customer, I want to open Candy bar and pick a specific set product, so ordering behavior stays the same.
3. As a customer, I want Back to all categories from inside Candy bar, so I can pick a cake instead.
4. As a customer, I want the Candy bar image to reflect how many set types exist (1–4 photos), so it looks intentional not padded.
5. As a customer ordering multiple items, I want the same grouping on each item’s category step.
6. As a customer, after I pick a slot, I want to know submit locks pickup time, so I double-check before sending.
7. As a customer, I want to change date or slot freely before submit, so the notice is informational only.
8. As the baker, I want fewer post-submit time-change messages driven by clearer copy, not by blocking the UI.
9. As a developer, I want combo categories still hidden from this step, as today.

## Implementation Decisions

- Virtual **Candy bar** row is not a DB category; drill-in only. Selection always sets a real set category document id and name. One set in catalog still uses Candy bar group (Q7-A).
- Collage layouts: N=0 placeholder; N=1 full; N=2 columns; N=3 grid with bottom row colspan 2; N=4 2×2. URLs from set categories sorted by name, max 4, only non-empty `imageUrl`.
- Step 1 banner copy (Q3-B): “After you submit, pickup time is final. You can change it here until then.” Shown when `timeSlot` is set (Q1-A).
- No `timeSlot` reset on date change (Q2-A). Slots remain clickable (informational only).
- Post-submit changes remain an admin/ops concern; copy does not promise admin cannot edit.

## Testing Decisions

- **Seam**: `partitionCustomOrderCategories` / `collageImageUrlsFromSets` for partition and URL list.
- Manual QA: collage with 1, 2, 3, 4+ set categories; slot notice; change date and slot before submit still works.

## Out of Scope

- Locking UI after slot pick or after submit.
- Deep link `category=candy-bar`.
- API or schema changes.

## Further Notes

- Initial grill Q1–Q11; refinement grill: Q1-A, Q2-A, Q3-B, Q4 (admin can change; reduce customer texts), Q5-A+C, Q6-A, Q7-A, Q8-A+B.
