"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithApprovalResponses } from "ai";
import { Mic, Send, Sparkles, Square, TriangleAlert, X } from "lucide-react";
import type { BakerUIMessage, SendMessageRequest } from "@/lib/ai/uiMessage";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import CopilotMessage, { CopilotWorkingRow } from "./CopilotMessage";
import {
  buildThreadPlans,
  conversationLanguage,
  draftIntent,
  pendingApprovalIds,
  presentClientError,
  type DraftKind,
} from "./composeAnswer";
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
  const [expiredApprovalIds, setExpiredApprovalIds] = useState<Set<string>>(
    () => new Set()
  );
  const panelRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const revealTimeoutRef = useRef<number | null>(null);
  const stickToBottomRef = useRef(true);
  const chatGenerationRef = useRef(0);
  const sendGuardRef = useRef(false);
  const newChatTimersRef = useRef<number[]>([]);

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

  const {
    messages,
    sendMessage,
    setMessages,
    status,
    error,
    stop,
    clearError,
    addToolApprovalResponse,
  } = useChat<BakerUIMessage>({
    transport: new DefaultChatTransport({ api: "/api/admin/ai/chat" }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
  });

  const isBusy = status === "submitted" || status === "streaming";
  const plans = useMemo(
    () => buildThreadPlans(messages, expiredApprovalIds),
    [messages, expiredApprovalIds]
  );
  const lastPlan = plans[plans.length - 1];
  const answerStarted =
    lastPlan?.role === "assistant" &&
    Boolean(lastPlan.status || lastPlan.blocks.length > 0 || lastPlan.headline);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    sendGuardRef.current = false;
  }, [messages]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    const onScroll = () => {
      const distance =
        element.scrollHeight - element.scrollTop - element.clientHeight;
      stickToBottomRef.current = distance < 96;
    };

    element.addEventListener("scroll", onScroll, { passive: true });
    return () => element.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!stickToBottomRef.current) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
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
      for (const timer of newChatTimersRef.current) window.clearTimeout(timer);
    };
  }, []);

  /** After the keyboard animation, keep the composer in the visible viewport. */
  const revealComposer = () => {
    if (revealTimeoutRef.current !== null) {
      window.clearTimeout(revealTimeoutRef.current);
    }
    revealTimeoutRef.current = window.setTimeout(() => {
      inputRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 300);
  };

  const expireOpenApprovals = () => {
    const ids = pendingApprovalIds(messages);
    if (ids.length === 0) return;
    setExpiredApprovalIds((current) => {
      const next = new Set(current);
      for (const id of ids) next.add(id);
      return next;
    });
  };

  const submit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isBusy) return;
    chatGenerationRef.current += 1;
    if (error) clearError();
    stopListening();
    expireOpenApprovals();
    stickToBottomRef.current = true;
    sendMessage({ text: trimmed });
    setInput("");
  };

  const startNewChat = () => {
    const generation = chatGenerationRef.current + 1;
    chatGenerationRef.current = generation;
    void stop();
    stopListening();
    setInput("");
    setExpiredApprovalIds(new Set());
    setMessages([]);
    if (error) clearError();
    stickToBottomRef.current = true;
    // A stream abort can write the partial reply after the clear. Drop it
    // again once that write has landed, unless a newer turn already started.
    for (const timer of newChatTimersRef.current) window.clearTimeout(timer);
    newChatTimersRef.current = [50, 300].map((delay) =>
      window.setTimeout(() => {
        if (chatGenerationRef.current === generation) setMessages([]);
      }, delay)
    );
  };

  const onDraftMessage = (kind: DraftKind, shortId: string) => {
    submit(draftIntent(kind, shortId, conversationLanguage(messages)));
  };

  /**
   * "Send email" opens the approval card directly. The letter stays on the
   * draft; it is not pasted into a user bubble for the model to retype.
   */
  const requestEmailSend = (request: SendMessageRequest) => {
    if (isBusy || sendGuardRef.current) return;
    chatGenerationRef.current += 1;
    if (error) clearError();
    sendGuardRef.current = true;
    expireOpenApprovals();
    stickToBottomRef.current = true;

    const approvalMessage: BakerUIMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      parts: [
        {
          type: "tool-sendCustomerMessage",
          toolCallId: crypto.randomUUID(),
          state: "approval-requested",
          input: {
            orderId: request.orderId,
            orderType: request.orderType,
            recipientEmail: request.recipientEmail,
            subject: request.subject,
            bodyText: request.bodyText,
            ...(request.actionButton
              ? { actionButton: request.actionButton }
              : {}),
          },
          approval: { id: crypto.randomUUID() },
        },
      ],
    };

    setMessages((current) => [...current, approvalMessage]);
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
          <div className="flex items-center gap-sm">
            <button
              type="button"
              onClick={startNewChat}
              disabled={messages.length === 0}
              className="font-body text-small text-primary/60 transition-colors hover:text-primary disabled:pointer-events-none disabled:opacity-40"
            >
              New chat
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close copilot"
              className="rounded-medium p-1 transition-colors hover:bg-subtleBackground"
            >
              <X className="h-5 w-5 text-primary" />
            </button>
          </div>
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
            messages.map((message, index) => (
              <CopilotMessage
                key={message.id}
                plan={plans[index]}
                busy={isBusy}
                addToolApprovalResponse={addToolApprovalResponse}
                onSendEmail={requestEmailSend}
                onDraftMessage={onDraftMessage}
              />
            ))
          )}

          {isBusy && !answerStarted && <CopilotWorkingRow />}

          {error && (
            <ChatError message={error.message} />
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

function ChatError({ message }: { message?: string }) {
  const presented = presentClientError(message);
  return (
    <div className="rounded-medium border border-error/40 bg-error/10 px-md py-sm font-body text-small text-error">
      <p className="inline-flex items-center gap-sm">
        <TriangleAlert className="h-3.5 w-3.5" />
        {presented.lead}
      </p>
      {presented.detail && (
        <p className="mt-xs text-error/80">{presented.detail}</p>
      )}
    </div>
  );
}

export default CopilotPanel;
