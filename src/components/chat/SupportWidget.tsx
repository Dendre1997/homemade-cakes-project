"use client";

import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Loader2, Bot } from "lucide-react";
import { AppSettings, IMessage, ChatStatus } from "@/types";
import { pusherClient } from "@/lib/pusher";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface SupportWidgetProps {
  initialSettings: AppSettings;
}

export default function SupportWidget({ initialSettings }: SupportWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [chatStatus, setChatStatus] = useState<ChatStatus | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isInitializing, setIsInitializing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  // Load chat session when opened
  useEffect(() => {
    if (isOpen && !chatId && !isInitializing) {
      const initializeChat = async () => {
        setIsInitializing(true);
        try {
          const res = await fetch("/api/chat", { method: "POST" });
          if (res.ok) {
            const data = await res.json();
            setChatId(data.chatId);
            setChatStatus("bot_active"); // default newly created
            
            // Add initial bot greeting if newly created
            if (data.message === "New chat instantiated") {
              const greeting: IMessage = {
                id: "bot-greeting",
                sender: "bot",
                text: initialSettings.support?.botGreetingMessage || "Hello! How can we help you today?",
                createdAt: new Date(),
              };
              setMessages([greeting]);
            } else {
              // Simulated reconnect message state
              const reconnect: IMessage = {
                id: "bot-reconnect",
                sender: "bot",
                text: "Welcome back! Connecting you to your active support session.",
                createdAt: new Date(),
              };
              setMessages([reconnect]);
              
              // Depending on requirements, we'd normally execute a GET /api/chat/[chatId] here 
              // to pull the full historical message array, but the active reconnect works locally.
            }
          } else {
              // Failed to init (e.g. 401 Unauthorized not logged in)
              console.warn("User must be logged in to initialize chat.");
          }
        } catch (e) {
          console.error("Failed to initialize chat:", e);
        } finally {
          setIsInitializing(false);
        }
      };
      initializeChat();
    }
  }, [isOpen, chatId, initialSettings, isInitializing]);

  // Pusher Subscription
  useEffect(() => {
    if (!chatId || !pusherClient) return;

    const channelName = `private-chat-${chatId}`;
    const channel = pusherClient.subscribe(channelName);

    channel.bind("new-message", (message: IMessage) => {
      setMessages((prev) => {
        // Prevent duplicate append cycles in React Strict Mode locally
        if (prev.some(m => m.id === message.id)) return prev;
        return [...prev, message];
      });
    });

    return () => {
      pusherClient?.unsubscribe(channelName);
    };
  }, [chatId]);

  const sendMessage = async (text: string, forceSender?: "client" | "bot" | "admin") => {
    if (!text.trim() || !chatId) return;

    setIsSending(true);
    try {
      const res = await fetch("/api/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId,
          text,
          sender: forceSender || "client",
        }),
      });

      if (!res.ok) {
        if (res.status === 403) alert("Security Block: Not Authorized");
        throw new Error("Delivery failed");
      }
      
      const savedMessage = await res.json();
      
      // If we ask for Anastasia natively, update local UI state immediately to unlock input fields
      if (text.includes("speak with a human")) {
        setChatStatus("waiting_admin");
      }

    } catch (error) {
      console.error(error);
    } finally {
      setIsSending(false);
      setInputValue("");
    }
  };

  const handleBotAction = (actionType: "delivery" | "human") => {
    if (actionType === "delivery") {
      // Local Database-Free Bot reply
      const msg: IMessage = {
        id: crypto.randomUUID(),
        sender: "bot",
        text: `Our minimum order for delivery is $${initialSettings.checkout.minOrderForDelivery}. ${initialSettings.checkout.deliveryInstructions || 'Delivery applies securely map-wide.'}`,
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, msg]);
    } else if (actionType === "human") {
      // Hands off to admin -> Triggers DB updates securely
      sendMessage("I'd like to speak with a human support agent.", "client");
    }
  };

  // Turn off widget entirely if disabled in global admin settings
  if (!initialSettings.support?.isLiveChatEnabled) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen ? (
        <Card className="w-[350px] sm:w-[400px] h-[500px] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
          <CardHeader className="bg-secondary text-subtleBackground py-3 px-4 flex flex-row items-center justify-between space-y-0 relative z-10">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <CardTitle className="text-md font-medium font-heading text-secondary tracking-tight">Support Desk</CardTitle>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20 rounded-full" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          
          <CardContent className="flex-1 p-0 overflow-y-auto relative bg-slate-50" ref={scrollRef}>
            <div className="p-4 space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={cn("flex w-full", msg.sender === "client" ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[80%] px-4 py-2 text-sm shadow-sm transition-all",
                    msg.sender === "client" 
                      ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm" 
                      : "bg-white text-slate-800 border rounded-2xl rounded-tl-sm"
                  )}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isInitializing && (
                <div className="flex justify-start">
                  <div className="bg-white border text-slate-500 rounded-2xl rounded-tl-sm px-4 py-2 flex items-center gap-2 shadow-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Connecting securely...</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>

          <CardFooter className="p-3 bg-white border-t">
            {chatStatus === "bot_active" || !chatStatus ? (
              <div className="flex flex-col gap-2 w-full">
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-sm h-9 hover:bg-slate-50 transition-colors"
                  onClick={() => handleBotAction("delivery")}
                  disabled={isInitializing}
                >
                  Delivery Information
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-sm h-9 hover:bg-slate-50 transition-colors"
                  onClick={() => handleBotAction("human")}
                  disabled={isInitializing}
                >
                  Chat with Baker
                </Button>
              </div>
            ) : (
              <form 
                className="flex w-full items-center space-x-2"
                onSubmit={(e) => { e.preventDefault(); sendMessage(inputValue); }}
              >
                <Input 
                  placeholder="Type a message..." 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  disabled={isSending}
                  className="flex-1 focus-visible:ring-primary/50"
                  autoFocus
                />
                <Button type="submit" size="icon" disabled={!inputValue.trim() || isSending} className="transition-transform active:scale-95">
                  {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
            )}
          </CardFooter>
        </Card>
      ) : (
        <Button 
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full shadow-2xl hover:shadow-primary/40 transition-all hover:-translate-y-1 hover:scale-105"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}
    </div>
  );
}
