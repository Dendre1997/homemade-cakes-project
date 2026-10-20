# 02: Shared BakeryMonthGrid for single-date assignment

**What to build:** On order detail Workflow, **pending confirmation** and **assign all to one date** edit modes use **BakeryMonthGrid** (and Schedule-consistent sheet/motion where the flow uses a modal/sheet) instead of the legacy assignment calendar UI. Selected day is tracked and shown using **bakery date keys** (America/Edmonton). Saving delivery dates uses the **existing PUT order API** and request shape; capacity and blocked-date rules behave as before. Split-across-dates mode may still use the old picker until ticket 03.

**Blocked by:** 01: Order detail Tools drawer and layout cleanup

**Status:** ready-for-agent

- [ ] Pending confirmation: pick date on shared grid, confirm assigns via existing handler
- [ ] Edit mode “single date”: same grid, save via existing handler
- [ ] Labels for selected/target dates use Edmonton formatting helpers
- [ ] Lead time and blocked dates still prevent or warn as today
- [ ] Capacity confirmation dialog still appears when over capacity
- [ ] `npx tsc --noEmit` clean
