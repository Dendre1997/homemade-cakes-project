import { tool } from "ai";
import { z } from "zod";
import { withMongoClient } from "@/lib/db";
import type { RecipeDocument } from "@/lib/db/recipes";
import {
  MAX_SEARCH_LIMIT,
  searchBakeryRecords,
} from "@/lib/ai/queries/search";
import { buildDailyBrief } from "@/lib/ai/queries/dailyBrief";
import {
  buildCustomerHistory,
  type CustomerHistoryResult,
} from "@/lib/ai/queries/customerHistory";
import { getBakeryToday } from "@/lib/db/capacity";
import {
  resolveDateExpression,
  SUPPORTED_DATE_EXPRESSIONS,
  type ResolvedDateExpression,
} from "@/lib/dates/resolve";
import {
  calculateScaleFactor,
  scaleRecipe,
  type ScaledComponent,
} from "@/lib/recipes/scale";
import {
  ModifyScheduleDatesError,
  modifyScheduleDates,
  type ModifyScheduleDatesResult,
} from "@/lib/db/schedule-helpers";
import {
  SendCustomerMessageError,
  findMessagingTarget,
  isSendableEmail,
  sendCustomerMessage,
} from "@/lib/db/messages";
import {
  buildCustomerMessageDraft,
  MESSAGE_INTENTS,
  type MessageIntent,
} from "@/lib/messages/draft";
import {
  actionButtonSchema,
  messageBodySchema,
  messageSubjectSchema,
  messageOrderTypeSchema,
  objectIdStringSchema,
} from "@/lib/validation/message";

/**
 * The Baker Copilot tool registry.
 *
 * Read-only tools call query modules in-process — no internal HTTP hop.
 * Authorization happens once, in the chat route, before streamText runs.
 *
 * Tool results pass through JSON serialization so MongoDB `Date` instances and
 * other non-JSON values become plain strings/objects before the SDK validates
 * them for the message stream.
 */

function serializeToolResult<T>(result: T): T {
  return JSON.parse(JSON.stringify(result));
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const RECIPE_SCALE_PROJECTION = {
  name: 1,
  slug: 1,
  yield: 1,
  components: 1,
} as const;

export type ScaleRecipeToolSuccess = {
  found: true;
  recipeName: string;
  scaleFactor: number;
  sourcePanDiameterInches: number;
  targetPanDiameterInches: number;
  targetCount: number;
  scaledComponents: ScaledComponent[];
};

export type ScaleRecipeToolNotFound = {
  found: false;
  recipeQuery: string;
  message: string;
};

export type ScaleRecipeToolResult =
  | ScaleRecipeToolSuccess
  | ScaleRecipeToolNotFound;

export type ManageCalendarToolSuccess = ModifyScheduleDatesResult & {
  reason?: string;
};

export type ManageCalendarToolError = {
  success: false;
  message: string;
};

export type ManageCalendarToolResult =
  | ManageCalendarToolSuccess
  | ManageCalendarToolError;

export type DraftMessageToolSuccess = {
  found: true;
  orderId: string;
  orderType: "regular" | "custom";
  shortId: string;
  intent: MessageIntent;
  customerName: string;
  recipientEmail?: string;
  recipientPhone?: string;
  subject: string;
  bodyText: string;
  actionButton?: { label: string; url: string };
  /** False when the order has no usable email — the card hides "Send email". */
  canEmail: boolean;
  /** Other records that matched the same query, so ambiguity is visible. */
  otherMatches: number;
};

export type DraftMessageToolNotFound = {
  found: false;
  orderQuery: string;
  message: string;
};

export type DraftMessageToolResult =
  | DraftMessageToolSuccess
  | DraftMessageToolNotFound;

export type SendCustomerMessageToolSuccess = {
  success: true;
  messageId: string;
  recipientEmail: string;
  subject: string;
};

export type SendCustomerMessageToolError = {
  success: false;
  message: string;
};

export type SendCustomerMessageToolResult =
  | SendCustomerMessageToolSuccess
  | SendCustomerMessageToolError;

export type CustomerHistoryToolResult = CustomerHistoryResult;

type CopilotRuntimeContext = {
  adminUid?: string;
};

const UNKNOWN_ADMIN_UID = "unknown-admin";

function resolveAdminUid(
  boundAdminUid: string,
  options?: { context?: unknown }
): string {
  const contextUid = (options?.context as CopilotRuntimeContext | undefined)
    ?.adminUid;
  return boundAdminUid || contextUid || UNKNOWN_ADMIN_UID;
}

const DATE_KEY_DESCRIPTION =
  "A calendar date as YYYY-MM-DD. Never compute this yourself from a phrase " +
  "like 'next week' — call resolveDate first and pass its output.";

export const findOrders = tool({
  description:
    "Find orders and custom requests by name, phone, email, Instagram, order " +
    "code, or across a fulfillment-date RANGE such as next week or this weekend. " +
    "Call at most once per turn. For a range, call resolveDate once first, then " +
    "pass startDate and endDate. Add dates only when the baker named a period. " +
    "Do not use this for one day's workload, what to bake, whether today has " +
    "room, or who owes money — those are getDailyBrief. If nothing matches or " +
    "several people match, stop and ask one question. Do not call this again.",
  inputSchema: z.object({
    query: z
      .string()
      .optional()
      .describe(
        "Search text: a customer name, phone, email, social handle, order code, or words from the cake design. Optional when startDate or endDate is provided."
      ),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .describe(
        `Inclusive start of the fulfillment-date window. ${DATE_KEY_DESCRIPTION}`
      ),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .describe(
        `Inclusive end of the window. Omit to search a single day. ${DATE_KEY_DESCRIPTION}`
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_SEARCH_LIMIT)
      .optional()
      .describe("Maximum results per collection. Defaults to 10."),
  }),
  execute: async ({ query, startDate, endDate, limit }) => {
    const result = await searchBakeryRecords({
      query,
      startDate,
      endDate,
      limit,
    });
    return serializeToolResult(result);
  },
});

export type ResolveDateToolSuccess = ResolvedDateExpression & {
  resolved: true;
};

export type ResolveDateToolFailure = {
  resolved: false;
  expression: string;
  today: string;
  message: string;
};

export type ResolveDateToolResult =
  | ResolveDateToolSuccess
  | ResolveDateToolFailure;

/**
 * §7: the model selects a phrase, a pure function does the calendar math.
 * Every relative date reaching another tool must come through here.
 */
export const resolveDate = tool({
  description:
    "Turn one relative date phrase into YYYY-MM-DD bounds in the bakery time " +
    "zone. Call at most once per turn, and only when the baker named a relative " +
    "day or range. Do not call this for 'today'. Never calculate a date " +
    "yourself. After it returns, call exactly one of getDailyBrief (a single " +
    "day) or findOrders (a range or a search that needs those dates).",
  inputSchema: z.object({
    expression: z
      .string()
      .min(2)
      .describe(
        `The phrase to resolve, exactly as the baker said it. Supported forms include: ${SUPPORTED_DATE_EXPRESSIONS.join(", ")}.`
      ),
  }),
  execute: async ({ expression }): Promise<ResolveDateToolResult> => {
    const today = getBakeryToday();
    const resolved = resolveDateExpression(expression, today);

    if (!resolved) {
      return {
        resolved: false,
        expression,
        today,
        message: `Could not understand "${expression}" as a date. Ask her which calendar date she means, or try one of: ${SUPPORTED_DATE_EXPRESSIONS.slice(0, 8).join(", ")}.`,
      };
    }

    return { resolved: true, ...resolved };
  },
});

export const getCustomerHistory = tool({
  description:
    "Retrieve comprehensive customer CRM profile: Lifetime Value (LTV), order " +
    "frequency, favorite cake flavors, payment status, and order history.",
  inputSchema: z.object({
    customerQuery: z
      .string()
      .min(2)
      .describe("Customer phone, email, or name to analyze"),
  }),
  execute: async ({ customerQuery }) => {
    const result = await buildCustomerHistory(customerQuery);
    return serializeToolResult(result);
  },
});

export const getDailyBrief = tool({
  description:
    "Briefing for ONE calendar day: kitchen minutes, what to bake, whether that " +
    "day has room, orders due, and who still owes money (unpaidOrders). Use for " +
    "'what does my day look like', 'what should I bake today', 'do I have room " +
    "today', and 'who owes me'. Call at most once per turn. Omit date for today. " +
    "If the day is relative, call resolveDate once and pass its YYYY-MM-DD. Do " +
    "not also call findOrders for that day. For 'who owes me', answer from " +
    "unpaidOrders — do not search each customer. Do not use this for a multi-day range.",
  inputSchema: z.object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .describe(
        "Target day as YYYY-MM-DD. Omit for today in the bakery's local time (Calgary)."
      ),
  }),
  execute: async ({ date }) => {
    const result = await buildDailyBrief({ date });
    return serializeToolResult(result);
  },
});

function createManageCalendarTool(boundAdminUid: string) {
  return tool({
    description:
      "Block or unblock dates, set daily kitchen minutes, or set pickup slots. " +
      "Call once with explicit YYYY-MM-DD dates, then stop for approval. Do not " +
      "call it again in the same turn. Never invent dates.",
    inputSchema: z
      .object({
        action: z
          .enum(["block", "unblock", "update_capacity", "update_slots"])
          .describe(
            "block/unblock dates, update_capacity for daily work minutes, or update_slots for pickup windows."
          ),
        dates: z
          .array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
          .min(1)
          .describe(
            "Calendar days as YYYY-MM-DD in America/Edmonton. One entry per day."
          ),
        reason: z
          .string()
          .min(1)
          .describe("Short explanation shown to the admin in the approval card."),
        workMinutes: z
          .number()
          .int()
          .nonnegative()
          .nullable()
          .optional()
          .describe(
            "For update_capacity: absolute kitchen minutes for the day. Pass null to reset to default."
          ),
        availableHours: z
          .array(z.string())
          .nullable()
          .optional()
          .describe(
            "For update_slots: pickup slots like '7:00 AM - 7:30 AM'. Pass null to reset to default."
          ),
      })
      .superRefine((value, ctx) => {
        if (
          value.action === "update_capacity" &&
          value.workMinutes === undefined
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              "update_capacity requires workMinutes (number or null to reset).",
            path: ["workMinutes"],
          });
        }
        if (
          value.action === "update_slots" &&
          value.availableHours === undefined
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              "update_slots requires availableHours (string array or null to reset).",
            path: ["availableHours"],
          });
        }
      }),
    execute: async (
      { action, dates, reason, workMinutes, availableHours },
      options
    ) => {
      const adminUid = resolveAdminUid(boundAdminUid, options);
      const audit =
        adminUid !== UNKNOWN_ADMIN_UID
          ? { adminUid, reason, tool: "manageCalendar" }
          : undefined;

      try {
        const result = await modifyScheduleDates(dates, action, {
          audit,
          ...(action === "update_capacity"
            ? { workMinutes: workMinutes ?? null }
            : {}),
          ...(action === "update_slots"
            ? { availableHours: availableHours ?? null }
            : {}),
        });

        return serializeToolResult({
          ...result,
          reason,
        } satisfies ManageCalendarToolSuccess);
      } catch (error) {
        const message =
          error instanceof ModifyScheduleDatesError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Failed to update the schedule.";

        return serializeToolResult({
          success: false,
          message,
        } satisfies ManageCalendarToolError);
      }
    },
  });
}

export const scaleRecipeTool = tool({
  description:
    "Scale one catalog recipe to a different round pan using area math. Call " +
    "once. Do not calculate or restate ingredient quantities yourself.",
  inputSchema: z.object({
    recipeQuery: z
      .string()
      .min(1)
      .describe("Recipe name or slug to search for, e.g. 'vanilla cake'."),
    targetPanDiameterInches: z
      .number()
      .finite()
      .positive()
      .describe("Target round pan diameter in inches."),
    targetCount: z
      .number()
      .int()
      .positive()
      .optional()
      .default(1)
      .describe("Number of target batches. Defaults to 1."),
  }),
  execute: async ({
    recipeQuery,
    targetPanDiameterInches,
    targetCount,
  }) => {
    const trimmedQuery = recipeQuery.trim();
    const pattern = escapeRegex(trimmedQuery);

    const dbRecipe = await withMongoClient(async (client) =>
      client
        .db(process.env.MONGODB_DB_NAME)
        .collection<RecipeDocument>("recipes")
        .findOne(
          {
            isActive: true,
            $or: [
              { name: { $regex: pattern, $options: "i" } },
              { slug: { $regex: pattern, $options: "i" } },
            ],
          },
          { projection: RECIPE_SCALE_PROJECTION }
        )
    );

    if (!dbRecipe) {
      return serializeToolResult({
        found: false,
        recipeQuery: trimmedQuery,
        message: `No active recipe matched "${trimmedQuery}".`,
      } satisfies ScaleRecipeToolNotFound);
    }

    const batches = targetCount ?? 1;
    const scaleFactor = calculateScaleFactor(
      dbRecipe.yield.panDiameterInches,
      targetPanDiameterInches,
      1,
      batches
    );

    const scaledComponents = scaleRecipe(
      {
        name: dbRecipe.name,
        yield: { panDiameterInches: dbRecipe.yield.panDiameterInches },
        components: dbRecipe.components.map((component) => ({
          name: component.name,
          ingredients: component.ingredients.map((ingredient) => ({
            name: ingredient.name,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            isScalable: ingredient.isScalable,
          })),
        })),
      },
      { targetPanDiameterInches, targetCount: batches }
    );

    return serializeToolResult({
      found: true,
      recipeName: dbRecipe.name,
      scaleFactor,
      sourcePanDiameterInches: dbRecipe.yield.panDiameterInches,
      targetPanDiameterInches,
      targetCount: batches,
      scaledComponents,
    } satisfies ScaleRecipeToolSuccess);
  },
});

export const draftMessage = tool({
  description:
    "Draft a customer message from the fixed template. Read-only — it never " +
    "sends. Call at most once per turn. Pass the short code or order id already " +
    "on screen; do not call findOrders first when that code is already known. " +
    "Do not rewrite bodyText, prices, or payment URLs. Do not call " +
    "sendCustomerMessage; the baker sends from the draft card.",
  inputSchema: z.object({
    orderQuery: z
      .string()
      .min(2)
      .describe(
        "Order lookup text: 24-character order id, 6-character short code, customer name, phone, or email."
      ),
    intent: z
      .enum(MESSAGE_INTENTS)
      .describe(
        "payment_reminder for an outstanding balance, order_ready for pickup/delivery readiness, inquiry_response to quote a custom request, general_update for anything else."
      ),
    customNotes: z
      .string()
      .max(1000)
      .optional()
      .describe(
        "Optional extra sentences from the baker to insert before the closing line. Pass her wording, do not invent details."
      ),
  }),
  execute: async ({ orderQuery, intent, customNotes }) => {
    const { target, otherMatches } = await findMessagingTarget(orderQuery);

    if (!target) {
      return serializeToolResult({
        found: false,
        orderQuery,
        message: `No order or custom request matched "${orderQuery}".`,
      } satisfies DraftMessageToolNotFound);
    }

    const draft = buildCustomerMessageDraft(target.draftSource, {
      intent,
      customNotes,
    });

    return serializeToolResult({
      found: true,
      orderId: target.orderId,
      orderType: target.orderType,
      shortId: target.shortId,
      intent,
      customerName: target.contact.name?.trim() || "there",
      recipientEmail: target.contact.email?.trim() || undefined,
      recipientPhone: target.contact.phone?.trim() || undefined,
      subject: draft.subject,
      bodyText: draft.bodyText,
      actionButton: draft.actionButton,
      canEmail: isSendableEmail(target.contact.email),
      otherMatches,
    } satisfies DraftMessageToolSuccess);
  },
});

function createSendCustomerMessageTool(boundAdminUid: string) {
  return tool({
    description:
      "Email the exact draft. Requires approval. Do not call this from a chat " +
      "reply — the Send email button starts it. If invoked, copy orderId, " +
      "orderType, recipientEmail, subject, bodyText, and actionButton verbatim. " +
      "Never rewrite them. The recipient is re-checked against the order.",
    inputSchema: z.object({
      orderId: objectIdStringSchema.describe(
        "The orderId returned by draftMessage."
      ),
      orderType: messageOrderTypeSchema.describe(
        "The orderType returned by draftMessage: 'regular' or 'custom'."
      ),
      recipientEmail: z
        .email()
        .describe(
          "Must equal the customer email stored on the order. Use draftMessage's recipientEmail verbatim."
        ),
      subject: messageSubjectSchema.describe("Email subject line."),
      bodyText: messageBodySchema.describe(
        "The full draft body, copied verbatim from draftMessage."
      ),
      actionButton: actionButtonSchema
        .optional()
        .describe(
          "Optional call-to-action button, copied verbatim from draftMessage. Must be an https link."
        ),
    }),
    execute: async (
      { orderId, orderType, recipientEmail, subject, bodyText, actionButton },
      options
    ) => {
      const adminUid = resolveAdminUid(boundAdminUid, options);

      try {
        const result = await sendCustomerMessage({
          orderId,
          orderType,
          recipientEmail,
          subject,
          bodyText,
          actionButton,
          adminUid,
          tool: "sendCustomerMessage",
        });

        return serializeToolResult({
          success: true,
          messageId: result.messageId,
          recipientEmail: result.recipientEmail,
          subject: result.subject,
        } satisfies SendCustomerMessageToolSuccess);
      } catch (error) {
        const message =
          error instanceof SendCustomerMessageError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Failed to send the message.";

        return serializeToolResult({
          success: false,
          message,
        } satisfies SendCustomerMessageToolError);
      }
    },
  });
}

export function createBakerTools(adminUid = UNKNOWN_ADMIN_UID) {
  return {
    findOrders,
    resolveDate,
    getCustomerHistory,
    getDailyBrief,
    manageCalendar: createManageCalendarTool(adminUid),
    scaleRecipe: scaleRecipeTool,
    draftMessage,
    sendCustomerMessage: createSendCustomerMessageTool(adminUid),
  };
}

/** Default registry for type inference only — chat route must call createBakerTools(). */
export const bakerTools = createBakerTools(UNKNOWN_ADMIN_UID);

export type BakerTools = ReturnType<typeof createBakerTools>;
