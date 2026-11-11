# 01: Addon catalog quantity settings

**What to build:** An admin can turn on “allow the client to choose a quantity” for an addon and set the maximum they may pick. Turning it off leaves the addon as a single choice and does not keep a maximum. Existing addons open as off. The saved-addon snapshot type may carry an optional quantity, and a missing quantity means one, so older orders stay valid.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Creating an addon can save the quantity toggle and, only when it is on, a whole-number maximum of at least 1
- [ ] Editing an addon shows the saved toggle and maximum, and turning the toggle off removes the maximum
- [ ] An addon saved before this change still opens and saves with the toggle off
- [ ] The selected-addon snapshot accepts an optional quantity; absence means one
