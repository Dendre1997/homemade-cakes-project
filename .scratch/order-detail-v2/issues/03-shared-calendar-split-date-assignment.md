# 03: Shared calendar for split-date item allocation

**What to build:** **Split across dates** edit mode uses the shared month grid and Edmonton date keys for choosing allocation days. Item allocation popover/sheet still allows assigning unallocated units to the chosen day; save remains gated until all items allocated. Saving uses existing split-date PUT path. Legacy `OrderAssignmentDatePicker` is removed or reduced to a thin adapter with no duplicate calendar implementation left in the codebase.

**Blocked by:** 02: Shared BakeryMonthGrid for single-date assignment

**Status:** ready-for-agent

- [ ] Split mode: select day on shared grid, allocate items, unallocate, save split dates
- [ ] Cannot save while items remain unallocated
- [ ] Capacity warnings on split save path preserved
- [ ] No remaining standalone legacy assignment calendar UI in admin order flow
- [ ] Manual QA: multi-item order across two delivery dates
