# 01: Request card shows flavors once

**What to build:** On the custom request list, each line item shows its flavors once. A set lists each chosen flavor once, without a stray space before the comma. A combo lists the cake flavor and the treat flavors once. A tier cake lists each tier once and does not also print the flavor string. A line with no flavor shows one empty state. The request detail form and the production order line stay as they are.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] A set line on the request card shows each chosen flavor once
- [x] A combo line shows the cake flavor and the treat flavors once
- [x] A single-flavor cake shows that flavor once
- [x] A tier cake lists each tier once and does not repeat a flavor sentence under the tiers
- [x] A line with no flavor shows one empty state
- [x] The request detail form and the production order line are unchanged

`npx tsc --noEmit` passed. The request list needs the admin Google sign-in, so the card was not opened in the browser.

**Notes:**
- The duplicate is the shared tier display printing the saved flavor text when there are no tiers, plus the cleaned summary printed under it.
- Keep the cleaned summary for lines without tiers. Keep the tier list for tier cakes.
