import type { InferUITools, UIDataTypes, UIMessage } from "ai";
import type { BakerTools } from "@/lib/ai/tools";
import type { SearchResult } from "@/lib/ai/queries/search";
import type { DailyBriefResult } from "@/lib/ai/queries/dailyBrief";
import type {
  ScaleRecipeToolResult,
  ManageCalendarToolResult,
  DraftMessageToolResult,
  DraftMessageToolSuccess,
  SendCustomerMessageToolResult,
} from "@/lib/ai/tools";

/**
 * Client-side types for the Copilot.
 *
 * Type-only imports, so nothing from the server query modules ends up in the
 * browser bundle — but the chat panel still gets full inference on tool parts,
 * which is what makes `part.type === "tool-findOrders"` narrow correctly.
 */

export type BakerUITools = InferUITools<BakerTools>;

export type BakerUIMessage = UIMessage<never, UIDataTypes, BakerUITools>;

/** A single order hit. Every field is optional: the server strips empty values. */
export type OrderSearchHit = SearchResult["orders"][number];

export type CustomRequestHit = SearchResult["customOrders"][number];

export type DailyBrief = DailyBriefResult;

export type BriefOrder = DailyBrief["todaysOrders"][number];

export type UnpaidOrder = DailyBrief["unpaidOrders"]["items"][number];

export type PendingRequest =
  DailyBrief["pendingCustomRequests"]["items"][number];

export type {
  ScaleRecipeToolResult,
  ManageCalendarToolResult,
  DraftMessageToolResult,
  DraftMessageToolSuccess,
  SendCustomerMessageToolResult,
};

/** Payload the DraftMessageCard hands back when the baker clicks "Send email". */
export interface SendMessageRequest {
  orderId: string;
  orderType: "regular" | "custom";
  recipientEmail: string;
  subject: string;
  bodyText: string;
  actionButton?: { label: string; url: string };
}
