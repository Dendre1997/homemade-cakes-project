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
import { isDraftTurnText } from "@/components/admin/Copilot/composeAnswer";
import {
  getCopilotModel,
  MissingAiCredentialsError,
} from "@/lib/ai/provider";
import { createBakerTools } from "@/lib/ai/tools";
import { BAKERY_TIME_ZONE, getBakeryToday } from "@/lib/db/capacity";

export const maxDuration = 60;

/** Enough for one date lookup, one answering tool, and a short headline. */
const MAX_STEPS = 6;

type CopilotToolName = keyof ReturnType<typeof createBakerTools>;

const ALL_TOOLS: CopilotToolName[] = [
  "findOrders",
  "resolveDate",
  "getCustomerHistory",
  "getDailyBrief",
  "manageCalendar",
  "scaleRecipe",
  "draftMessage",
  "sendCustomerMessage",
];

const ANSWERING_TOOLS = new Set<CopilotToolName>([
  "findOrders",
  "getCustomerHistory",
  "getDailyBrief",
  "manageCalendar",
  "scaleRecipe",
  "draftMessage",
  "sendCustomerMessage",
]);

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

function lastUserText(messages: UIMessage[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== "user") continue;
    return message.parts
      .filter((part) => part.type === "text")
      .map((part) => ("text" in part ? part.text : ""))
      .join("\n")
      .trim();
  }
  return "";
}

function isApprovalContinuation(messages: UIMessage[]): boolean {
  const last = messages.at(-1);
  if (!last || last.role !== "assistant") return false;
  return last.parts.some(
    (part) =>
      part.type.startsWith("tool-") &&
      "state" in part &&
      part.state === "approval-responded"
  );
}

/**
 * One successful answering tool ends the tool loop. A second call of the
 * same tool is never offered. Draft turns are locked to draftMessage so a
 * card action cannot wander off into another search.
 */
function prepareCopilotStep(
  steps: Array<{ toolCalls: Array<{ toolName: string }> }>,
  draftTurn: boolean
) {
  const called = new Set(
    steps.flatMap((step) => step.toolCalls.map((call) => call.toolName))
  );

  if (draftTurn) {
    if (called.has("draftMessage")) {
      return { activeTools: [] as CopilotToolName[], toolChoice: "none" as const };
    }
    return { activeTools: ["draftMessage"] as CopilotToolName[] };
  }

  if (called.size === 0) return undefined;

  const answering = ALL_TOOLS.filter(
    (name) => ANSWERING_TOOLS.has(name) && called.has(name)
  );

  if (answering.length === 0) {
    return { activeTools: ALL_TOOLS.filter((name) => !called.has(name)) };
  }

  // The answering tool already ran. The next step is the headline only,
  // so a day brief cannot be followed by a second search.
  return {
    activeTools: [] as CopilotToolName[],
    toolChoice: "none" as const,
  };
}

function buildSystemPrompt(): string {
  return [
    "You are the D&K Creations Copilot, a calm bakery operations assistant for Anastasiia.",
    "",
    "One question gets one answer:",
    "- Reply in the language of her latest message (Ukrainian or English). Keep order codes, CAD amounts, and dates exactly as the tools show them.",
    "- Write one or two short sentences: the conclusion, and the action if there is one.",
    "- The panel already draws the card. Never restate names, totals, paid state, items, statuses, the draft body, prices, or payment URLs. Call a payment link only \"the payment link\".",
    "- If you would only be listing what is already on the card, stop after the conclusion.",
    "- Never invent orders, money, dates, or capacity. Never do arithmetic. Never calculate a date.",
    "- If a tool returns nothing or several people match, say so and ask one clarifying question. Do not call that tool again.",
    "- The panel shows at most 5 cards, then \"Show the rest\". When a result is truncated, say in one clause that more records exist. Do not list the rows.",
    "- Capacity is minutes of kitchen work, not a count of orders. isPaid is the only payment flag. Money is CAD.",
    "- Allergies are already on the custom-request card. Mention them in the headline only when they change the bake.",
    "",
    buildTimeContext(),
    "",
    "Call each tool at most once per turn.",
    "- \"What does my day look like\", \"what should I bake today\", \"do I have room today\" → getDailyBrief once for that one date. If the date is relative, call resolveDate once first and pass its YYYY-MM-DD. Do not also call findOrders for that day. \"Today\" needs no resolveDate — omit the date.",
    "- \"What do I have next week / this weekend / on a range\" → resolveDate once, then findOrders once with startDate and endDate. Do not call getDailyBrief for a range.",
    "- \"Find Sarah / this phone / this code\" → findOrders once. Add dates only when she named a period.",
    "- \"Tell me about this customer / LTV / how often they order / their favorites\" → getCustomerHistory once with phone, email, or name. Do not sum money or counts yourself — the card has LTV, order count, and balance.",
    "- \"Who owes me\" → getDailyBrief once (today). Answer from unpaidOrders already in that payload. Do not call findOrders per customer. The card lists each person.",
    "- \"Draft / remind / tell the customer\" → draftMessage once. Pass the short code or order id already on screen. Do not call findOrders again if that order was already returned this turn.",
    "- A message that starts with \"Draft\" or \"Склади\" and names a #code is draftMessage only. payment reminder / нагадування про оплату → payment_reminder. quote reply / відповідь із ціною → inquiry_response. update / повідомлення → general_update. Pass the code without #.",
    "- Do not send email from chat. If she asks to send, tell her to press Send email on the draft. Never rewrite bodyText, the subject, prices, or the payment URL.",
    "- Calendar changes → manageCalendar once, then stop for approval. update_capacity uses workMinutes (null resets; the usual default is 240). update_slots uses strings like \"7:00 AM - 7:30 AM\" (null resets). Dates are YYYY-MM-DD from resolveDate or the time context.",
    "- Recipe scaling → scaleRecipe once. Do not restate the quantities.",
    "- If resolveDate returns resolved false, ask which calendar date she means.",
    "",
    "Payments:",
    "- unpaidOrders and outstandingPaymentsAmount are money still owed on orders that have not been delivered. Quote that figure when she asks what she is owed.",
    "- unreconciledDelivered is old delivered orders still flagged unpaid. Do not add it to the amount owed. Mention it only as bookkeeping, or when she asks.",
    "- canEmail and hasPhone say whether a customer can be reached. If canEmail is false, say there is no usable email and point her to WhatsApp or copy on the draft card.",
    "- If otherMatches is above zero, name the customer and short code so she can confirm it is the right order.",
    "",
    "draftMessage writes the customer wording from a fixed template. Do not compose, shorten, translate, or summarize bodyText.",
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

  const approvalFollowUp = isApprovalContinuation(messages);
  const draftTurn =
    !approvalFollowUp && isDraftTurnText(lastUserText(messages));

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
    // After Approve/Deny the tool runs from the message history. The model
    // only writes the headline — it must not start another search.
    ...(approvalFollowUp
      ? { activeTools: [] as CopilotToolName[], toolChoice: "none" as const }
      : draftTurn
        ? { activeTools: ["draftMessage"] as CopilotToolName[] }
        : {}),
    prepareStep: approvalFollowUp
      ? undefined
      : ({ steps }) => prepareCopilotStep(steps, draftTurn),
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
