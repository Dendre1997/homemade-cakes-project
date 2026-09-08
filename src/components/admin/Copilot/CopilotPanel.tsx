"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithApprovalResponses } from "ai";
import { Loader2, Mic, Send, Sparkles, Square, TriangleAlert, X } from "lucide-react";
import type { BakerUIMessage, SendMessageRequest } from "@/lib/ai/uiMessage";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import CopilotMessage from "./CopilotMessage";
import { useSpeechInput } from "./useSpeechInput";

/**
 * Pin a fixed drawer to the *visible* viewport. `100vh` / even `100dvh` stay
 * at the full screen height on iOS Safari when the on-screen keyboard opens,
 * which is why the composer disappears behind it. `visualViewport` reports
 * the rectangle above the keyboard — that is the height the drawer must use.
 */
function useVisualViewportLock(
  enabled: boolean,
  elementRef: RefObject<HTMLElement | null>
) {
  useEffect(() => {
    if (!enabled) return;

    const element = elementRef.current;
    const viewport = window.visualViewport;
    if (!element || !viewport) return;

    const sync = () => {
      element.style.height = `${Math.round(viewport.height)}px`;
      element.style.top = `${Math.round(viewport.offsetTop)}px`;
    };

    sync();
    viewport.addEventListener("resize", sync);
    viewport.addEventListener("scroll", sync);
    return () => {
      viewport.removeEventListener("resize", sync);
      viewport.removeEventListener("scroll", sync);
      element.style.height = "";
      element.style.top = "";
    };
  }, [enabled, elementRef]);
}

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
  const panelRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const revealTimeoutRef = useRef<number | null>(null);

  useVisualViewportLock(isOpen, panelRef);

  const {
    isSupported: isSpeechSupported,
    isListening,
    lang,
    toggleLang,
    toggleListening,
    stop: stopListening,
  } = useSpeechInput({
    input,
    onTranscript: (text) => setInput(text),
    enabled: isOpen,
  });

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

  useEffect(() => {
    return () => {
      if (revealTimeoutRef.current !== null) {
        window.clearTimeout(revealTimeoutRef.current);
      }
    };
  }, []);

  /** After the keyboard animation, keep the composer in the visible viewport. */
  const revealComposer = () => {
    if (revealTimeoutRef.current !== null) {
      window.clearTimeout(revealTimeoutRef.current);
    }
    revealTimeoutRef.current = window.setTimeout(() => {
      inputRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }, 300);
  };

  const submit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isBusy) return;
    if (error) clearError();
    stopListening();
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
        ref={panelRef}
        aria-label="Baker Copilot"
        aria-hidden={!isOpen}
        className={cn(
          "fixed right-0 top-0 z-50 flex h-dvh max-h-dvh w-full flex-col overflow-hidden border-l border-border bg-background",
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

        <div
          ref={scrollRef}
          className="min-h-0 flex-1 space-y-md overflow-y-auto overscroll-y-contain p-md"
        >
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
          className="flex-shrink-0 border-t border-border p-md pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <div className="flex items-end gap-xs">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onFocus={revealComposer}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submit(input);
                }
              }}
              rows={2}
              placeholder={
                isListening
                  ? lang === "uk-UA"
                    ? "Слухаю…"
                    : "Listening…"
                  : "Ask about your bakery…"
              }
              className="min-w-0 flex-1 resize-none rounded-medium border border-border bg-card-background px-md py-sm font-body text-body text-primary placeholder:text-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />

            <div className="flex shrink-0 items-center gap-1 pb-px">
              {isSpeechSupported && (
                <>
                  <button
                    type="button"
                    onClick={toggleLang}
                    title={
                      lang === "uk-UA"
                        ? "Мова розпізнавання: українська. Натисніть для English."
                        : "Recognition language: English. Tap for Ukrainian."
                    }
                    aria-label={
                      lang === "uk-UA"
                        ? "Мова: українська. Перемкнути на англійську"
                        : "Language: English. Switch to Ukrainian"
                    }
                    className="h-8 min-w-[2.25rem] rounded-full border border-border bg-subtleBackground px-2 font-body text-[11px] font-semibold tracking-wide text-primary/70 transition-colors hover:border-accent hover:text-accent"
                  >
                    {lang === "uk-UA" ? "UA" : "EN"}
                  </button>
                  <button
                    type="button"
                    onClick={toggleListening}
                    aria-pressed={isListening}
                    aria-label={
                      isListening ? "Зупинити" : "Почати голосовий ввід"
                    }
                    title={isListening ? "Зупинити" : "Почати голосовий ввід"}
                    className={cn(
                      "inline-flex h-8 w-8 items-center justify-center rounded-medium transition-colors",
                      isListening
                        ? "animate-pulse bg-error/10 text-error"
                        : "text-primary/70 hover:bg-subtleBackground hover:text-primary"
                    )}
                  >
                    <Mic className="h-4 w-4" />
                  </button>
                </>
              )}

              {isBusy ? (
                <Button
                  type="button"
                  onClick={() => stop()}
                  size="icon"
                  variant="secondary"
                  aria-label="Stop generating"
                  className="h-8 w-8"
                >
                  <Square className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim()}
                  aria-label="Send message"
                  className="h-8 w-8 rounded-medium"
                >
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </form>
      </aside>
    </>
  );
}

export default CopilotPanel;
