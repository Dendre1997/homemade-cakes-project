"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { MessageCircle, Send, Loader2, Bot, ChevronLeft, PlusCircle, Mail, Phone } from "lucide-react";
import { AppSettings, IChat, IMessage } from "@/types";
import { pusherClient } from "@/lib/pusher";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { botDecisionTree, BotOption } from "@/lib/chat/botLogic";
import { cn } from "@/lib/utils";

interface PopulatedChat extends Omit<IChat, "createdAt" | "updatedAt"> {
  _id: string; // Mongo ID returned as string
  createdAt: string;
  updatedAt: string;
}

export default function ContactClient({ initialSettings }: { initialSettings: AppSettings }) {
  const [isGuest, setIsGuest] = useState(false);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [chats, setChats] = useState<PopulatedChat[]>([]);
  const [activeChat, setActiveChat] = useState<PopulatedChat | null>(null);
  const [messages, setMessages] = useState<IMessage[]>([]);
  
  // Mobile Stack Navigation
  const [isViewingThread, setIsViewingThread] = useState(false);
  
  // Custom Toast State fallback for 429
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isConfirmCloseOpen, setIsConfirmCloseOpen] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  
  // Input Binding
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Bot State
  const [currentBotNodeId, setCurrentBotNodeId] = useState<string>("greeting");

  const scrollRef = useRef<HTMLDivElement>(null);

  const generateTempId = () => Math.random().toString(36).substring(2, 12);

  const appendLocalBotMessage = (text: string) => {
    const newMsg: IMessage = { id: generateTempId(), sender: "bot", text, createdAt: new Date() };
    setMessages(prev => [...prev, newMsg]);
    if (activeChat) {
      setChats(prev => prev.map(c => c._id === activeChat._id ? { ...c, messages: [...(c.messages || []), newMsg] } : c));
    }
  };

  const appendLocalUserMessage = (text: string) => {
    const newMsg: IMessage = { id: generateTempId(), sender: "client", text, createdAt: new Date() };
    setMessages(prev => [...prev, newMsg]);
    if (activeChat) {
      setChats(prev => prev.map(c => c._id === activeChat._id ? { ...c, messages: [...(c.messages || []), newMsg] } : c));
    }
  };

  // Load Chats on Mount
  useEffect(() => {
    const fetchChats = async () => {
      try {
        const res = await fetch("/api/chat");
        if (res.status === 401) {
          setIsGuest(true);
          return;
        }
        if (res.ok) {
          const data = await res.json();
          setChats(data);
        }
      } catch (error) {
        console.error("Failed to load chats:", error);
      } finally {
        setIsLoadingChats(false);
      }
    };
    fetchChats();
  }, []);

  // Auto-scroll Feed
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle activeChat Change & Pusher Subscription
  useEffect(() => {
    if (!activeChat || !pusherClient) return;

    if (activeChat.status === "bot_active") {
        if (messages.length === 0) {
           setCurrentBotNodeId("greeting");
           appendLocalBotMessage(initialSettings.support?.botGreetingMessage || "Hello! You are connected to D&K Creations Support.");
        }
    } else {
        if (messages.length === 0) appendLocalBotMessage("Reconnected securely to active session.");
    }

    const channelName = `private-chat-${activeChat._id}`;
    const channel = pusherClient.subscribe(channelName);

    channel.bind("new-message", (message: IMessage) => {
      setMessages((prev) => {
        if (prev.some(m => m.id === message.id)) return prev;
        return [...prev, message];
      });
      setChats((prevChats) => prevChats.map(c => 
        c._id === activeChat._id 
          ? { ...c, messages: [...(c.messages || []), message], updatedAt: new Date().toISOString() } 
          : c
      ));
    });

    return () => {
      pusherClient?.unsubscribe(channelName);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChat?._id]);

  const changeActiveChat = (chat: PopulatedChat) => {
     setActiveChat(chat);
     setMessages(chat.messages || []); // Sync thread natively from MongoDB DB cache
     setIsViewingThread(true);
  };

  const handleCreateChat = async () => {
    setIsCreating(true);
    setToastMessage(null);
    try {
      const res = await fetch("/api/chat", { method: "POST" });
      
      if (res.status === 429) {
        setToastMessage("You already have 3 active inquiries. Please resolve one before starting another.");
        setTimeout(() => setToastMessage(null), 4000);
        return;
      }

      if (res.ok) {
        const data = await res.json();
        const newChat: PopulatedChat = {
          _id: data.chatId,
          userId: "me",
          status: "bot_active",
          hasUnread: false,
          messages: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setChats([newChat, ...chats]);
        changeActiveChat(newChat);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsCreating(false);
    }
  };

  const sendMessage = async (text: string, forceSender?: "client" | "bot" | "admin") => {
    if (!text.trim() || !activeChat) return;

    // 1. Instantly render via Optimistic UI Update
    const tempId = generateTempId();
    const optimisticMsg: IMessage = { id: tempId, sender: forceSender || "client", text, createdAt: new Date() };
    
    setMessages(prev => [...prev, optimisticMsg]);
    setChats(prev => prev.map(c => c._id === activeChat._id ? { ...c, messages: [...(c.messages || []), optimisticMsg] } : c));

    setIsSending(true);
    setInputValue(""); // Clear input instantly so user doesn't spam

    try {
      const res = await fetch("/api/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: activeChat._id,
          text,
          sender: forceSender || "client",
        }),
      });

      if (!res.ok) throw new Error("Delivery failed");
      
      const serverMessage = await res.json();
      
      // 2. Synchronize IDs when server confirms
      setMessages(prev => prev.map(m => m.id === tempId ? serverMessage : m));
      setChats(prev => prev.map(c => 
        c._id === activeChat._id 
          ? { ...c, messages: (c.messages || []).map(m => m.id === tempId ? serverMessage : m) } 
          : c
      ));

      if (text.includes("speak with a human")) {
        setActiveChat({ ...activeChat, status: "waiting_admin" });
        setChats(prev => prev.map(c => c._id === activeChat._id ? { ...c, status: "waiting_admin" } : c));
      }

    } catch (error) {
      console.error(error);
      // Optional rollback block if needed
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setChats(prev => prev.map(c => c._id === activeChat._id ? { ...c, messages: (c.messages || []).filter(m => m.id !== tempId) } : c));
    } finally {
      setIsSending(false);
    }
  };

  const handleResolveChat = async () => {
    if (!activeChat) return;
    setIsResolving(true);
    try {
      const res = await fetch("/api/chat", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: activeChat._id, status: "resolved" }),
      });

      if (res.ok) {
        setChats(prev => prev.filter(c => c._id !== activeChat._id));
        setActiveChat(null);
        setIsConfirmCloseOpen(false);
        setTimeout(() => setIsViewingThread(false), 400); 
      } else {
        throw new Error("Failed to close chat");
      }
    } catch (e) {
      console.error(e);
      setToastMessage("Failed to resolve ticket securely.");
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setIsResolving(false);
    }
  };

  const handleBotOptionClick = async (option: BotOption) => {
    appendLocalUserMessage(option.label);

    switch (option.action) {
      case 'NAVIGATE':
        if (option.nextNodeId) {
          setCurrentBotNodeId(option.nextNodeId);
          setTimeout(() => {
             appendLocalBotMessage(botDecisionTree[option.nextNodeId!].botText);
          }, 300);
        }
        break;

      case 'SHOW_INFO':
        const checkout = initialSettings.checkout || {} as any;
        if (option.infoKey === 'delivery') {
          if (checkout.isDeliveryEnabled) {
            appendLocalBotMessage(`Yes, we offer delivery! The fee is $${checkout.deliveryFee} (Minimum order: $${checkout.minOrderForDelivery}).\n\n${checkout.deliveryInstructions}`);
          } else {
            appendLocalBotMessage(checkout.disabledMessage || "Sorry, delivery is currently unavailable.");
          }
        } else if (option.infoKey === 'pickup') {
          if (checkout.isPickupEnabled) {
            appendLocalBotMessage(`Pickup is available at:\n📍 ${checkout.pickupAddress}\n\n${checkout.pickupInstructions}`);
          } else {
            appendLocalBotMessage("Sorry, pickup is currently unavailable.");
          }
        }
        setTimeout(() => {
          setCurrentBotNodeId('anything_else');
          appendLocalBotMessage(botDecisionTree['anything_else'].botText);
        }, 500);
        break;

      case 'ESCALATE':
        sendMessage("I'd like to speak with a human support agent.", "client");
        break;

      case 'LINK':
        if (option.url) {
            window.location.href = option.url;
        }
        break;

      case 'RESOLVE':
        handleResolveChat();
        break;
    }
  };

  // 1. Unauthenticated Guest Fallback UI
  if (isGuest) {
    return (
      <div className="min-h-screen py-16 px-4 sm:px-6 lg:px-8 bg-background flex items-center justify-center font-body text-primary">
        <Card className="max-w-2xl w-full shadow-2xl border-0 overflow-hidden bg-card-background">
            <div className="bg-primary p-8 text-primary-foreground text-center">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-90" />
                <h1 className="text-3xl font-heading mb-2">Homemade Cakes Support</h1>
                <p className="text-primary-foreground/80">We're here to help make your day sweeter!</p>
            </div>
            <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    <div className="flex flex-col items-center text-center p-4 bg-subtleBackground rounded-xl">
                        <Mail className="h-6 w-6 text-primary mb-3" />
                        <h3 className="font-heading text-lg">Email Us</h3>
                        <p className="text-sm text-primary/60 mt-1">support@homemadecakes.com</p>
                    </div>
                    <div className="flex flex-col items-center text-center p-4 bg-subtleBackground rounded-xl">
                        <Phone className="h-6 w-6 text-primary mb-3" />
                        <h3 className="font-heading text-lg">Call Us</h3>
                        <p className="text-sm text-primary/60 mt-1">+1 (555) 123-4567</p>
                    </div>
                </div>
                <div className="flex flex-col items-center pt-6 border-t border-border">
                    <p className="text-primary/80 mb-4 text-center">To start a live real-time support session with our bakers, please log into your account.</p>
                    <Link href="/login">
                        <Button size="lg" className="px-8 shadow-md hover:shadow-lg transition-transform hover:-translate-y-0.5">
                            Log In to Start Live Chat
                        </Button>
                    </Link>
                </div>
            </CardContent>
        </Card>
      </div>
    );
  }

  // 2. Active Split-Pane UI
  const currentNode = botDecisionTree[currentBotNodeId] || botDecisionTree['greeting'];

  return (
    <div className="h-[calc(100vh-[100px])] min-h-[600px] overflow-hidden bg-background p-4 md:p-8 flex justify-center items-center font-body text-primary">
      
      {toastMessage && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50 bg-error text-white px-6 py-3 rounded-md shadow-xl font-medium text-sm animate-in slide-in-from-top-4 fade-in">
          {toastMessage}
        </div>
      )}

      <Card className="w-full max-w-6xl shadow-xl flex bg-card-background overflow-hidden border-0 h-[80vh] min-h-[600px]">
        {/* Left Sidebar: Inbox Array */}
        <div className={cn("w-full md:w-1/3 flex-col border-r border-border bg-subtleBackground/10", isViewingThread ? "hidden md:flex" : "flex")}>
            <div className="p-4 flex items-center justify-between">
                <h2 className="font-heading text-xl text-primary tracking-tight">Your conversations</h2>
                <Button size="icon" variant="ghost" className="text-primary hover:bg-primary/10" onClick={handleCreateChat} disabled={isCreating}>
                    {isCreating ? <Loader2 className="h-5 w-5 animate-spin" /> : <PlusCircle className="h-5 w-5" />}
                </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {isLoadingChats ? (
                    <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary/40" /></div>
                ) : chats.length === 0 ? (
                    <div className="text-center p-8 text-primary/60 text-sm">No ongoing support inquiries.<br/>Click the + button to start one!</div>
                ) : (
                    chats.map(chat => (
                        <button 
                            key={chat._id}
                            onClick={() => changeActiveChat(chat)}
                            className={cn(
                                "w-full text-left p-4 rounded-xl transition-all duration-200 border",
                                activeChat?._id === chat._id 
                                  ? "bg-primary/5 border-primary/20 shadow-sm" 
                                  : "bg-card-background border-transparent hover:border-border hover:shadow-sm"
                            )}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className={cn("font-heading text-sm", activeChat?._id === chat._id ? "text-primary" : "text-primary")}>
                                    Ticket #{chat._id.substring(chat._id.length - 6)}
                                </span>
                                <span className="text-xs text-primary/40">
                                    {new Date(chat.updatedAt).toLocaleDateString()}
                                </span>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                                <span className="text-[11px] font-medium px-2 py-1 rounded bg-subtleBackground text-primary/80 capitalize">
                                    {chat.status.replace("_", " ").toLowerCase()}
                                </span>
                                {chat.hasUnread && <span className="h-2 w-2 rounded-full bg-primary" />}
                            </div>
                        </button>
                    ))
                )}
            </div>
        </div>

        {/* Right Pane: Active Thread */}
        <div className={cn("w-full md:w-2/3 flex-col bg-card-background overflow-hidden", !isViewingThread ? "hidden md:flex" : "flex")}>
            {activeChat ? (
                <>
                    <div className="p-5 border-b border-border bg-card-background flex items-center justify-between">
                        <Button variant="ghost" size="icon" className="md:hidden mr-1 text-primary" onClick={() => setIsViewingThread(false)}>
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <Bot className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-heading text-sm text-primary">Support Bot Assistant</h3>
                            <p className="text-xs text-primary/60">Ticket #{activeChat._id.substring(activeChat._id.length - 6)}</p>
                        </div>
                        {activeChat.status !== "resolved" && (
                            <Button variant="danger" size="sm" className="h-8 px-3 text-xs shadow-sm bg-error/10 hover:bg-error/20 text-error border border-error/20" onClick={() => setIsConfirmCloseOpen(true)}>
                                End conversation
                            </Button>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-subtleBackground/30" ref={scrollRef}>
                        <div className="space-y-6">
                            {messages.map((msg, idx) => {
                                const isLastMessage = idx === messages.length - 1;
                                const showOptions = isLastMessage && msg.sender === "bot" && activeChat.status === "bot_active";

                                return (
                                    <React.Fragment key={msg.id}>
                                        <div className={cn("flex w-full gap-2", msg.sender === "client" ? "justify-end" : "justify-start")}>
                                            {msg.sender !== "client" && (
                                                <div className="h-8 w-8 rounded-full bg-primary/10 flex-shrink-0 flex items-center justify-center text-primary mt-auto mb-5">
                                                    <Bot className="h-4 w-4" />
                                                </div>
                                            )}
                                            <div className={cn("flex flex-col max-w-[85%] md:max-w-[70%]", msg.sender === "client" ? "items-end" : "items-start")}>
                                                <div className={cn(
                                                    "px-4 py-2 text-[15px] shadow-sm relative leading-relaxed whitespace-pre-wrap flex flex-col items-start",
                                                    msg.sender === "client" 
                                                    ? "bg-primary text-white rounded-2xl rounded-br-sm" 
                                                    : "bg-card-background text-primary border border-border rounded-2xl rounded-bl-sm"
                                                )}>
                                                    <div>{msg.text}</div>
                                                </div>
                                                <span className="text-[11px] text-primary/40 mt-1 px-1">
                                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                </span>
                                            </div>
                                        </div>

                                        {showOptions && (
                                            <div className="flex gap-2 pl-9 flex-wrap mt-1">
                                                {currentNode.options.map((option, i) => (
                                                    <Button
                                                        key={i}
                                                        variant="outline"
                                                        className="text-sm rounded-full px-4 py-2 h-auto border-border hover:bg-subtleBackground shadow-none whitespace-nowrap bg-card-background text-primary/80"
                                                        onClick={() => handleBotOptionClick(option)}
                                                    >
                                                        {option.label}
                                                    </Button>
                                                ))}
                                            </div>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                            <div className="h-2" />
                        </div>
                    </div>

                    <div className="p-4 bg-card-background border-t border-border shrink-0">
                        {activeChat.status === "bot_active" ? (
                             <div className="w-full text-center py-2 text-primary/40 text-sm">
                                Choose an option above to continue
                             </div>
                        ) : (
                            <form className="flex w-full items-center space-x-3" onSubmit={(e) => { e.preventDefault(); sendMessage(inputValue); }}>
                                <Input placeholder="Type your message securely..." value={inputValue} onChange={(e) => setInputValue(e.target.value)} disabled={isSending} className="flex-1 focus-visible:ring-primary/50 h-12 rounded-xl bg-background border-border" autoFocus />
                                <Button type="submit" size="icon" className="h-12 w-12 rounded-xl transition-transform active:scale-95 shadow-md" disabled={!inputValue.trim() || isSending}>
                                    {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                                </Button>
                            </form>
                        )}
                    </div>
                </>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-primary/40 bg-subtleBackground/30">
                    <MessageCircle className="h-16 w-16 mb-4 opacity-20" />
                    <p className="font-heading text-lg text-primary/60">Pick a conversation to get started</p>
                    <p className="text-sm mt-1">Select a conversation from the sidebar to view details</p>
                </div>
            )}
        </div>

        <ConfirmationModal
            isOpen={isConfirmCloseOpen}
            onClose={() => setIsConfirmCloseOpen(false)}
            onConfirm={handleResolveChat}
            title="Resolve Inquiry"
            confirmText={isResolving ? "Resolving..." : "End conversation"}
            variant="danger"
        >
            Are you sure you want to close this inquiry? You won't be able to send more messages here.
        </ConfirmationModal>
      </Card>
    </div>
  );
}
