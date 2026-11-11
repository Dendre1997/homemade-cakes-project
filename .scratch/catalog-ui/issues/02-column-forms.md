# 02: Column forms for catalog sections

**What to build:** The baker creates or edits a category, collection, flavor, diameter, set, shape, or allergen in the same column as today. The form sits on a glass surface. Fields are `h-11` on a phone and `h-10` on a wide screen, with `rounded-xl`. On a phone, Save and Cancel stick to the bottom, under the sidebar and clear of the home gesture. On a wide screen, Save stays at the end of the form. The record that gets saved is the same record as today.

**Blocked by:** 01: Catalog hub and list shell

**Status:** done

- [x] Each of those seven forms uses the glass surface and the shared field height and radius
- [x] On a phone, Save and Cancel are in one bottom bar that does not cover the sidebar and clears the safe area
- [x] On a wide screen, Save stays at the end of the form
- [x] Move controls in a category's flavor order are about 44px
- [x] Create, update, cancel, and validation still submit the same data as today
- [x] The unfinished flavor route is left as it is

**Notes:**
- The addon form is a separate ticket because of variants and photos.
- Cancel stays available only while editing, which is when Cancel Edit existed before. Create still submits the same payload.
- `npx tsc --noEmit` passed. The admin catalog needs Google sign-in, so these forms were not opened in the browser.
