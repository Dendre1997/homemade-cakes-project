"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithApprovalResponses } from "ai";
import { Loader2, Send, Sparkles, Square, TriangleAlert, X } from "lucide-react";
import type { BakerUIMessage, SendMessageRequest } from "@/lib/ai/uiMessage";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import CopilotMessage from "./CopilotMessage";

const SUGGESTIONS = [
  "What's my day look like?",
  "Who still owes me money?",
  "Do I have room this Saturday?",
  "Find the order for Sarah",
];

interface CopilotPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CopilotPanel({ isOpen, onClose }: CopilotPanelProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { messages, sendMessage, status, error, stop, clearError, addToolApprovalResponse } =
    useChat<BakerUIMessage>({
      transport: new DefaultChatTransport({ api: "/api/admin/ai/chat" }),
      sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    });

  const isBusy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, status]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const submit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isBusy) return;
    if (error) clearError();
    sendMessage({ text: trimmed });
    setInput("");
  };

  /**
   * "Send email" on a draft card. The arguments are spelled out rather than
   * referenced ("send the draft above") because the model would otherwise
   * paraphrase the body, and the wording is deterministic by design (§10).
   */
  const requestEmailSend = (request: SendMessageRequest) => {
    if (isBusy) return;
    if (error) clearError();

    const lines = [
      "Send this email now. Call sendCustomerMessage with exactly these arguments — copy them character for character and change nothing:",
      `orderId: ${request.orderId}`,
      `orderType: ${request.orderType}`,
      `recipientEmail: ${request.recipientEmail}`,
      `subject: ${request.subject}`,
    ];

    if (request.actionButton) {
      lines.push(
        `actionButton.label: ${request.actionButton.label}`,
        `actionButton.url: ${request.actionButton.url}`
      );
    }

    lines.push("bodyText:", request.bodyText);

    sendMessage({ text: lines.join("\n") });
  };

  return (
    <>
      {/* Backdrop — mobile only, so the panel can sit beside content on desktop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={cn(
          "fixed inset-0 z-40 bg-primary/30 transition-opacity lg:hidden",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />

      <aside
        aria-label="Baker Copilot"
        aria-hidden={!isOpen}
        className={cn(
          "fixed right-0 top-0 z-50 flex h-screen w-full flex-col border-l border-border bg-background",
          "shadow-lg transition-transform duration-300 ease-out sm:w-[420px]",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-border px-md py-sm">
          <p className="inline-flex items-center gap-sm font-heading text-h3 text-primary">
            <Sparkles className="h-5 w-5 text-accent" />
            Copilot
          </p>
          <button
            onClick={onClose}
            aria-label="Close copilot"
            className="rounded-medium p-1 transition-colors hover:bg-subtleBackground"
          >
            <X className="h-5 w-5 text-primary" />
          </button>
        </header>

        <div ref={scrollRef} className="flex-1 space-y-md overflow-y-auto p-md">
          {messages.length === 0 ? (
            <div className="space-y-md">
              <p className="font-body text-small text-primary/60">
                Ask about orders, capacity, payments or custom requests. Answers
                come from your live data, never from guesswork.
              </p>
              <div className="space-y-xs">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => submit(suggestion)}
                    className="w-full rounded-medium border border-border bg-card-background px-md py-sm text-left font-body text-small text-primary transition-colors hover:border-accent hover:bg-card-background/80"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <CopilotMessage
                key={message.id}
                message={message}
                addToolApprovalResponse={addToolApprovalResponse}
                onSendEmail={requestEmailSend}
              />
            ))
          )}

          {status === "submitted" && (
            <div className="inline-flex items-center gap-sm font-body text-small text-primary/60">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
              Thinking…
            </div>
          )}

          {error && (
            <div className="rounded-medium border border-error/40 bg-error/10 px-md py-sm font-body text-small text-error">
              <p className="inline-flex items-center gap-sm">
                <TriangleAlert className="h-3.5 w-3.5" />
                {error.message || "Something went wrong."}
              </p>
            </div>
          )}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit(input);
          }}
          className="shrink-0 border-t border-border p-md"
        >
          <div className="relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submit(input);
                }
              }}
              rows={2}
              placeholder="Ask about your bakery…"
              className="w-full resize-none rounded-medium border border-border bg-card-background px-md py-sm pr-12 font-body text-body text-primary placeholder:text-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />

            {isBusy ? (
              <Button
                type="button"
                onClick={() => stop()}
                size="icon"
                variant="secondary"
                aria-label="Stop generating"
                className="absolute bottom-sm right-sm h-8 w-8"
              >
                <Square className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim()}
                aria-label="Send message"
                className="absolute bottom-sm right-sm h-8 w-8 rounded-medium"
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
        </form>
      </aside>
    </>
  );
}

export default CopilotPanel;
