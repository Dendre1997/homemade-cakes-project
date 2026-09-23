import type {
  BakerUIMessage,
  CustomRequestHit,
  CustomerHistoryToolResult,
  DailyBrief,
  DraftMessageToolResult,
  ManageCalendarToolResult,
  OrderSearchHit,
  ScaleRecipeToolResult,
} from "@/lib/ai/uiMessage";
import { normalizeEmail, normalizePhoneDigits } from "@/lib/crm/normalize";

/**
 * Turns one assistant message into a single answer: a quiet status line,
 * one primary artifact, and a short headline. Duplicate tool parts and
 * entities already shown earlier in the thread are left out.
 */

export const VISIBLE_CARD_CAP = 5;

export type DraftKind = "payment" | "quote" | "update";
export type CopilotLanguage = "uk" | "en";
export type DraftSendPhase = "idle" | "pending" | "denied" | "failed" | "expired";

type Part = BakerUIMessage["parts"][number];

export type SendApprovalPart = Extract<
  Part,
  { type: "tool-sendCustomerMessage"; state: "approval-requested" }
>;

export type CalendarApprovalPart = Extract<
  Part,
  { type: "tool-manageCalendar"; state: "approval-requested" }
>;

export type StatusLine =
  | { mode: "skeleton"; label: string }
  | { mode: "note"; label: string }
  | { mode: "error"; lead: string; detail?: string };

export type AssistantBlock =
  | {
      kind: "search";
      key: string;
      orders: OrderSearchHit[];
      customOrders: CustomRequestHit[];
      header: string;
      truncated: boolean;
    }
  | { kind: "search-empty"; key: string; message: string }
  | {
      kind: "already-shown";
      key: string;
      orders: OrderSearchHit[];
      customOrders: CustomRequestHit[];
    }
  | { kind: "brief"; key: string; brief: DailyBrief }
  | {
      kind: "draft";
      key: string;
      result: DraftMessageToolResult;
      phase: DraftSendPhase;
    }
  | { kind: "send-approval"; key: string; part: SendApprovalPart; compact: boolean }
  | {
      kind: "send-line";
      key: string;
      tone: "sent" | "denied" | "failed" | "expired";
      recipientEmail: string;
      subject: string;
      detail?: string;
    }
  | { kind: "calendar-approval"; key: string; part: CalendarApprovalPart }
  | { kind: "calendar"; key: string; result: ManageCalendarToolResult }
  | { kind: "note"; key: string; text: string; detail?: string }
  | { kind: "recipe"; key: string; result: ScaleRecipeToolResult }
  | {
      kind: "customer";
      key: string;
      state:
        | "input-streaming"
        | "input-available"
        | "output-available"
        | "output-error";
      result?: CustomerHistoryToolResult;
      errorText?: string;
    }
  | { kind: "error"; key: string; lead: string; detail?: string };

export type ThreadPlan =
  | { role: "user"; text: string; hidden: boolean }
  | {
      role: "assistant";
      status: StatusLine | null;
      blocks: AssistantBlock[];
      headline: string | null;
      revealedEntityIds: string[];
    };

export interface ClientGroup {
  key: string;
  name: string;
  orders: OrderSearchHit[];
  requests: CustomRequestHit[];
}

const DATA_TOOLS = [
  "tool-manageCalendar",
  "tool-scaleRecipe",
  "tool-getCustomerHistory",
  "tool-getDailyBrief",
  "tool-findOrders",
] as const;

type DataTool = (typeof DATA_TOOLS)[number];

interface PlanContext {
  expiredApprovalIds: ReadonlySet<string>;
  collapseDraftTo?: { recipientEmail: string; subject: string };
  omitSend: boolean;
  draftPhase: DraftSendPhase;
  compactSend: boolean;
}

interface DraftHit {
  orderId: string;
  subject: string;
  bodyText: string;
}

interface SendHit {
  orderId: string;
  recipientEmail: string;
  subject: string;
  state: string;
  approvalId?: string;
  success?: boolean;
  failureMessage?: string;
}

interface HeadlineFacts {
  names: string[];
  shortIds: string[];
  amounts: string[];
  itemNames: string[];
  snippets: string[];
}

export function formatBakeryDate(dateKey: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return dateKey;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${dateKey}T00:00:00.000Z`));
}

export function conversationLanguage(
  messages: BakerUIMessage[]
): CopilotLanguage {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== "user") continue;
    const text = textOf(message);
    if (!text) continue;
    return /[А-Яа-яІіЇїЄєҐґ]/.test(text) ? "uk" : "en";
  }
  return "en";
}

/** Short user intent for the card action. Starts with Draft / Склади so the route can lock the turn to draftMessage. */
export function draftIntent(
  kind: DraftKind,
  shortId: string,
  language: CopilotLanguage
): string {
  const code = `#${shortId.replace(/^#/, "")}`;
  if (language === "uk") {
    if (kind === "payment") return `Склади нагадування про оплату для ${code}`;
    if (kind === "quote") return `Склади відповідь із ціною для ${code}`;
    return `Склади повідомлення для ${code}`;
  }
  if (kind === "payment") return `Draft a payment reminder for ${code}`;
  if (kind === "quote") return `Draft a quote reply for ${code}`;
  return `Draft an update for ${code}`;
}

export function isDraftTurnText(text: string): boolean {
  return /^(draft|склади)\b/i.test(text.trim());
}

export function pendingApprovalIds(messages: BakerUIMessage[]): string[] {
  const ids: string[] = [];
  for (const message of messages) {
    if (message.role !== "assistant") continue;
    for (const part of message.parts) {
      if (
        (part.type === "tool-sendCustomerMessage" ||
          part.type === "tool-manageCalendar") &&
        part.state === "approval-requested"
      ) {
        ids.push(part.approval.id);
      }
    }
  }
  return ids;
}

export function firstUsefulLine(raw?: string): string | undefined {
  if (!raw) return undefined;
  const line = raw
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .find((entry) => entry && !/^at\s+/.test(entry));
  return line?.replace(/^Error:\s*/, "");
}

export function presentClientError(raw?: string): {
  lead: string;
  detail?: string;
} {
  const detail = firstUsefulLine(raw);
  if (!detail || detail === "Something went wrong.") {
    return { lead: "Something went wrong." };
  }
  return { lead: "Something went wrong.", detail };
}

export function groupSearchHits(
  orders: OrderSearchHit[],
  requests: CustomRequestHit[]
): ClientGroup[] {
  const uniqueOrders = dedupeBy(orders, (order) => order._id);
  const uniqueRequests = dedupeBy(requests, (request) => request._id);

  type Node =
    | { kind: "order"; order: OrderSearchHit }
    | { kind: "request"; request: CustomRequestHit };

  const nodes: Node[] = [
    ...uniqueOrders.map((order) => ({ kind: "order" as const, order })),
    ...uniqueRequests.map((request) => ({ kind: "request" as const, request })),
  ];

  const unionFind = new UnionFind(nodes.length);
  const phoneBuckets = new Map<string, number>();
  const emailBuckets = new Map<string, number>();

  nodes.forEach((node, index) => {
    const contact = contactOf(node);
    const phone = phoneKey(contact.phone);
    const email = emailKey(contact.email);
    if (phone) linkBucket(unionFind, phoneBuckets, phone, index);
    if (email) linkBucket(unionFind, emailBuckets, email, index);
  });

  const orderIndexById = new Map<string, number>();
  nodes.forEach((node, index) => {
    if (node.kind === "order" && node.order._id) {
      orderIndexById.set(node.order._id, index);
    }
  });
  nodes.forEach((node, index) => {
    if (node.kind !== "request") return;
    const converted = convertedOrderId(node.request);
    if (!converted) return;
    const orderIndex = orderIndexById.get(converted);
    if (orderIndex !== undefined) unionFind.union(orderIndex, index);
  });

  const groups: ClientGroup[] = [];
  const byRoot = new Map<number, ClientGroup>();

  nodes.forEach((node, index) => {
    const root = unionFind.find(index);
    let group = byRoot.get(root);
    if (!group) {
      group = { key: "", name: "", orders: [], requests: [] };
      byRoot.set(root, group);
      groups.push(group);
    }
    if (node.kind === "order") group.orders.push(node.order);
    else group.requests.push(node.request);
  });

  for (const group of groups) {
    group.name =
      group.orders.map((order) => contactFields(order.customer).name).find(Boolean) ||
      group.requests.map((request) => contactFields(request.contact).name).find(Boolean) ||
      "No name";
    group.key = [
      ...group.orders.map((order) => order._id),
      ...group.requests.map((request) => request._id),
    ].join(":");
  }

  return groups;
}

export function buildThreadPlans(
  messages: BakerUIMessage[],
  expiredApprovalIds: ReadonlySet<string>
): ThreadPlan[] {
  const contexts = buildContexts(messages, expiredApprovalIds);
  const shown = new Set<string>();

  return messages.map((message, index) => {
    if (message.role === "user") return userPlan(message);

    const plan = assistantPlan(message, contexts[index], shown);
    for (const id of plan.revealedEntityIds) shown.add(id);
    return plan;
  });
}

function userPlan(message: BakerUIMessage): ThreadPlan {
  const text = textOf(message);
  return {
    role: "user",
    text,
    hidden: !text || isLegacySendDump(text),
  };
}

function assistantPlan(
  message: BakerUIMessage,
  ctx: PlanContext,
  priorEntityIds: ReadonlySet<string>
): Extract<ThreadPlan, { role: "assistant" }> {
  const parts = message.parts;
  const revealedEntityIds: string[] = [];
  const messaging = messagingBlocks(parts, ctx);
  const skipData =
    parts.some((part) => part.type === "tool-draftMessage") ||
    parts.some((part) => part.type === "tool-sendCustomerMessage");

  const blocks = skipData
    ? messaging
    : [...messaging, ...dataBlocks(parts, ctx, priorEntityIds, revealedEntityIds)];

  if (blocks.length === 0) {
    const dynamicError = lastDynamicError(parts);
    if (dynamicError) blocks.push(dynamicError);
  }

  const executing =
    ctx.omitSend ? undefined : lastExecuting(parts);
  const status: StatusLine | null = executing
    ? { mode: "skeleton", label: executingLabel(executing) }
    : blocks.length === 0
      ? idleStatus(parts)
      : null;

  const suppressHeadline = ctx.omitSend && blocks.length === 0;
  const headline =
    suppressHeadline || status?.mode === "skeleton"
      ? null
      : trimAssistantText(textOf(message), factsFrom(blocks), blocks.length > 0);

  return { role: "assistant", status, blocks, headline, revealedEntityIds };
}

function messagingBlocks(parts: Part[], ctx: PlanContext): AssistantBlock[] {
  const blocks: AssistantBlock[] = [];
  const draft = lastPart(parts, "tool-draftMessage");
  const send = lastPart(parts, "tool-sendCustomerMessage");

  if (
    ctx.collapseDraftTo &&
    draft?.state === "output-available" &&
    draft.output.found
  ) {
    blocks.push({
      kind: "send-line",
      key: `sent-${draft.toolCallId}`,
      tone: "sent",
      recipientEmail: ctx.collapseDraftTo.recipientEmail,
      subject: ctx.collapseDraftTo.subject,
    });
    return blocks;
  }

  if (draft?.state === "output-available") {
    blocks.push({
      kind: "draft",
      key: draft.toolCallId,
      result: draft.output,
      phase: ctx.draftPhase,
    });
  } else if (draft?.state === "output-error") {
    blocks.push({
      kind: "error",
      key: draft.toolCallId,
      lead: "The draft didn't finish.",
      detail: firstUsefulLine(draft.errorText),
    });
  }

  if (ctx.omitSend || !send) return blocks;

  if (send.state === "approval-requested") {
    if (ctx.expiredApprovalIds.has(send.approval.id)) {
      blocks.push({
        kind: "send-line",
        key: send.toolCallId,
        tone: "expired",
        recipientEmail: send.input.recipientEmail,
        subject: send.input.subject,
      });
    } else {
      blocks.push({
        kind: "send-approval",
        key: send.toolCallId,
        part: send,
        compact: ctx.compactSend,
      });
    }
    return blocks;
  }

  if (send.state === "output-denied") {
    blocks.push({
      kind: "send-line",
      key: send.toolCallId,
      tone: "denied",
      recipientEmail: send.input.recipientEmail,
      subject: send.input.subject,
    });
    return blocks;
  }

  if (send.state === "output-error") {
    blocks.push({
      kind: "send-line",
      key: send.toolCallId,
      tone: "failed",
      recipientEmail: send.input?.recipientEmail ?? "",
      subject: send.input?.subject ?? "",
      detail: firstUsefulLine(send.errorText),
    });
    return blocks;
  }

  if (send.state === "output-available") {
    if (send.output.success) {
      blocks.push({
        kind: "send-line",
        key: send.toolCallId,
        tone: "sent",
        recipientEmail: send.output.recipientEmail,
        subject: send.output.subject,
      });
    } else {
      blocks.push({
        kind: "send-line",
        key: send.toolCallId,
        tone: "failed",
        recipientEmail: send.input.recipientEmail,
        subject: send.input.subject,
        detail: send.output.message,
      });
    }
  }

  return blocks;
}

function dataBlocks(
  parts: Part[],
  ctx: PlanContext,
  priorEntityIds: ReadonlySet<string>,
  revealedEntityIds: string[]
): AssistantBlock[] {
  const part = pickDataPart(parts);
  if (!part) return [];

  switch (part.type) {
    case "tool-getDailyBrief":
      return briefBlocks(part);
    case "tool-getCustomerHistory":
      return customerBlocks(part);
    case "tool-findOrders":
      return searchBlocks(part, priorEntityIds, revealedEntityIds);
    case "tool-scaleRecipe":
      return recipeBlocks(part);
    case "tool-manageCalendar":
      return calendarBlocks(part, ctx.expiredApprovalIds);
    default:
      return [];
  }
}

function pickDataPart(parts: Part[]): Extract<Part, { type: DataTool }> | undefined {
  for (const type of DATA_TOOLS) {
    const part = lastPart(parts, type);
    if (part) return part;
  }
  return undefined;
}

function customerBlocks(
  part: Extract<Part, { type: "tool-getCustomerHistory" }>
): AssistantBlock[] {
  if (part.state === "output-available") {
    return [
      {
        kind: "customer",
        key: part.toolCallId,
        state: "output-available",
        result: part.output,
      },
    ];
  }
  if (part.state === "output-error") {
    return [
      {
        kind: "customer",
        key: part.toolCallId,
        state: "output-error",
        errorText: part.errorText,
      },
    ];
  }
  if (
    part.state === "input-streaming" ||
    part.state === "input-available"
  ) {
    return [
      {
        kind: "customer",
        key: part.toolCallId,
        state: part.state,
      },
    ];
  }
  return [];
}

function briefBlocks(
  part: Extract<Part, { type: "tool-getDailyBrief" }>
): AssistantBlock[] {
  if (part.state === "output-available") {
    return [{ kind: "brief", key: part.toolCallId, brief: part.output }];
  }
  if (part.state === "output-error") {
    return [
      {
        kind: "error",
        key: part.toolCallId,
        lead: "The daily brief didn't load.",
        detail: firstUsefulLine(part.errorText),
      },
    ];
  }
  return [];
}

function searchBlocks(
  part: Extract<Part, { type: "tool-findOrders" }>,
  priorEntityIds: ReadonlySet<string>,
  revealedEntityIds: string[]
): AssistantBlock[] {
  if (part.state === "output-error") {
    return [
      {
        kind: "error",
        key: part.toolCallId,
        lead: "Search didn't finish.",
        detail: firstUsefulLine(part.errorText),
      },
    ];
  }
  if (part.state !== "output-available") return [];

  const output = part.output;
  const orders = dedupeBy(output.orders, (order) => order._id).filter(
    (order) => !priorEntityIds.has(`order:${order._id}`)
  );
  const customOrders = dedupeBy(
    output.customOrders,
    (request) => request._id
  ).filter((request) => !priorEntityIds.has(`request:${request._id}`));
  const originalCount = output.orders.length + output.customOrders.length;

  if (originalCount > 0 && orders.length + customOrders.length === 0) {
    return [
      {
        kind: "already-shown",
        key: part.toolCallId,
        orders: dedupeBy(output.orders, (order) => order._id),
        customOrders: dedupeBy(output.customOrders, (request) => request._id),
      },
    ];
  }

  const described = describeSearch(output, orders.length, customOrders.length);
  if (orders.length + customOrders.length === 0) {
    return [
      { kind: "search-empty", key: part.toolCallId, message: described.empty },
    ];
  }

  for (const order of orders) revealedEntityIds.push(`order:${order._id}`);
  for (const request of customOrders) {
    revealedEntityIds.push(`request:${request._id}`);
  }

  return [
    {
      kind: "search",
      key: part.toolCallId,
      orders,
      customOrders,
      header: described.header,
      truncated: Boolean(output.truncated),
    },
  ];
}

function recipeBlocks(
  part: Extract<Part, { type: "tool-scaleRecipe" }>
): AssistantBlock[] {
  if (part.state === "output-available") {
    return [{ kind: "recipe", key: part.toolCallId, result: part.output }];
  }
  if (part.state === "output-error") {
    return [
      {
        kind: "error",
        key: part.toolCallId,
        lead: "Recipe scale didn't finish.",
        detail: firstUsefulLine(part.errorText),
      },
    ];
  }
  return [];
}

function calendarBlocks(
  part: Extract<Part, { type: "tool-manageCalendar" }>,
  expiredApprovalIds: ReadonlySet<string>
): AssistantBlock[] {
  switch (part.state) {
    case "approval-requested":
      if (expiredApprovalIds.has(part.approval.id)) {
        return [
          {
            kind: "note",
            key: part.toolCallId,
            text: "Approval expired — no dates were changed.",
          },
        ];
      }
      return [{ kind: "calendar-approval", key: part.toolCallId, part }];
    case "output-denied":
      return [
        {
          kind: "note",
          key: part.toolCallId,
          text: "Calendar change denied — no dates were modified.",
          detail: part.input.reason
            ? `Requested: ${part.input.reason}`
            : undefined,
        },
      ];
    case "output-available":
      return [{ kind: "calendar", key: part.toolCallId, result: part.output }];
    case "output-error":
      return [
        {
          kind: "error",
          key: part.toolCallId,
          lead: "Calendar update didn't finish.",
          detail: firstUsefulLine(part.errorText),
        },
      ];
    default:
      return [];
  }
}

function lastDynamicError(parts: Part[]): AssistantBlock | undefined {
  for (let index = parts.length - 1; index >= 0; index -= 1) {
    const part = parts[index];
    if (part.type === "dynamic-tool" && part.state === "output-error") {
      return {
        kind: "error",
        key: part.toolCallId,
        lead: "That step didn't finish.",
        detail: firstUsefulLine(part.errorText),
      };
    }
  }
  return undefined;
}

function idleStatus(parts: Part[]): StatusLine | null {
  const flight = lastInFlight(parts);
  const date = lastPart(parts, "tool-resolveDate");

  if (flight) {
    const label = inFlightLabel(flight);
    if (
      date &&
      date !== flight &&
      date.state === "output-available" &&
      date.output.resolved
    ) {
      return { mode: "skeleton", label: `${date.output.label} · ${label}` };
    }
    return { mode: "skeleton", label };
  }

  if (date?.state === "output-available") {
    if (date.output.resolved) {
      return {
        mode: "note",
        label: `${date.output.expression} → ${date.output.label}`,
      };
    }
    return {
      mode: "error",
      lead: "Couldn't pin that date down.",
      detail: date.output.message,
    };
  }

  if (date?.state === "output-error") {
    return {
      mode: "error",
      lead: "Couldn't pin that date down.",
      detail: firstUsefulLine(date.errorText),
    };
  }

  return null;
}

function lastExecuting(parts: Part[]): Part | undefined {
  for (let index = parts.length - 1; index >= 0; index -= 1) {
    const part = parts[index];
    if ("state" in part && part.state === "approval-responded") return part;
  }
  return undefined;
}

function executingLabel(part: Part): string {
  if (
    part.type === "tool-sendCustomerMessage" &&
    part.state === "approval-responded"
  ) {
    return part.approval.approved ? "Sending email…" : "Cancelling email…";
  }
  if (
    part.type === "tool-manageCalendar" &&
    part.state === "approval-responded"
  ) {
    return part.approval.approved
      ? "Applying schedule change…"
      : "Schedule change denied…";
  }
  return "Working…";
}

function lastInFlight(parts: Part[]): Part | undefined {
  for (let index = parts.length - 1; index >= 0; index -= 1) {
    const part = parts[index];
    if (!isToolPart(part)) continue;
    if (
      part.state === "input-streaming" ||
      part.state === "input-available" ||
      part.state === "approval-responded"
    ) {
      return part;
    }
  }
  return undefined;
}

function inFlightLabel(part: Part): string {
  switch (part.type) {
    case "tool-resolveDate": {
      const expression =
        part.state === "input-streaming" || part.state === "input-available"
          ? part.input?.expression
          : undefined;
      return expression
        ? `Working out "${expression}"…`
        : "Working out the date…";
    }
    case "tool-findOrders":
      return describeSearchInput(
        part.state === "output-error" ? undefined : part.input
      );
    case "tool-getDailyBrief":
      return "Reading the schedule…";
    case "tool-getCustomerHistory": {
      const query =
        part.state === "input-streaming" || part.state === "input-available"
          ? part.input?.customerQuery
          : undefined;
      return query
        ? `Looking up "${query}"…`
        : "Loading customer profile…";
    }
    case "tool-draftMessage": {
      const query =
        part.state === "input-streaming" || part.state === "input-available"
          ? part.input?.orderQuery
          : undefined;
      return query ? `Drafting a message for "${query}"…` : "Drafting a message…";
    }
    case "tool-scaleRecipe": {
      const query =
        part.state === "input-streaming" || part.state === "input-available"
          ? part.input?.recipeQuery
          : undefined;
      return query ? `Scaling "${query}"…` : "Scaling recipe…";
    }
    case "tool-manageCalendar":
      return "Preparing calendar change…";
    case "tool-sendCustomerMessage":
      return "Preparing the email…";
    case "dynamic-tool":
      return `Running ${part.toolName}…`;
    default:
      return "Working…";
  }
}

function describeSearchInput(
  input: { query?: string; startDate?: string; endDate?: string } | undefined
): string {
  const query = input?.query?.trim();
  const startDate = input?.startDate;
  const endDate = input?.endDate;
  const window =
    startDate && endDate && startDate !== endDate
      ? `${startDate} – ${endDate}`
      : (startDate ?? endDate);

  if (query && window) return `Searching for "${query}" in ${window}…`;
  if (query) return `Searching for "${query}"…`;
  if (window) return `Searching orders for ${window}…`;
  return "Searching orders…";
}

function describeSearch(
  output: {
    query?: string;
    dateRange?: { startDate: string; endDate: string };
    criteria?: string;
  },
  orderCount: number,
  requestCount: number
): { header: string; empty: string } {
  const criteria = friendlyCriteria(output);
  const header = [
    `${orderCount} ${orderCount === 1 ? "order" : "orders"}`,
    `${requestCount} ${requestCount === 1 ? "custom request" : "custom requests"}`,
    criteria,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    header,
    empty: criteria
      ? `Nothing matched ${criteria}.`
      : "Nothing matched that search.",
  };
}

function friendlyCriteria(output: {
  query?: string;
  dateRange?: { startDate: string; endDate: string };
  criteria?: string;
}): string {
  const parts: string[] = [];
  if (output.query) parts.push(output.query);
  if (output.dateRange) {
    const { startDate, endDate } = output.dateRange;
    parts.push(
      startDate === endDate
        ? formatBakeryDate(startDate)
        : `${formatBakeryDate(startDate)} – ${formatBakeryDate(endDate)}`
    );
  }
  if (parts.length > 0) return parts.join(" · ");
  return output.criteria ?? "";
}

function buildContexts(
  messages: BakerUIMessage[],
  expiredApprovalIds: ReadonlySet<string>
): PlanContext[] {
  const contexts: PlanContext[] = messages.map(() => ({
    expiredApprovalIds,
    omitSend: false,
    draftPhase: "idle",
    compactSend: false,
  }));

  const drafts: Array<DraftHit & { messageIndex: number }> = [];
  const sends: Array<SendHit & { messageIndex: number }> = [];

  messages.forEach((message, messageIndex) => {
    if (message.role !== "assistant") return;
    let draft: DraftHit | undefined;
    let send: SendHit | undefined;
    for (const part of message.parts) {
      const nextDraft = readDraftHit(part);
      if (nextDraft) draft = nextDraft;
      const nextSend = readSendHit(part);
      if (nextSend) send = nextSend;
    }
    if (draft) drafts.push({ ...draft, messageIndex });
    if (send) sends.push({ ...send, messageIndex });
  });

  for (const draft of drafts) {
    const send = [...sends]
      .reverse()
      .find(
        (item) =>
          item.orderId === draft.orderId && item.messageIndex >= draft.messageIndex
      );
    if (!send) continue;

    const phase = phaseFor(send, expiredApprovalIds);
    if (phase === "sent") {
      contexts[draft.messageIndex].collapseDraftTo = {
        recipientEmail: send.recipientEmail,
        subject: send.subject,
      };
      if (send.messageIndex !== draft.messageIndex) {
        contexts[send.messageIndex].omitSend = true;
      }
      continue;
    }

    contexts[draft.messageIndex].draftPhase = phase;
    if (send.state === "approval-requested" && phase === "pending") {
      contexts[send.messageIndex].compactSend = draftDirectlyAbove(
        messages,
        draft.messageIndex,
        send.messageIndex
      );
    }
  }

  return contexts;
}

function phaseFor(
  send: SendHit,
  expiredApprovalIds: ReadonlySet<string>
): DraftSendPhase | "sent" {
  switch (send.state) {
    case "approval-requested":
      return send.approvalId && expiredApprovalIds.has(send.approvalId)
        ? "expired"
        : "pending";
    case "approval-responded":
    case "input-available":
      return "pending";
    case "output-denied":
      return "denied";
    case "output-error":
      return "failed";
    case "output-available":
      return send.success ? "sent" : "failed";
    default:
      return "idle";
  }
}

function draftDirectlyAbove(
  messages: BakerUIMessage[],
  draftIndex: number,
  sendIndex: number
): boolean {
  if (draftIndex === sendIndex) return true;
  for (let index = draftIndex + 1; index < sendIndex; index += 1) {
    if (messages[index].role === "user" || messages[index].role === "assistant") {
      return false;
    }
  }
  return true;
}

function readDraftHit(part: Part): DraftHit | undefined {
  if (part.type !== "tool-draftMessage" || part.state !== "output-available") {
    return undefined;
  }
  if (!part.output.found) return undefined;
  return {
    orderId: part.output.orderId,
    subject: part.output.subject,
    bodyText: part.output.bodyText,
  };
}

function readSendHit(part: Part): SendHit | undefined {
  if (part.type !== "tool-sendCustomerMessage") return undefined;
  if (part.state === "input-streaming") return undefined;
  if (part.state === "output-error") {
    if (!part.input?.orderId) return undefined;
    return {
      orderId: part.input.orderId,
      recipientEmail: part.input.recipientEmail ?? "",
      subject: part.input.subject ?? "",
      state: part.state,
    };
  }
  if (!part.input?.orderId) return undefined;

  const base = {
    orderId: part.input.orderId,
    recipientEmail: part.input.recipientEmail,
    subject: part.input.subject,
    state: part.state,
  };

  if (part.state === "approval-requested" || part.state === "approval-responded") {
    return { ...base, approvalId: part.approval.id };
  }
  if (part.state === "output-available") {
    if (part.output.success) {
      return {
        ...base,
        recipientEmail: part.output.recipientEmail,
        subject: part.output.subject,
        success: true,
      };
    }
    return { ...base, success: false, failureMessage: part.output.message };
  }
  return base;
}

function trimAssistantText(
  text: string,
  facts: HeadlineFacts,
  hasArtifact: boolean
): string | null {
  const sentences = splitSentences(text);
  const kept: string[] = [];

  for (const sentence of sentences) {
    const clean = sentence.replace(/\*\*/g, "").replace(/^#+\s*/, "").trim();
    if (!clean) continue;
    if (isProcessSentence(clean)) continue;
    if (hasArtifact && clean.length > 280) continue;
    if (hasArtifact && isRestatement(clean, facts)) continue;
    kept.push(clean);
    if (kept.length === 2) break;
  }

  if (kept.length > 0) return kept.join(" ");
  if (hasArtifact) return null;

  const fallback = sentences
    .map((sentence) => sentence.replace(/\*\*/g, "").trim())
    .filter((sentence) => sentence && !/https?:\/\//i.test(sentence))
    .slice(0, 2);

  return fallback.length > 0 ? fallback.join(" ") : null;
}

function splitSentences(text: string): string[] {
  const sentences: string[] = [];
  for (const line of text.split(/\n+/)) {
    const stripped = line.replace(/^[-*•]\s+/, "").trim();
    if (!stripped) continue;
    for (const part of stripped.split(/(?<=[.!?…])\s+/)) {
      const sentence = part.trim();
      if (sentence) sentences.push(sentence);
    }
  }
  return sentences;
}

function isProcessSentence(sentence: string): boolean {
  return /^(let me\b|one moment\b|looking\b|checking\b|зараз\b|перевірю\b|подивлюся\b|подивлюсь\b|done[.!]?$|sent[.!]?$|надіслано[.!]?$|відправлено[.!]?$|готово[.!]?$)/i.test(
    sentence
  );
}

function isRestatement(sentence: string, facts: HeadlineFacts): boolean {
  if (/https?:\/\//i.test(sentence)) return true;
  const lower = sentence.toLowerCase();
  if (
    facts.snippets.some(
      (snippet) => snippet.length >= 24 && lower.includes(snippet.toLowerCase())
    )
  ) {
    return true;
  }

  const nameHits = facts.names.filter(
    (name) => name.trim().length > 2 && lower.includes(name.trim().toLowerCase())
  ).length;
  const idHits = facts.shortIds.some((id) =>
    sentence.toUpperCase().includes(id.toUpperCase())
  )
    ? 1
    : 0;
  const amountHits = facts.amounts.some(
    (amount) => amount.length > 0 && sentence.includes(amount)
  )
    ? 1
    : 0;
  const paidHits = /paid|unpaid|оплачен/i.test(sentence) ? 1 : 0;
  const itemHits = facts.itemNames.some(
    (name) => name.trim().length > 3 && lower.includes(name.trim().toLowerCase())
  )
    ? 1
    : 0;

  return nameHits + idHits + amountHits + paidHits + itemHits >= 2;
}

function factsFrom(blocks: AssistantBlock[]): HeadlineFacts {
  const facts: HeadlineFacts = {
    names: [],
    shortIds: [],
    amounts: [],
    itemNames: [],
    snippets: [],
  };

  for (const block of blocks) {
    if (block.kind === "search" || block.kind === "already-shown") {
      for (const order of block.orders) addOrderFacts(facts, order);
      for (const request of block.customOrders) addRequestFacts(facts, request);
    }
    if (block.kind === "brief") addBriefFacts(facts, block.brief);
    if (block.kind === "draft" && block.result.found) {
      pushFact(facts.names, block.result.customerName);
      pushFact(facts.shortIds, block.result.shortId);
      pushFact(facts.snippets, block.result.subject);
      if (block.result.bodyText.length > 40) {
        facts.snippets.push(block.result.bodyText.slice(0, 80));
      }
    }
    if (block.kind === "send-line") {
      pushFact(facts.snippets, block.recipientEmail);
      pushFact(facts.snippets, block.subject);
    }
    if (block.kind === "recipe" && block.result.found) {
      pushFact(facts.names, block.result.recipeName);
      for (const component of block.result.scaledComponents) {
        for (const ingredient of component.ingredients) {
          if (facts.itemNames.length >= 12) break;
          pushFact(facts.itemNames, ingredient.name);
        }
      }
    }
  }

  return facts;
}

function addOrderFacts(facts: HeadlineFacts, order: OrderSearchHit) {
  const contact = contactFields(order.customer);
  pushFact(facts.names, contact.name);
  pushFact(facts.shortIds, order.shortId);
  pushAmount(facts, order.totalAmount);
  for (const label of itemLabels(order.items)) {
    if (facts.itemNames.length >= 12) break;
    pushFact(facts.itemNames, label);
  }
}

function addRequestFacts(facts: HeadlineFacts, request: CustomRequestHit) {
  const contact = contactFields(request.contact);
  pushFact(facts.names, contact.name);
  pushFact(facts.shortIds, request.shortId);
  pushAmount(facts, request.agreedPriceTotal);
  pushAmount(facts, request.approximatePriceTotal);
  for (const label of itemLabels(request.items)) {
    if (facts.itemNames.length >= 12) break;
    pushFact(facts.itemNames, label);
  }
}

function addBriefFacts(facts: HeadlineFacts, brief: DailyBrief) {
  pushAmount(facts, brief.summary.outstandingPaymentsAmount);
  for (const order of brief.todaysOrders) {
    pushFact(facts.names, contactFields(order.customer).name);
    pushFact(facts.shortIds, order.shortId);
    pushAmount(facts, order.totalAmount);
  }
  for (const order of brief.unpaidOrders.items) {
    pushFact(facts.names, contactFields(order.customer).name);
    pushFact(facts.shortIds, order.shortId);
    pushAmount(facts, order.totalAmount);
  }
}

function pushAmount(facts: HeadlineFacts, amount: unknown) {
  if (typeof amount !== "number" || !Number.isFinite(amount)) return;
  const formatted = amount.toFixed(2);
  if (!facts.amounts.includes(formatted)) facts.amounts.push(formatted);
  const withDollar = `$${formatted}`;
  if (!facts.amounts.includes(withDollar)) facts.amounts.push(withDollar);
}

function pushFact(list: string[], value: unknown) {
  if (typeof value !== "string") return;
  const trimmed = value.trim();
  if (!trimmed || list.includes(trimmed)) return;
  list.push(trimmed);
}

function itemLabels(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  const labels: string[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const label = [record.name, record.category, record.flavor].find(
      (value) => typeof value === "string" && value.trim()
    );
    if (typeof label === "string") labels.push(label);
  }
  return labels;
}

function textOf(message: BakerUIMessage): string {
  return message.parts
    .filter((part): part is Extract<Part, { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

function isLegacySendDump(text: string): boolean {
  return text.includes("Call sendCustomerMessage with exactly these arguments");
}

function lastPart<T extends Part["type"]>(
  parts: Part[],
  type: T
): Extract<Part, { type: T }> | undefined {
  for (let index = parts.length - 1; index >= 0; index -= 1) {
    const part = parts[index];
    if (part.type === type) return part as Extract<Part, { type: T }>;
  }
  return undefined;
}

function isToolPart(
  part: Part
): part is Extract<Part, { type: `tool-${string}` | "dynamic-tool" }> {
  return part.type.startsWith("tool-") || part.type === "dynamic-tool";
}

function dedupeBy<T>(items: T[], idOf: (item: T) => string | undefined): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    const id = idOf(item);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    result.push(item);
  }
  return result;
}

function contactOf(node: {
  kind: "order" | "request";
  order?: OrderSearchHit;
  request?: CustomRequestHit;
}): { name?: string; phone?: string; email?: string } {
  if (node.kind === "order") return contactFields(node.order?.customer);
  return contactFields(node.request?.contact);
}

function contactFields(value: unknown): {
  name?: string;
  phone?: string;
  email?: string;
} {
  if (!value || typeof value !== "object") return {};
  const record = value as Record<string, unknown>;
  return {
    name: typeof record.name === "string" ? record.name : undefined,
    phone: typeof record.phone === "string" ? record.phone : undefined,
    email: typeof record.email === "string" ? record.email : undefined,
  };
}

function phoneKey(phone?: string): string | null {
  const digits = normalizePhoneDigits(phone);
  return digits.length >= 7 ? digits : null;
}

function emailKey(email?: string): string | null {
  const value = normalizeEmail(email);
  return value.includes("@") ? value : null;
}

function convertedOrderId(request: CustomRequestHit): string | null {
  const value = request.convertedOrderId;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function linkBucket(
  unionFind: UnionFind,
  buckets: Map<string, number>,
  key: string,
  index: number
) {
  const previous = buckets.get(key);
  if (previous === undefined) {
    buckets.set(key, index);
    return;
  }
  unionFind.union(previous, index);
}

class UnionFind {
  private parent: number[];

  constructor(size: number) {
    this.parent = Array.from({ length: size }, (_, index) => index);
  }

  find(index: number): number {
    let current = index;
    while (this.parent[current] !== current) {
      this.parent[current] = this.parent[this.parent[current]];
      current = this.parent[current];
    }
    return current;
  }

  union(a: number, b: number) {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA !== rootB) this.parent[rootA] = rootB;
  }
}
