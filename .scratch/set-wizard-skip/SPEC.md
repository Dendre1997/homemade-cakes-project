# Set category skips design

## Problem Statement

A customer ordering from a set category still sees the flavor-note question and then the whole design step: photos, design notes, text on the cake, and addons. A set does not need that design. The request also cannot be saved if those fields are simply hidden, because every line still requires design notes and at least one reference image.

## Solution

When the line’s category is a set category, the flavor-note question and its field stay hidden, and Next goes from details straight to the request summary. The line is saved without design notes, text on the cake, reference images, or addons. A cake line and a combo line keep today’s flavor note and design step, including the photo and design-note requirement. Allergies stay on the details step for every category.

## User Stories

1. As a customer choosing a set category, I want no yes-or-no question about a flavor note, so that I am not asked for a note the set does not use.
2. As a customer choosing a set category, I want no flavor-note field, so that I cannot type a note that will not be used.
3. As a customer choosing a set category, I still want to pick the set, the piece count, and the flavors within the set flavor limit, so that the order is specific.
4. As a customer choosing a set category, I still want to answer the allergy question, so that the bakery knows what to avoid.
5. As a customer choosing a set category, I want Next on the details step to open my request summary, so that I do not pass through design.
6. As a customer choosing a set category, I want Back from the summary to return to details, so that I do not land on a design step I skipped.
7. As a customer choosing a set category, I want the request to send without design notes, text on the cake, reference images, or addons, so that the order can be placed.
8. As a customer who previously typed a flavor note or added a design and then switches that line to a set category, I want those design details cleared, so that the bakery does not receive a cake design I no longer confirmed.
9. As a customer choosing a cake category, I want the flavor-note question and the design step to stay, so that my cake request is unchanged.
10. As a customer choosing a combo, I want the flavor-note question and the design step to stay, so that the small cake can still have a design.
11. As a customer choosing a cake or a combo, I want the request refused when the photo or the design notes are missing, so that today’s rule still holds.
12. As a customer with both a set and a cake in one request, I want only the set line to skip design, so that the cake line still collects its design.
13. As a customer editing a set line from the summary, I want to start again at the category and skip design on the way back, so that editing matches the first pass.
14. As a customer editing a cake line, I want Back from the summary to return to design, so that I can change the photo and notes.
15. As a baker reading the saved request, I want a set line without a flavor note, design notes, inscription, photos, or addons, so that I am not shown empty design the customer never filled.
16. As a baker, I want a cake or combo line to still carry its design notes and photos, so that those orders are unchanged.
17. As a customer, I want the step list to keep Date, Category, Details, Design, and the summary, so that a cake in the same visit still has a design stop.
18. As a customer on a set line, I want the progress to jump over Design without treating it as a step I must complete.

## Implementation Decisions

- A set category is the category whose type is set. A combo is not a set category for this skip. A category with no type stays on the cake path.
- The flavor-note control is hidden only for the active set line. Allergies stay on that step and stay required.
- Next from details for a set line opens the summary. Back from the summary for a set line opens details. Cake and combo keep the design step between them.
- When a line is a set category, leaving details clears any leftover flavor note, design notes, text on the cake, reference images, and addons for that line.
- The public custom-order request accepts a missing design note and a missing reference-image list only when that line’s category is a set category in the catalog. The server decides from the catalog, not from a flag the browser can invent. Cake and combo lines keep the current minimum of one image and a non-empty design note.
- The wizard and the public request share that rule so a skipped design step can still be submitted.

## Testing Decisions

- A good check is the customer’s path and the saved request, not the class names. A set category reaches the summary with no flavor-note question and is accepted without photos or design notes. A cake category is still refused without them.
- There is no project test runner. The check is `npx tsc --noEmit`, one set request, and one cake request.
- The storefront can be opened without the admin Google sign-in.

## Out of Scope

- Changing how a set, its piece count, or its flavor limit is chosen.
- Skipping design for a combo or for a cake.
- Removing the Design label from the step list for every request.
- Admin quoting, conversion, and receipts.

## Further Notes

- One ticket. The skip and the looser save rule land together. Shipping only the skip leaves a request the server rejects.
