import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { NextResponse } from "next/server";
import { verifyAdminAPI } from "@/lib/auth/adminOnly";
import {
  getCopilotModel,
  MissingAiCredentialsError,
} from "@/lib/ai/provider";
import { createBakerTools } from "@/lib/ai/tools";
import { BAKERY_TIME_ZONE, getBakeryToday } from "@/lib/db/capacity";

export const maxDuration = 60;

/** Enough steps for a tool call, a follow-up tool call, and a final answer. */
const MAX_STEPS = 6;

/**
 * Today in the bakery's time zone, as both a human-readable weekday date and
 * the `YYYY-MM-DD` key tools expect. Recomputed per request — never hardcode a
 * date here, or every relative date the model resolves drifts silently.
 */
function buildTimeContext(): string {
  const dateKey = getBakeryToday();
  const readable = new Intl.DateTimeFormat("en-CA", {
    dateStyle: "full",
    timeZone: BAKERY_TIME_ZONE,
  }).format(new Date());

  return `CRITICAL TIME CONTEXT: Today is ${readable} (${dateKey}). The bakery timezone is ${BAKERY_TIME_ZONE}. ALWAYS use this exact date as your reference point when resolving relative dates like 'tomorrow', 'next week', or month names.`;
}

function buildSystemPrompt(): string {
  return [
    "You are the D&K Creations Copilot, an expert bakery operations manager assisting Anastasiia, the owner and baker.",
    "",
    "RULES:",
    "- Never invent data. Every claim about orders, customers, dates, money, or capacity MUST come from a tool result.",
    "- If a tool returns nothing, say so plainly and suggest a different search term. Do not guess.",
    "- Be concise. Prefer two or three short sentences over a paragraph. The UI already renders the data as cards, so do not repeat every field in prose — summarize and highlight what needs action.",
    "- Never restate raw ObjectIds. Use the 6-character short code (shortId) when referring to an order.",
    "- Capacity is measured in MINUTES of kitchen work per day, not in number of orders.",
    "- `isPaid` is the only source of truth for payment. Order status alone does not mean it is paid.",
    "- All money is in Canadian dollars.",
    "- When a result is marked `truncated`, tell her more records exist beyond what you listed.",
    "- Flag allergies prominently whenever they appear in a custom request.",
    "",
    buildTimeContext(),
    "Resolve relative dates like \"tomorrow\" or \"next Friday\" against that date, and pass an explicit YYYY-MM-DD to tools.",
    "For manageCalendar: use 'update_capacity' with workMinutes to change daily workload (default is usually 240). Pass null to reset to default. Use 'update_slots' with availableHours formatted exactly like '7:00 AM - 7:30 AM' to change pickup times. Pass null to reset.",
    "",
    "OUTSTANDING PAYMENTS:",
    "- `unpaidOrders` and `outstandingPaymentsAmount` are money actively owed: unpaid orders NOT yet delivered. That is the figure to quote when she asks what she is owed.",
    "- `unreconciledDelivered` counts orders already delivered but still flagged unpaid. Never add it to the amount owed — it is almost always old records nobody marked paid. Mention it only as a bookkeeping cleanup suggestion, or when she asks about it directly.",
    "- Each unpaid entry carries `canEmail` and `hasPhone`. Use them to pick a reachable customer BEFORE drafting, and never claim there is nobody to contact without checking both.",
    "",
    "MESSAGING CUSTOMERS:",
    "- Always call draftMessage first. It is read-only and writes the text for you from a fixed template — never compose customer wording yourself.",
    "- Do not rewrite, shorten, translate or re-summarize the returned bodyText, and do not restate its prices in prose. The UI already shows the full draft.",
    "- To send, call sendCustomerMessage and copy orderId, orderType, recipientEmail, subject, bodyText and actionButton from the draft verbatim. Anastasiia must approve before it leaves.",
    "- Never invent or alter a recipient address. If draftMessage reports canEmail false, say the order has no usable email and suggest WhatsApp or SMS from the draft card instead.",
    "- Never repeat an actionButton URL in your prose — it can contain a payment token. Refer to it as \"the payment link\".",
    "- If draftMessage reports otherMatches above zero, name the customer and short code you drafted for so she can confirm it is the right order.",
  ].join("\n");
}

export async function POST(request: Request) {
  const session = await verifyAdminAPI();
  if (!("user" in session) || !session.user) {
    return NextResponse.json(
      { error: "error" in session ? session.error : "Unauthorized" },
      { status: "status" in session ? session.status : 401 }
    );
  }

  const adminUid = session.user.firebaseUid || "unknown-admin";

  let messages: UIMessage[];
  try {
    const body = await request.json();
    messages = body?.messages ?? [];
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: "Request body must include a non-empty messages array." },
      { status: 400 }
    );
  }

  let model;
  try {
    model = getCopilotModel();
  } catch (error) {
    if (error instanceof MissingAiCredentialsError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    throw error;
  }

  const result = streamText({
    model,
    system: buildSystemPrompt(),
    // An approval card the baker never answered leaves a tool call with no
    // result. Without this the conversion throws MissingToolResultsError and
    // the whole thread becomes unusable. Parts already answered
    // (`approval-responded`) survive the filter, so approvals still execute.
    messages: await convertToModelMessages(messages, {
      ignoreIncompleteToolCalls: true,
    }),
    tools: createBakerTools(adminUid),
    stopWhen: isStepCount(MAX_STEPS),
    toolApproval: {
      manageCalendar: "user-approval",
      sendCustomerMessage: "user-approval",
    },
    runtimeContext: { adminUid },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      // Default masks all errors; surface the message so the panel can show it.
      onError: (error) =>
        error instanceof Error ? error.message : "Something went wrong.",
    }),
  });
}
