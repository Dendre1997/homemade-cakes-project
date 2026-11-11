# 01: Item editor sheet

**What to build:** The line-item editor opens as a full-width bottom sheet on a phone and a centered glass dialog on a wider screen. The title and close control stay put, the fields scroll, and the action row for the open mode stays at the bottom. Standard, combo, and custom fields sit in clear sections. Saving, stepping through a combo, and switching mode behave as they do today.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] On a phone the editor is a full-width bottom sheet; on a wider screen it is a centered glass dialog
- [x] Header and close control stay pinned and do not overlap
- [x] Fields scroll independently of the pinned action row
- [x] Standard pins total, Cancel, and Save Changes; combo pins the current step's buttons; custom pins Cancel and its submit button
- [x] Combo remains two steps, with sections inside each step
- [x] Long names stay inside the row on a narrow phone
- [x] Price, flavor selection, uploads, and save handlers are unchanged
- [x] The new-order set form and other dialogs are unchanged

**Notes:**
- The sheet classes override only this editor. The shared dialog stays centered, so the receipt dialog is unchanged.
- Each mode keeps its own buttons. On a combo that is not in custom mode, the standard total bar still sits under the combo actions, as it did before.
- `npx tsc --noEmit` passed with 0 errors.
- The production order page was not clicked in the browser: admin sign-in is Google and was not available in this session.
