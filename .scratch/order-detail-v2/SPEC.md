# Order detail v2 — Tools drawer + shared assignment calendar

## Problem Statement

Bakers manage a single order on `/bakery-manufacturing-orders/orders/[id]` while often on a phone. The v1 redesign improved glass layout, but **actions are scattered** (header, sidebar cards, mobile bar), and **date assignment** still uses a legacy calendar (`OrderAssignmentDatePicker`) that does not match the Edmonton-first **BakeryMonthGrid** used on Schedule and Orders list. That inconsistency makes the page feel less professional and increases confusion between calendar date numbers and operational metrics.

## Solution

Introduce a **Tools** surface: on mobile a **bottom sheet**, on desktop a **right-side drawer**, opened from the sticky header (KPI strip stays; Print/Pay/Receipt/Mark-paid move out of the header and out of duplicate sidebar cards). Keep **Workflow** (status, source, edit/confirm dates) and **Customer** in the right column on large screens; main column holds line items and pickup schedule.

In a **second delivery**, replace the assignment date picker UI with **BakeryMonthGrid** and the same motion/sheet patterns as Schedule, while **displaying and tracking selection via bakery date keys** (America/Edmonton). **Persist delivery dates through existing order update APIs** without changing capacity math or request body shapes unless already required by the backend.

## User Stories

1. As a baker on mobile, I want one **Tools** entry point, so that I am not hunting for Print, Pay link, or Receipt in multiple places.
2. As a baker, I want the sticky header to show **order identity and KPIs** only, so that the top of the page stays scannable.
3. As a baker, I want **Mark as paid** and **Status** on the mobile bottom bar, so that the most frequent actions stay one tap away without opening Tools.
4. As a baker, I want **Print production sheet** inside Tools, so that kitchen output is grouped with other share actions.
5. As a baker, I want **Copy payment link** inside Tools when unpaid, so that I can message the customer quickly.
6. As a baker, I want **Preview receipt** inside Tools, so that customer-facing documents live with other outbound actions.
7. As a baker on desktop, I want Tools in a **right drawer**, so that it does not fight the left admin navigation overlay.
8. As a baker on mobile, I want Tools as a **bottom sheet**, so that it feels native and reachable with one thumb.
9. As a baker, I want **Customer** and **Workflow** visible in the sidebar on desktop, so that contact and status/date work stay in the main reading flow.
10. As a baker confirming a **pending confirmation** order, I want to pick a delivery day on the **same month grid** as Schedule, so that I trust the date I assign.
11. As a baker editing dates, I want **assign all to one day** using that shared grid, so that behavior matches the rest of admin.
12. As a baker splitting an order across days, I want split allocation to remain possible with the new grid, so that multi-day orders are not regressed.
13. As a baker, I want selected and displayed dates labeled in **Edmonton**, so that pickup days match Orders list and Schedule.
14. As a baker, I want blocked/lead-time days respected as today, so that I cannot accidentally assign to invalid days without the same warnings as before.
15. As a baker, I want capacity warnings before save when exceeding available minutes, so that risky assignments stay explicit.
16. As a baker, I want line items and pickup schedule unchanged in the main column, so that production detail stays primary.
17. As a baker, I want internal notes full-width below the grid, so that long note threads remain readable.
18. As a developer, I want Tools logic in a **small dedicated module**, so that the order detail page does not grow further.
19. As a developer, I want assignment UI to **reuse BakeryMonthGrid**, so that calendar behavior is maintained in one place.
20. As a developer, I want date selection state as **YYYY-MM-DD keys** at the UI boundary, converting to `Date` only at existing save boundaries, so that timezone drift is reduced without an API migration.

## Implementation Decisions

- **Tools panel component** owns: open/close state, responsive variant (bottom sheet vs right drawer), and action callbacks passed from the page (mark paid, copy link, open receipt modal, navigate/open print). It does not own order fetch or mutation logic.
- **Header** retains: back link, order short id, status chip, Edmonton pickup subtitle when known, KPI strip (total, items, next pickup, payment). Adds single **Tools** control. Removes Print and Pay link from header.
- **Sidebar (lg+)** retains: Customer card, Workflow card (status, source, date edit/confirm). Removes standalone Payment and Documents glass cards; payment **status** remains visible via KPI and optionally a read-only one-line in Tools or KPI (not duplicate buttons).
- **Mobile bottom bar** unchanged in intent: Mark as paid (if unpaid) + status select + Save. Tools sheet is additive, not a replacement for the bar.
- **Assignment calendar replacement (phase 2)** wraps or replaces `OrderAssignmentDatePicker` presentation with `BakeryMonthGrid` plus existing capacity/blocked/lead-time inputs from availability payload. Selection state exposed to parent as **date key** internally; parent handlers continue to build PUT bodies as today.
- **Split mode**: keep allocate-to-day behavior; popover/sheet for item allocation may remain Radix popover or move to a small sheet—must not regress unallocated-item gating before save.
- **Pending confirmation** flow uses the same grid component as edit-single; confirm button and cancel-order paths unchanged at API level.
- **Framer Motion / sheet patterns** align with `ScheduleDayEditor` and `OrdersDayPreviewSheet` for consistency (spring, safe area, swipe dismiss on mobile where appropriate).
- **Admin left sidebar** stays as-is; Tools must **not** slide from the left to avoid collision with nav.

## Testing Decisions

- Prefer **behavior at seams**: pure helpers for date-key formatting and earliest pickup already exist; add or extend unit tests only if helpers gain new selection logic (e.g. key ↔ Date at save boundary).
- **No snapshot testing** of full drawer UI unless the repo already uses that pattern for admin components.
- **Manual QA matrix** (required per ticket): mobile + desktop; unpaid vs paid; pending confirmation vs confirmed; edit single date; split dates; Tools open/close without losing workflow state.
- Prior art: `orderCalendarStats` / `bakeryCalendar` tests if present; otherwise follow existing admin page manual test habits from Schedule/Orders v2.

## Out of Scope

- Changing MongoDB order schema or new API routes for assignment.
- Replacing capacity calculation or manufacturing time math in the client.
- Kitchen checklist / per-item “decor done” toggles on line items.
- Moving Workflow (status, dates) into Tools drawer.
- Left-side Tools drawer.
- Copilot / AI actions on order detail.
- Email send via Resend from Tools (still draft/copy/deep link only per architecture rules).

## Further Notes

- Deliver as **two PRs** (ticket 1 then ticket 2) per grill Q7-B.
- v1 order detail shell (`OrderDetailShell`, header, mobile bar) is the baseline; this spec **refactors** placement of tools, not a greenfield page.
- Phase 2 ticket should delete or thin `OrderAssignmentDatePicker` once parity is verified—avoid two calendar implementations long term.
