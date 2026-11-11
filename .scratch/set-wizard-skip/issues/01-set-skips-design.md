# 01: Set category skips design

**What to build:** A customer who picks a set category does not see the flavor-note question or its field. Next on details opens the request summary, and Back from the summary returns to details. The set line is saved without a flavor note, design notes, text on the cake, photos, or addons. A cake line and a combo line still ask for the flavor note, still pass through design, and are still refused without a photo and design notes. Allergies stay on the details step for every category.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] A set category hides the flavor-note yes-or-no question and the note field
- [x] Next from details for a set category opens the summary, and Back from the summary returns to details
- [x] A set line submits without design notes, text on the cake, reference images, or addons
- [x] Switching a line to a set category clears a leftover flavor note and leftover design details
- [x] A cake or combo line still requires the flavor-note step, the design step, a photo, and design notes
- [x] Allergies stay required on the details step
- [x] The server accepts the missing design fields only when the line’s category is a set category in the catalog

`npx tsc --noEmit` passed. On the storefront, Cupcakes (a set) skipped the flavor note and Design and opened the summary; Back returned to details. Cakes still showed the flavor note, opened Design, and stayed there without a photo and design notes. A live request was not submitted.

**Notes:**
- Combo keeps the design step because that line includes a small cake.
- The step list still shows Design. A set line jumps over it.
