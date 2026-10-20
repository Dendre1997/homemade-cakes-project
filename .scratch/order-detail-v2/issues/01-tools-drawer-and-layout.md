# 01: Order detail Tools drawer and layout cleanup

**What to build:** On order detail, the baker opens **Tools** from the sticky header (KPI strip unchanged). On mobile, Tools is a **bottom sheet**; on desktop, a **right drawer**. Tools contains Print production sheet, Preview receipt, Copy payment link (when unpaid), and Mark as paid (when unpaid). The header no longer shows Print/Pay link buttons. The sidebar on large screens shows only **Customer** and **Workflow**; payment/documents glass cards are removed from the aside (payment state remains in KPI). Mobile bottom bar still offers Mark as paid + Status + Save.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Tools opens/closes from header; no duplicate Print/Pay/Receipt/Mark-paid buttons in header or old sidebar cards
- [ ] Desktop: right drawer; mobile: bottom sheet; left admin nav unaffected
- [ ] KPI strip still shows total, items, next pickup (Edmonton), payment summary
- [ ] Aside on lg+ contains Customer + Workflow only
- [ ] Mobile sticky bar unchanged for Mark paid + Status
- [ ] Manual QA on real order: paid and unpaid paths
