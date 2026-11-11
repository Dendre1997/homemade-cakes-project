# Settings page disclosure

## Problem Statement

The baker opens Global Settings and sees every field at once: bakery status, delivery, pickup, support chat, and payment. On a phone that is a long wall of inputs. The page also adds its own side padding inside the admin frame, and Save is fixed across the whole viewport, including the docked sidebar.

## Solution

The same four groups become glass accordion cards. Each collapsed header shows the live status in one or two pills. Bakery Status starts open. The others start closed. Several can be open at once. Save sits in the page flow at the bottom and stays disabled until something has changed. The saved payload is the same payload as today.

## User Stories

1. As a baker, I want Global Settings to sit in the admin frame without a second side padding, so that it lines up with the catalog.
2. As a baker, I want four glass sections, so that the page matches orders and the catalog.
3. As a baker, I want Bakery Status open when I arrive, and the other sections closed, so that I am not hit with every field.
4. As a baker, I want to open more than one section, so that I can compare delivery and pickup.
5. As a baker, I want each header to be a button I can tap or use from the keyboard, so that opening a section is obvious.
6. As a baker, I want a chevron that shows whether a section is open.
7. As a baker, I want Bakery Status to say Accepting orders or Paused, so that I can see the mode without opening it.
8. As a baker, I want Logistics to say whether delivery is on, with the fee when it is on, and whether pickup is on.
9. As a baker, I want Support to say Chat on or Chat off.
10. As a baker, I want Payment to show the e-transfer email, cut off if it is long, or No e-transfer email.
11. As a baker, I want collapsed fields to keep what I typed, so that closing a section does not wipe the form.
12. As a baker, I want the vacation message to appear only when the bakery is paused, as it does today.
13. As a baker, I want delivery and pickup fields to stay visible inside Logistics even when those switches are off, as they do today.
14. As a baker, I want one Save at the bottom of the page, full width on a phone, so that it does not cover the fields or the sidebar.
15. As a baker, I want Save disabled until I change something, and to show Saving Changes… while the request runs.
16. As a baker, I want a successful save to clear the dirty state the same way it does today.
17. As a baker, I want a bad e-transfer email to keep blocking save, and in a later slice to see that message with Payment open.
18. As a baker, I want every field at the catalog control height in that later slice, with the switch and its label as one tap target.

## Implementation Decisions

- One form, one `PUT /api/admin/settings`, and the same payload builder. `isDirty` still disables Save.
- Open state is local to the visit. It is not written into the URL.
- Collapsed panels stay mounted so the form library keeps the values.
- The first slice is the shell: accordion, pills, padding, and the in-flow save. The second slice is field height, switch hit area, placeholder ellipsis, and the email error that already exists.
- Glass matches the catalog: `rounded-2xl`, `border-primary/15`, `bg-background/20`, backdrop blur.

## Testing Decisions

- A good check is that the saved request body matches today's payload and that Save stays disabled until the form is dirty. It does not assert class names.
- There is no project test runner. Each slice uses `npx tsc --noEmit` and one manual save.
- The admin panel needs Google sign-in, so a browser pass may stop at login.

## Out of Scope

- New settings, new validation rules, or a different save endpoint.
- Per-section save.
- Recipes, catalog, and orders.

## Further Notes

- Two tickets: the shell, then the fields inside the sections.
