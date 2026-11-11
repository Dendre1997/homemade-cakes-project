# 02: Settings fields inside the sections

**What to build:** Inside each settings section, every field matches the catalog control height and radius. Each switch and its label are one tap target about 44px tall. Placeholders use a proper ellipsis. If the baker saves an invalid e-transfer email, Payment opens, the field is focused, and the existing validation message is shown. The saved payload stays the same.

**Blocked by:** 01: Settings accordion shell

**Status:** done

- [x] Inputs and text areas use the shared field height and `rounded-xl`
- [x] Each switch row is one target about 44px tall
- [x] Placeholders end with …
- [x] An invalid e-transfer email opens Payment, focuses the field, and shows the message that already blocks save
- [x] Create, update, and the request body behave as they do today

**Notes:**
- The email error is `eTransferEmail` on the form, the same Zod check that already blocked save.
- `npx tsc --noEmit` passed. The admin page needs Google sign-in, so the form was not opened in the browser.
