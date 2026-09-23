"use client";

import { Loader2, MailCheck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface SendMessageApprovalCardProps {
  recipientEmail: string;
  subject: string;
  bodyText: string;
  actionButton?: { label: string; url: string };
  /** The draft is still on screen, so the letter itself stays behind a disclosure. */
  compact?: boolean;
  onApprove: () => void;
  onDeny: () => void;
  isResponding?: boolean;
  className?: string;
}

export function SendMessageApprovalCard({
  recipientEmail,
  subject,
  bodyText,
  actionButton,
  compact = false,
  onApprove,
  onDeny,
  isResponding = false,
  className,
}: SendMessageApprovalCardProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-large border border-border bg-card-background shadow-sm",
        className
      )}
    >
      <div className="border-b border-border bg-subtleBackground px-md py-sm">
        <p className="inline-flex items-center gap-sm font-heading text-h5 text-primary">
          <MailCheck className="h-4 w-4 text-accent" />
          Send this email?
        </p>
        <p className="mt-xs font-body text-small text-primary/60">
          It goes to the customer immediately once you approve.
        </p>
      </div>

      <div className="space-y-md p-md">
        <div>
          <p className="font-body text-small font-semibold text-primary/70">
            To
          </p>
          <p className="mt-xs break-all font-body text-small text-primary">
            {recipientEmail}
          </p>
        </div>

        <div>
          <p className="font-body text-small font-semibold text-primary/70">
            Subject
          </p>
          <p className="mt-xs font-body text-small text-primary">{subject}</p>
        </div>

        {compact ? (
          <div>
            <p className="font-body text-small text-primary/70">
              Same text as the draft above
            </p>
            <details className="mt-xs">
              <summary className="cursor-pointer font-body text-small text-primary/50">
                Show the message
              </summary>
              <pre className="mt-xs max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-medium border border-border bg-background px-sm py-sm font-body text-small leading-relaxed text-primary">
                {bodyText}
              </pre>
            </details>
            {actionButton && (
              <p className="mt-sm font-body text-small text-primary/60">
                Includes the payment link.
              </p>
            )}
          </div>
        ) : (
          <div>
            <p className="font-body text-small font-semibold text-primary/70">
              Message
            </p>
            <pre className="mt-xs max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-medium border border-border bg-background px-sm py-sm font-body text-small leading-relaxed text-primary">
              {bodyText}
            </pre>
          </div>
        )}

        {!compact && actionButton && (
          <div>
            <p className="font-body text-small font-semibold text-primary/70">
              Button
            </p>
            <div className="mt-xs space-y-xs">
              <Badge variant="secondary">{actionButton.label}</Badge>
              <p className="break-all font-body text-small text-primary/60">
                {actionButton.url}
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-sm border-t border-border pt-md">
          <Button
            type="button"
            variant="danger"
            className="flex-1"
            disabled={isResponding}
            onClick={onDeny}
          >
            Deny
          </Button>
          <Button
            type="button"
            variant="primary"
            className="flex-1"
            disabled={isResponding}
            onClick={onApprove}
          >
            {isResponding ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : (
              "Approve & send"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default SendMessageApprovalCard;
