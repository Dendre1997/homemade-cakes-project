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

export const maxDuration = 60;

/** Enough steps for a tool call, a follow-up tool call, and a final answer. */
const MAX_STEPS = 6;

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
    "CRITICAL TIME CONTEXT: Today is Saturday, August 15, 2026. The bakery timezone is America/Edmonton. ALWAYS use this exact date as your reference point when resolving relative dates like 'tomorrow', 'next week', or month names.",
    "Resolve relative dates like \"tomorrow\" or \"next Friday\" against that date, and pass an explicit YYYY-MM-DD to tools.",
    "For manageCalendar: use 'update_capacity' with workMinutes to change daily workload (default is usually 240). Pass null to reset to default. Use 'update_slots' with availableHours formatted exactly like '7:00 AM - 7:30 AM' to change pickup times. Pass null to reset.",
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
    messages: await convertToModelMessages(messages),
    tools: createBakerTools(adminUid),
    stopWhen: isStepCount(MAX_STEPS),
    toolApproval: { manageCalendar: "user-approval" },
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
