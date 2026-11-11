# 01: Settings accordion shell

**What to build:** The baker opens Global Settings and sees four glass sections instead of a wall of fields. Bakery Status is open. Logistics, Support, and Payment are closed, and each header shows the live status in pills. Several sections can be open. Closing one does not lose what was typed. Save sits at the bottom of the page, full width on a phone, and stays disabled until something changes. The saved settings are the same settings as today.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] The page no longer adds a second side padding inside the admin frame
- [x] The four sections are glass accordions with a button header, a chevron, and live summary pills
- [x] Bakery Status starts open and the other three start closed; more than one can be open
- [x] Collapsed fields stay registered, so values survive closing a section
- [x] Save is in the page flow, full width on a phone, disabled until the form is dirty, and shows Saving Changes… while saving
- [x] The save request body is unchanged

**Notes:**
- Field heights, switch hit area, and the visible email error are the next ticket.
- Collapsed panels use the `hidden` attribute so the fields stay mounted.
- `npx tsc --noEmit` passed. The admin page needs Google sign-in, so it was not opened in the browser.
