"use client";

import { useMemo, useState } from "react";
import {
  Check,
  Copy,
  Mail,
  MailWarning,
  MessageSquare,
  SearchX,
  TriangleAlert,
} from "lucide-react";
import type {
  DraftMessageToolResult,
  DraftMessageToolSuccess,
  SendMessageRequest,
} from "@/lib/ai/uiMessage";
import { formatPhoneForMessaging } from "@/lib/messages/draft";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface DraftMessageCardProps {
  result: DraftMessageToolResult;
  /** Asks the copilot to run `sendCustomerMessage` with this exact draft. */
  onSendEmail?: (request: SendMessageRequest) => void;
  className?: string;
}

const INTENT_LABELS: Record<DraftMessageToolSuccess["intent"], string> = {
  payment_reminder: "Payment reminder",
  order_ready: "Order ready",
  inquiry_response: "Quote reply",
  general_update: "Update",
};

/**
 * Channels without buttons (clipboard, WhatsApp, SMS) need the call-to-action
 * URL inlined; the email renders it as a button instead, so the draft body
 * deliberately omits it.
 */
function withActionUrl(draft: DraftMessageToolSuccess): string {
  if (!draft.actionButton) return draft.bodyText;
  return `${draft.bodyText}\n\n${draft.actionButton.label}: ${draft.actionButton.url}`;
}

export function DraftMessageCard({
  result,
  onSendEmail,
  className,
}: DraftMessageCardProps) {
  const [copied, setCopied] = useState(false);
  const [emailRequested, setEmailRequested] = useState(false);

  const fullText = result.found ? withActionUrl(result) : "";

  const whatsappHref = useMemo(() => {
    if (!result.found) return undefined;
    const digits = formatPhoneForMessaging(result.recipientPhone);
    if (!digits) return undefined;
    return `https://wa.me/${digits}?text=${encodeURIComponent(fullText)}`;
  }, [result, fullText]);

  if (!result.found) {
    return (
      <div
        className={cn(
          "flex items-center gap-sm rounded-medium border border-dashed border-border px-md py-sm font-body text-small text-primary/60",
          className
        )}
      >
        <SearchX className="h-3.5 w-3.5 shrink-0" />
        {result.message}
      </div>
    );
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const requestEmail = () => {
    if (!onSendEmail || !result.recipientEmail || emailRequested) return;
    setEmailRequested(true);
    onSendEmail({
      orderId: result.orderId,
      orderType: result.orderType,
      recipientEmail: result.recipientEmail,
      subject: result.subject,
      bodyText: result.bodyText,
      actionButton: result.actionButton,
    });
  };

  const canEmail = result.canEmail && Boolean(result.recipientEmail);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-large border border-border bg-card-background shadow-sm",
        className
      )}
    >
      <div className="border-b border-border bg-subtleBackground px-md py-sm">
        <p className="inline-flex items-center gap-sm font-heading text-h5 text-primary">
          <MessageSquare className="h-4 w-4 text-accent" />
          Draft message
        </p>
        <p className="mt-xs font-body text-small text-primary/60">
          Nothing has been sent yet — review, then choose a channel.
        </p>
      </div>

      <div className="space-y-md p-md">
        <div className="flex flex-wrap items-center gap-sm">
          <Badge variant="secondary">{INTENT_LABELS[result.intent]}</Badge>
          <Badge variant="outline">
            {result.orderType === "regular" ? "Order" : "Custom request"} #
            {result.shortId}
          </Badge>
        </div>

        {result.otherMatches > 0 && (
          <p className="inline-flex items-start gap-sm rounded-medium border border-border bg-background px-sm py-sm font-body text-small text-primary/70">
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
            {result.otherMatches} other record
            {result.otherMatches === 1 ? "" : "s"} matched this search. Confirm
            this is the right customer before sending.
          </p>
        )}

        {/* ── recipient ── */}
        <div className="space-y-xs rounded-medium border border-border bg-background px-sm py-sm">
          <p className="font-body text-small font-semibold text-primary">
            {result.customerName}
          </p>
          {result.recipientEmail && (
            <p className="break-all font-body text-small text-primary/70">
              {result.recipientEmail}
            </p>
          )}
          {result.recipientPhone && (
            <p className="font-body text-small text-primary/70">
              {result.recipientPhone}
            </p>
          )}
          {!result.recipientEmail && !result.recipientPhone && (
            <p className="font-body text-small text-primary/50">
              No email or phone on file.
            </p>
          )}
        </div>

        {/* ── subject ── */}
        <div>
          <p className="font-body text-small font-semibold text-primary/70">
            Subject
          </p>
          <p className="mt-xs font-body text-small text-primary">
            {result.subject}
          </p>
        </div>

        {/* ── body ── */}
        <div>
          <p className="font-body text-small font-semibold text-primary/70">
            Message
          </p>
          <pre className="mt-xs max-h-80 overflow-y-auto whitespace-pre-wrap break-words rounded-medium border border-border bg-background px-sm py-sm font-body text-small leading-relaxed text-primary">
            {result.bodyText}
          </pre>
        </div>

        {result.actionButton && (
          <div>
            <p className="font-body text-small font-semibold text-primary/70">
              {result.actionButton.label}
            </p>
            <a
              href={result.actionButton.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-xs block break-all font-body text-small text-accent underline underline-offset-4"
            >
              {result.actionButton.url}
            </a>
          </div>
        )}

        {!canEmail && (
          <p className="inline-flex items-start gap-sm font-body text-small text-primary/60">
            <MailWarning className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            This order has no usable email address — use WhatsApp or copy the
            text instead.
          </p>
        )}

        {/* ── actions ── */}
        <div className="flex flex-col gap-sm border-t border-border pt-md sm:flex-row">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={copy}
          >
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Copied
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copy text
              </>
            )}
          </Button>

          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1"
            >
              <Button type="button" variant="secondary" className="w-full">
                <MessageSquare className="mr-2 h-4 w-4" />
                WhatsApp
              </Button>
            </a>
          ) : (
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              disabled
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              WhatsApp
            </Button>
          )}

          <Button
            type="button"
            variant="primary"
            className="flex-1"
            disabled={!canEmail || !onSendEmail || emailRequested}
            onClick={requestEmail}
          >
            <Mail className="mr-2 h-4 w-4" />
            {emailRequested ? "Requested…" : "Send email"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default DraftMessageCard;
