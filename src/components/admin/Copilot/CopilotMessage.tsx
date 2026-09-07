"use client";

import { useState } from "react";
import {
  CalendarRange,
  Loader2,
  MailCheck,
  SearchX,
  TriangleAlert,
} from "lucide-react";
import type { ChatAddToolApproveResponseFunction } from "ai";
import type {
  BakerUIMessage,
  SendCustomerMessageToolResult,
  SendMessageRequest,
} from "@/lib/ai/uiMessage";
import { cn } from "@/lib/utils";
import CustomRequestCard from "./CustomRequestCard";
import DailyBriefCard from "./DailyBriefCard";
import OrderSummaryCard from "./OrderSummaryCard";
import RecipeScaleCard from "./cards/RecipeScaleCard";
import CalendarApprovalCard from "./cards/CalendarApprovalCard";
import CalendarCard from "./cards/CalendarCard";
import DraftMessageCard from "./cards/DraftMessageCard";
import SendMessageApprovalCard from "./cards/SendMessageApprovalCard";

/** Shown while a tool call is being assembled or executed. */
function ToolCallSkeleton({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-sm rounded-medium border border-border bg-card-background px-md py-sm font-body text-small text-primary/60">
      <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
      {label}
    </div>
  );
}

function ToolCallError({ label, message }: { label: string; message?: string }) {
  return (
    <div className="rounded-medium border border-error/40 bg-error/10 px-md py-sm font-body text-small text-error">
      <p className="inline-flex items-center gap-sm">
        <TriangleAlert className="h-3.5 w-3.5" />
        {label} failed
      </p>
      {message && <p className="mt-xs text-error/80">{message}</p>}
    </div>
  );
}

/**
 * `resolveDate` is plumbing rather than a headline result, so it renders as a
 * single quiet line — but the resolved window is still shown, because "next
 * week" meaning Sep 14–20 is exactly the detail worth double-checking.
 */
function ResolvedDateChip({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-sm px-md font-body text-small text-primary/50">
      <CalendarRange className="h-3.5 w-3.5 text-accent" />
      {label}
    </div>
  );
}

function EmptyResult({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-sm rounded-medium border border-dashed border-border px-md py-sm font-body text-small text-primary/60">
      <SearchX className="h-3.5 w-3.5" />
      {message}
    </div>
  );
}

type ToolApprovalResponder = ChatAddToolApproveResponseFunction;

/** Skeleton label for an in-flight search, which may be by text, date, or both. */
function describeSearchInput(
  input:
    | { query?: string; startDate?: string; endDate?: string }
    | undefined
): string {
  const query = input?.query?.trim();
  const { startDate, endDate } = input ?? {};

  const window =
    startDate && endDate && startDate !== endDate
      ? `${startDate} – ${endDate}`
      : (startDate ?? endDate);

  if (query && window) return `Searching for "${query}" in ${window}…`;
  if (query) return `Searching for "${query}"…`;
  if (window) return `Searching orders for ${window}…`;
  return "Searching orders…";
}

function ManageCalendarApprovalPart({
  part,
  addToolApprovalResponse,
}: {
  part: Extract<
    BakerUIMessage["parts"][number],
    { type: "tool-manageCalendar"; state: "approval-requested" }
  >;
  addToolApprovalResponse?: ToolApprovalResponder;
}) {
  const [isResponding, setIsResponding] = useState(false);

  const respond = async (approved: boolean) => {
    if (!addToolApprovalResponse || isResponding) return;
    setIsResponding(true);
    try {
      await addToolApprovalResponse({
        id: part.approval.id,
        approved,
      });
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
  addToolApprovalResponse,
}: {
  part: Extract<
    BakerUIMessage["parts"][number],
    { type: "tool-sendCustomerMessage"; state: "approval-requested" }
  >;
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
      isResponding={isResponding}
      onApprove={() => respond(true)}
      onDeny={() => respond(false)}
    />
  );
}

function SendCustomerMessageResult({
  output,
}: {
  output: SendCustomerMessageToolResult;
}) {
  if (!output.success) {
    return <ToolCallError label="Send email" message={output.message} />;
  }

  return (
    <div className="rounded-medium border border-border bg-card-background px-md py-sm font-body text-small text-primary">
      <p className="inline-flex items-center gap-sm">
        <MailCheck className="h-3.5 w-3.5 text-accent" />
        Email sent to {output.recipientEmail}
      </p>
      <p className="mt-xs text-primary/60">{output.subject}</p>
    </div>
  );
}

export function CopilotMessage({
  message,
  addToolApprovalResponse,
  onSendEmail,
}: {
  message: BakerUIMessage;
  addToolApprovalResponse?: ToolApprovalResponder;
  onSendEmail?: (request: SendMessageRequest) => void;
}) {
  const isUser = message.role === "user";

  return (
    <div className={cn("space-y-sm", isUser ? "pl-xl" : "pr-xs")}>
      {message.parts.map((part, index) => {
        const key = `${message.id}-${index}`;

        switch (part.type) {
          case "text":
            if (!part.text.trim()) return null;
            return (
              <div
                key={key}
                className={cn(
                  "whitespace-pre-wrap rounded-large px-md py-sm font-body text-body",
                  isUser
                    ? "ml-auto w-fit bg-primary text-text-on-primary"
                    : "bg-card-background text-primary"
                )}
              >
                {part.text}
              </div>
            );

          case "tool-findOrders": {
            switch (part.state) {
              case "input-streaming":
              case "input-available":
                return (
                  <ToolCallSkeleton
                    key={key}
                    label={describeSearchInput(part.input)}
                  />
                );

              case "output-available": {
                const { orders, customOrders, truncated, criteria } =
                  part.output;

                if (orders.length === 0 && customOrders.length === 0) {
                  return (
                    <EmptyResult
                      key={key}
                      message={
                        criteria
                          ? `Nothing matched ${criteria}.`
                          : "Nothing matched that search."
                      }
                    />
                  );
                }

                return (
                  <div key={key} className="space-y-sm">
                    {orders.map((order) => (
                      <OrderSummaryCard key={order._id} order={order} />
                    ))}
                    {customOrders.map((request) => (
                      <CustomRequestCard key={request._id} request={request} />
                    ))}
                    {truncated && (
                      <p className="font-body text-small text-primary/50">
                        More results exist — narrow the search to see them.
                      </p>
                    )}
                  </div>
                );
              }

              case "output-error":
                return (
                  <ToolCallError
                    key={key}
                    label="Search"
                    message={part.errorText}
                  />
                );

              default:
                return null;
            }
          }

          case "tool-resolveDate": {
            switch (part.state) {
              case "input-streaming":
              case "input-available":
                return (
                  <ToolCallSkeleton
                    key={key}
                    label={
                      part.input?.expression
                        ? `Working out "${part.input.expression}"…`
                        : "Working out the date…"
                    }
                  />
                );

              case "output-available":
                return part.output.resolved ? (
                  <ResolvedDateChip
                    key={key}
                    label={`${part.output.expression} → ${part.output.label}`}
                  />
                ) : (
                  <EmptyResult key={key} message={part.output.message} />
                );

              case "output-error":
                return (
                  <ToolCallError
                    key={key}
                    label="Date lookup"
                    message={part.errorText}
                  />
                );

              default:
                return null;
            }
          }

          case "tool-getDailyBrief": {
            switch (part.state) {
              case "input-streaming":
              case "input-available":
                return (
                  <ToolCallSkeleton key={key} label="Reading the schedule…" />
                );

              case "output-available":
                return <DailyBriefCard key={key} brief={part.output} />;

              case "output-error":
                return (
                  <ToolCallError
                    key={key}
                    label="Daily brief"
                    message={part.errorText}
                  />
                );

              default:
                return null;
            }
          }

          case "tool-scaleRecipe": {
            switch (part.state) {
              case "input-streaming":
              case "input-available":
                return (
                  <ToolCallSkeleton
                    key={key}
                    label={
                      part.input?.recipeQuery
                        ? `Scaling "${part.input.recipeQuery}"…`
                        : "Scaling recipe…"
                    }
                  />
                );

              case "output-available":
                return (
                  <RecipeScaleCard key={key} result={part.output} />
                );

              case "output-error":
                return (
                  <ToolCallError
                    key={key}
                    label="Recipe scale"
                    message={part.errorText}
                  />
                );

              default:
                return null;
            }
          }

          case "tool-manageCalendar": {
            switch (part.state) {
              case "input-streaming":
              case "input-available":
                return (
                  <ToolCallSkeleton
                    key={key}
                    label="Preparing calendar change…"
                  />
                );

              case "approval-requested":
                return (
                  <ManageCalendarApprovalPart
                    key={key}
                    part={part}
                    addToolApprovalResponse={addToolApprovalResponse}
                  />
                );

              case "approval-responded":
                return (
                  <ToolCallSkeleton
                    key={key}
                    label={
                      part.approval.approved
                        ? "Applying schedule change…"
                        : "Schedule change denied…"
                    }
                  />
                );

              case "output-available":
                return <CalendarCard key={key} result={part.output} />;

              case "output-denied":
                return (
                  <div
                    key={key}
                    className="rounded-medium border border-border bg-card-background px-md py-sm font-body text-small text-primary/70"
                  >
                    Calendar change denied — no dates were modified.
                    {part.input.reason && (
                      <span className="mt-xs block text-primary/50">
                        Requested: {part.input.reason}
                      </span>
                    )}
                  </div>
                );

              case "output-error":
                return (
                  <ToolCallError
                    key={key}
                    label="Calendar update"
                    message={part.errorText}
                  />
                );

              default:
                return null;
            }
          }

          case "tool-draftMessage": {
            switch (part.state) {
              case "input-streaming":
              case "input-available":
                return (
                  <ToolCallSkeleton
                    key={key}
                    label={
                      part.input?.orderQuery
                        ? `Drafting a message for "${part.input.orderQuery}"…`
                        : "Drafting a message…"
                    }
                  />
                );

              case "output-available":
                return (
                  <DraftMessageCard
                    key={key}
                    result={part.output}
                    onSendEmail={onSendEmail}
                  />
                );

              case "output-error":
                return (
                  <ToolCallError
                    key={key}
                    label="Message draft"
                    message={part.errorText}
                  />
                );

              default:
                return null;
            }
          }

          case "tool-sendCustomerMessage": {
            switch (part.state) {
              case "input-streaming":
              case "input-available":
                return (
                  <ToolCallSkeleton key={key} label="Preparing the email…" />
                );

              case "approval-requested":
                return (
                  <SendCustomerMessageApprovalPart
                    key={key}
                    part={part}
                    addToolApprovalResponse={addToolApprovalResponse}
                  />
                );

              case "approval-responded":
                return (
                  <ToolCallSkeleton
                    key={key}
                    label={
                      part.approval.approved
                        ? "Sending email…"
                        : "Email cancelled…"
                    }
                  />
                );

              case "output-available":
                return (
                  <SendCustomerMessageResult key={key} output={part.output} />
                );

              case "output-denied":
                return (
                  <div
                    key={key}
                    className="rounded-medium border border-border bg-card-background px-md py-sm font-body text-small text-primary/70"
                  >
                    Email denied — nothing was sent to{" "}
                    {part.input.recipientEmail}.
                  </div>
                );

              case "output-error":
                return (
                  <ToolCallError
                    key={key}
                    label="Send email"
                    message={part.errorText}
                  />
                );

              default:
                return null;
            }
          }

          // Tools registered at runtime rather than compile time.
          case "dynamic-tool":
            return part.state === "output-error" ? (
              <ToolCallError
                key={key}
                label={part.toolName}
                message={part.errorText}
              />
            ) : (
              <ToolCallSkeleton key={key} label={`Running ${part.toolName}…`} />
            );

          default:
            return null;
        }
      })}
    </div>
  );
}

export default CopilotMessage;
