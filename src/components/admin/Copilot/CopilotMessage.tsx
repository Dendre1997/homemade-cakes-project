"use client";

import { useState } from "react";
import { CalendarRange, Loader2, MailCheck, SearchX, TriangleAlert } from "lucide-react";
import type { ChatAddToolApproveResponseFunction } from "ai";
import type {
  CustomRequestHit,
  OrderSearchHit,
  SendMessageRequest,
} from "@/lib/ai/uiMessage";
import type { DraftKind } from "./composeAnswer";
import {
  VISIBLE_CARD_CAP,
  groupSearchHits,
  type AssistantBlock,
  type ClientGroup,
  type StatusLine,
  type ThreadPlan,
} from "./composeAnswer";
import CustomRequestCard from "./CustomRequestCard";
import DailyBriefCard from "./DailyBriefCard";
import OrderSummaryCard from "./OrderSummaryCard";
import RecipeScaleCard from "./cards/RecipeScaleCard";
import CalendarApprovalCard from "./cards/CalendarApprovalCard";
import CalendarCard from "./cards/CalendarCard";
import DraftMessageCard from "./cards/DraftMessageCard";
import SendMessageApprovalCard from "./cards/SendMessageApprovalCard";
import CustomerCard from "./cards/CustomerCard";

type ToolApprovalResponder = ChatAddToolApproveResponseFunction;

function ToolCallSkeleton({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-sm rounded-medium border border-border bg-card-background px-md py-sm font-body text-small text-primary/60">
      <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
      {label}
    </div>
  );
}

export function CopilotWorkingRow() {
  return <ToolCallSkeleton label="Working…" />;
}

function StatusBlock({ status }: { status: StatusLine }) {
  if (status.mode === "skeleton") return <ToolCallSkeleton label={status.label} />;
  if (status.mode === "note") {
    return (
      <div className="flex items-center gap-sm px-md font-body text-small text-primary/50">
        <CalendarRange className="h-3.5 w-3.5 text-accent" />
        {status.label}
      </div>
    );
  }
  return (
    <div className="rounded-medium border border-error/40 bg-error/10 px-md py-sm font-body text-small text-error">
      <p className="inline-flex items-center gap-sm">
        <TriangleAlert className="h-3.5 w-3.5" />
        {status.lead}
      </p>
      {status.detail && <p className="mt-xs text-error/80">{status.detail}</p>}
    </div>
  );
}

function QuietNote({ text, detail }: { text: string; detail?: string }) {
  return (
    <p className="px-md font-body text-small text-primary/70">
      {text}
      {detail && <span className="mt-xs block text-primary/50">{detail}</span>}
    </p>
  );
}

function SendLine({
  block,
}: {
  block: Extract<AssistantBlock, { kind: "send-line" }>;
}) {
  if (block.tone === "sent") {
    return (
      <p className="flex items-start gap-sm px-md font-body text-small text-primary/80">
        <MailCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
        <span className="min-w-0 break-words">
          Email sent to {block.recipientEmail} · {block.subject}
        </span>
      </p>
    );
  }

  if (block.tone === "denied") {
    return (
      <QuietNote
        text={
          block.recipientEmail
            ? `Email not sent to ${block.recipientEmail}.`
            : "Email not sent."
        }
      />
    );
  }

  if (block.tone === "expired") {
    return <QuietNote text="Approval expired — nothing was sent." />;
  }

  return (
    <div className="px-md font-body text-small text-primary/80">
      <p>The email didn&apos;t send.</p>
      {block.detail && <p className="mt-xs text-primary/60">{block.detail}</p>}
    </div>
  );
}

type FlatHit =
  | {
      kind: "order";
      key: string;
      groupKey: string;
      groupName: string;
      nested: boolean;
      order: OrderSearchHit;
    }
  | {
      kind: "request";
      key: string;
      groupKey: string;
      groupName: string;
      nested: boolean;
      request: CustomRequestHit;
    };

function flattenGroups(groups: ClientGroup[]): FlatHit[] {
  const items: FlatHit[] = [];
  for (const group of groups) {
    const nested = group.orders.length + group.requests.length > 1;
    for (const order of group.orders) {
      items.push({
        kind: "order",
        key: `order:${order._id}`,
        groupKey: group.key,
        groupName: group.name,
        nested,
        order,
      });
    }
    for (const request of group.requests) {
      items.push({
        kind: "request",
        key: `request:${request._id}`,
        groupKey: group.key,
        groupName: group.name,
        nested,
        request,
      });
    }
  }
  return items;
}

function SearchResultList({
  block,
  busy,
  onDraftMessage,
}: {
  block: Extract<AssistantBlock, { kind: "search" }>;
  busy: boolean;
  onDraftMessage?: (kind: DraftKind, shortId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const flat = flattenGroups(groupSearchHits(block.orders, block.customOrders));
  const visible = expanded ? flat : flat.slice(0, VISIBLE_CARD_CAP);
  const hidden = flat.length - visible.length;

  const runs: Array<{ key: string; name: string; nested: boolean; items: FlatHit[] }> =
    [];
  for (const item of visible) {
    const last = runs[runs.length - 1];
    if (item.nested && last && last.key === item.groupKey) {
      last.items.push(item);
    } else {
      runs.push({
        key: item.nested ? item.groupKey : item.key,
        name: item.groupName,
        nested: item.nested,
        items: [item],
      });
    }
  }

  return (
    <div className="space-y-sm">
      <p className="px-md font-body text-small text-primary/60">{block.header}</p>
      {runs.map((run) =>
        run.nested ? (
          <div
            key={run.key}
            className="space-y-xs rounded-medium border border-border bg-card-background p-sm"
          >
            <p className="px-xs font-body text-body text-primary">{run.name}</p>
            {run.items.map((item) => (
              <HitCard
                key={item.key}
                item={item}
                nested
                busy={busy}
                onDraftMessage={onDraftMessage}
              />
            ))}
          </div>
        ) : (
          <HitCard
            key={run.key}
            item={run.items[0]}
            nested={false}
            busy={busy}
            onDraftMessage={onDraftMessage}
          />
        )
      )}
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="px-md font-body text-small text-accent"
        >
          Show the rest
        </button>
      )}
      {block.truncated && (
        <p className="px-md font-body text-small text-primary/50">
          More results exist — narrow the search to see them.
        </p>
      )}
    </div>
  );
}

function HitCard({
  item,
  nested,
  busy,
  onDraftMessage,
}: {
  item: FlatHit;
  nested: boolean;
  busy: boolean;
  onDraftMessage?: (kind: DraftKind, shortId: string) => void;
}) {
  if (item.kind === "order") {
    const shortId = item.order.shortId;
    return (
      <OrderSummaryCard
        order={item.order}
        hideName={nested}
        nested={nested}
        draftDisabled={busy}
        onDraft={
          onDraftMessage && shortId
            ? () =>
                onDraftMessage(item.order.isPaid ? "update" : "payment", shortId)
            : undefined
        }
      />
    );
  }

  const shortId = item.request.shortId;
  return (
    <CustomRequestCard
      request={item.request}
      hideName={nested}
      nested={nested}
      draftDisabled={busy}
      onDraft={
        onDraftMessage && shortId
          ? () =>
              onDraftMessage(
                item.request.status === "pending_review" ? "quote" : "update",
                shortId
              )
          : undefined
      }
    />
  );
}

function ManageCalendarApprovalPart({
  part,
  addToolApprovalResponse,
}: {
  part: Extract<AssistantBlock, { kind: "calendar-approval" }>["part"];
  addToolApprovalResponse?: ToolApprovalResponder;
}) {
  const [isResponding, setIsResponding] = useState(false);

  const respond = async (approved: boolean) => {
    if (!addToolApprovalResponse || isResponding) return;
    setIsResponding(true);
    try {
      await addToolApprovalResponse({ id: part.approval.id, approved });
    } finally {
      setIsResponding(false);
    }
  };

  return (
    <CalendarApprovalCard
      action={part.input.action}
      dates={part.input.dates}
      reason={part.input.reason}
      workMinutes={part.input.workMinutes}
      availableHours={part.input.availableHours}
      isResponding={isResponding}
      onApprove={() => respond(true)}
      onDeny={() => respond(false)}
    />
  );
}

function SendCustomerMessageApprovalPart({
  part,
  compact,
  addToolApprovalResponse,
}: {
  part: Extract<AssistantBlock, { kind: "send-approval" }>["part"];
  compact: boolean;
  addToolApprovalResponse?: ToolApprovalResponder;
}) {
  const [isResponding, setIsResponding] = useState(false);

  const respond = async (approved: boolean) => {
    if (!addToolApprovalResponse || isResponding) return;
    setIsResponding(true);
    try {
      await addToolApprovalResponse({ id: part.approval.id, approved });
    } finally {
      setIsResponding(false);
    }
  };

  return (
    <SendMessageApprovalCard
      recipientEmail={part.input.recipientEmail}
      subject={part.input.subject}
      bodyText={part.input.bodyText}
      actionButton={part.input.actionButton}
      compact={compact}
      isResponding={isResponding}
      onApprove={() => respond(true)}
      onDeny={() => respond(false)}
    />
  );
}

function BlockView({
  block,
  busy,
  onSendEmail,
  onDraftMessage,
  addToolApprovalResponse,
}: {
  block: AssistantBlock;
  busy: boolean;
  onSendEmail?: (request: SendMessageRequest) => void;
  onDraftMessage?: (kind: DraftKind, shortId: string) => void;
  addToolApprovalResponse?: ToolApprovalResponder;
}) {
  switch (block.kind) {
    case "search":
      return (
        <SearchResultList
          block={block}
          busy={busy}
          onDraftMessage={onDraftMessage}
        />
      );
    case "search-empty":
      return (
        <div className="flex items-center gap-sm rounded-medium border border-dashed border-border px-md py-sm font-body text-small text-primary/60">
          <SearchX className="h-3.5 w-3.5 shrink-0" />
          {block.message}
        </div>
      );
    case "already-shown":
      return <QuietNote text="Already on screen." />;
    case "brief":
      return <DailyBriefCard brief={block.brief} />;
    case "draft":
      return (
        <DraftMessageCard
          result={block.result}
          phase={block.phase}
          busy={busy}
          onSendEmail={onSendEmail}
        />
      );
    case "send-approval":
      return (
        <SendCustomerMessageApprovalPart
          part={block.part}
          compact={block.compact}
          addToolApprovalResponse={addToolApprovalResponse}
        />
      );
    case "send-line":
      return <SendLine block={block} />;
    case "calendar-approval":
      return (
        <ManageCalendarApprovalPart
          part={block.part}
          addToolApprovalResponse={addToolApprovalResponse}
        />
      );
    case "calendar":
      return <CalendarCard result={block.result} />;
    case "note":
      return <QuietNote text={block.text} detail={block.detail} />;
    case "recipe":
      return <RecipeScaleCard result={block.result} />;
    case "customer":
      return (
        <CustomerCard
          state={block.state}
          result={block.result}
          errorText={block.errorText}
        />
      );
    case "error":
      return (
        <div className="rounded-medium border border-error/40 bg-error/10 px-md py-sm font-body text-small text-error">
          <p className="inline-flex items-center gap-sm">
            <TriangleAlert className="h-3.5 w-3.5" />
            {block.lead}
          </p>
          {block.detail && <p className="mt-xs text-error/80">{block.detail}</p>}
        </div>
      );
    default:
      return null;
  }
}

export function CopilotMessage({
  plan,
  busy = false,
  addToolApprovalResponse,
  onSendEmail,
  onDraftMessage,
}: {
  plan: ThreadPlan;
  busy?: boolean;
  addToolApprovalResponse?: ToolApprovalResponder;
  onSendEmail?: (request: {
    orderId: string;
    orderType: "regular" | "custom";
    recipientEmail: string;
    subject: string;
    bodyText: string;
    actionButton?: { label: string; url: string };
  }) => void;
  onDraftMessage?: (kind: DraftKind, shortId: string) => void;
}) {
  if (plan.role === "user") {
    if (plan.hidden || !plan.text.trim()) return null;
    return (
      <div className="pl-xl">
        <div className="ml-auto w-fit max-w-[95%] whitespace-pre-wrap rounded-large bg-primary px-md py-sm font-body text-body text-text-on-primary">
          {plan.text}
        </div>
      </div>
    );
  }

  if (!plan.status && plan.blocks.length === 0 && !plan.headline) return null;

  return (
    <div className="space-y-sm pr-xs">
      {plan.status && <StatusBlock status={plan.status} />}
      {plan.blocks.map((block) => (
        <BlockView
          key={block.key}
          block={block}
          busy={busy}
          onSendEmail={onSendEmail}
          onDraftMessage={onDraftMessage}
          addToolApprovalResponse={addToolApprovalResponse}
        />
      ))}
      {plan.headline && (
        <p className="px-md font-body text-small leading-relaxed text-primary/80">
          {plan.headline}
        </p>
      )}
    </div>
  );
}

export default CopilotMessage;
