"use client";

import React, { useState, useEffect, useRef } from "react";
import { Loader2, MessageCircle, Send, CheckCircle2, ChevronLeft, UserCircle2 } from "lucide-react";
import { pusherClient } from "@/lib/pusher";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { IMessage } from "@/types";
import { cn } from "@/lib/utils";
import { TypingIndicator } from "@/components/chat/TypingIndicator";

interface PopulatedAdminChat {
  _id: string;
  userId: string;
  status: string;
  hasUnread: boolean;
  messages?: IMessage[];
  updatedAt: string;
  userData?: {
    name?: string;
    email?: string;
  };
}

export default function AdminSupportDashboard() {
  const [tickets, setTickets] = useState<PopulatedAdminChat[]>([]);
  const [activeTicket, setActiveTicket] = useState<PopulatedAdminChat | null>(null);
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Mobile Stack Navigation View
  const [isViewingThread, setIsViewingThread] = useState(false);
  
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  
  const [isRemoteUserTyping, setIsRemoteUserTyping] = useState(false);
  const typingFailsafeRef = useRef<NodeJS.Timeout | null>(null);
  const [isLocallyTyping, setIsLocallyTyping] = useState(false);
  const localTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [isResolving, setIsResolving] = useState(false);
  const [isConfirmResolveOpen, setIsConfirmResolveOpen] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchTickets = async () => {
    try {
      const res = await fetch("/api/admin/chats");
      if (res.ok) {
        const data: PopulatedAdminChat[] = await res.json();
        setTickets(data);
        
        // Optimistically keep track of the active ticket dynamically if data changes
        setActiveTicket(currentActive => {
            if (!currentActive) return null;
            const updatedActive = data.find(t => t._id === currentActive._id);
            return updatedActive || null;
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  // Set messages securely when clicking a specific ticket, avoids full re-renders
  const selectTicket = (ticket: PopulatedAdminChat) => {
    setActiveTicket(ticket);
    setMessages(ticket.messages || []);
    setIsViewingThread(true);
    
    // Clear unread optimistically if it had one
    if (ticket.hasUnread) {
        setTickets(prev => prev.map(t => t._id === ticket._id ? { ...t, hasUnread: false } : t));
        // Push unread reset laterally into the globally isolated AdminSidebar
        window.dispatchEvent(new CustomEvent("support-ticket-read", { detail: { chatId: ticket._id } }));
    }
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // Global Pusher Interceptor
  useEffect(() => {
    if (!pusherClient) return;
    
    const channel = pusherClient.subscribe("private-admin-inbox");
    
    channel.bind("inbox-update", () => {
        // Fetch new state globally so everything stays consistent in the inbox
        fetchTickets();
    });

    return () => {
      pusherClient?.unsubscribe("private-admin-inbox");
    };
  }, []);

  // Direct Private Subscriptions per Conversation
  useEffect(() => {
    if (!activeTicket || !pusherClient) return;

    const channelName = `private-chat-${activeTicket._id}`;
    const channel = pusherClient.subscribe(channelName);

    channel.bind("new-message", (message: IMessage) => {
      setMessages((prev) => {
        if (prev.some(m => m.id === message.id)) return prev;
        return [...prev, message];
      });
      // Ping re-fetch to push the unread bubble away
      fetchTickets();
    });

    channel.bind("typing-update", (data: { isTyping: boolean, sender: string }) => {
        if (data.sender === "client") {
            setIsRemoteUserTyping(data.isTyping);
            if (typingFailsafeRef.current) clearTimeout(typingFailsafeRef.current);
            if (data.isTyping) {
                typingFailsafeRef.current = setTimeout(() => {
                    setIsRemoteUserTyping(false);
                }, 5000);
            }
        }
    });

    return () => {
      pusherClient?.unsubscribe(channelName);
      if (typingFailsafeRef.current) clearTimeout(typingFailsafeRef.current);
      if (localTypingTimeoutRef.current) clearTimeout(localTypingTimeoutRef.current);
    };
  }, [activeTicket?._id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setInputValue(val);
      
      if (!activeTicket) return;
      
      if (!isLocallyTyping && val.trim() !== "") {
          setIsLocallyTyping(true);
          fetch("/api/chat/typing", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chatId: activeTicket._id, isTyping: true, sender: "admin" })
          }).catch(console.error);
      }
      
      if (localTypingTimeoutRef.current) clearTimeout(localTypingTimeoutRef.current);
      
      localTypingTimeoutRef.current = setTimeout(() => {
          setIsLocallyTyping(false);
          fetch("/api/chat/typing", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chatId: activeTicket._id, isTyping: false, sender: "admin" })
          }).catch(console.error);
      }, 1500);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !activeTicket) return;

    if (localTypingTimeoutRef.current) clearTimeout(localTypingTimeoutRef.current);
    if (isLocallyTyping) {
        setIsLocallyTyping(false);
        fetch("/api/chat/typing", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chatId: activeTicket._id, isTyping: false, sender: "admin" })
        }).catch(console.error);
    }

    const tempId = Math.random().toString(36).substring(2, 12);
    const text = inputValue;
    const optimisticMsg: IMessage = { id: tempId, sender: "admin", text, createdAt: new Date() };
    
    setMessages(prev => [...prev, optimisticMsg]);
    setIsSending(true);
    setInputValue("");

    try {
      const res = await fetch("/api/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: activeTicket._id,
          text,
          sender: "admin",
        }),
      });

      if (!res.ok) throw new Error("Delivery failed");
      const serverMessage = await res.json();
      
      setMessages(prev => {
          if (prev.some(m => m.id === serverMessage.id && m.id !== tempId)) {
              return prev.filter(m => m.id !== tempId);
          }
          return prev.map(m => m.id === tempId ? serverMessage : m);
      });
    } catch (error) {
      console.error(error);
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } finally {
      setIsSending(false);
    }
  };

  const handleResolveChat = async () => {
    if (!activeTicket) return;
    
    setIsResolving(true);
    try {
      const res = await fetch("/api/chat", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: activeTicket._id, status: "resolved" }),
      });

      if (res.ok) {
        setTickets(prev => prev.filter(c => c._id !== activeTicket._id));
        setActiveTicket(null);
        setIsConfirmResolveOpen(false);
        setIsViewingThread(false);
      } else {
        throw new Error("Failed to close ticket");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div className="min-h-screen bg-subtleBackground/10 p-4 md:p-8 flex items-center justify-center font-body text-primary pt-24">
      <div className="w-full max-w-7xl mx-auto flex flex-col gap-4 h-[calc(100vh-140px)] min-h-[600px]">
        <div className="flex justify-between items-end mb-2 px-2">
            <div>
                <h1 className="text-3xl font-heading text-primary tracking-tight">Active Support Tickets</h1>
                <p className="text-primary/60">Global Command Center for managing pending inquiries</p>
            </div>
            <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium border border-primary/20 shadow-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Live Sync Enabled
            </div>
        </div>
        
        <Card className="flex flex-1 bg-card-background overflow-hidden border-0 shadow-xl rounded-2xl w-full">
            {/* Left Sidebar: Inbox */}
            <div className={cn("w-full md:w-1/3 flex-col border-r border-border bg-subtleBackground/5", isViewingThread ? "hidden md:flex" : "flex")}>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {isLoading ? (
                        <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary/40" /></div>
                    ) : tickets.length === 0 ? (
                        <div className="text-center p-8 text-primary/60 text-sm h-full flex items-center justify-center flex-col">
                            <CheckCircle2 className="h-10 w-10 mb-2 opacity-30 text-success" />
                            Inbox Zero! No open inquiries.
                        </div>
                    ) : (
                        tickets.map(ticket => (
                            <button 
                                key={ticket._id}
                                onClick={() => selectTicket(ticket)}
                                className={cn(
                                    "w-full text-left p-4 rounded-xl transition-all duration-200 border",
                                    activeTicket?._id === ticket._id 
                                      ? "bg-primary/5 border-primary/20 shadow-sm" 
                                      : "bg-card-background border-transparent hover:border-border hover:shadow-sm"
                                )}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <div className="font-heading text-[15px] truncate flex-1 pr-2">
                                        {ticket.userData?.name || "Guest Customer"}
                                    </div>
                                    <span className="text-xs text-primary/40 shrink-0 mt-0.5">
                                        {new Date(ticket.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div className="text-xs text-primary/60 truncate mb-2">
                                    {ticket.userData?.email || "No email linked"}
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className={cn(
                                        "text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider",
                                        ticket.status === 'waiting_admin' ? "bg-error/10 text-error" : "bg-success/10 text-success"
                                    )}>
                                        {ticket.status.replace("_", " ")}
                                    </span>
                                    {ticket.hasUnread && (
                                        <span className="flex h-2 w-2 rounded-full bg-error" />
                                    )}
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Right Pane: Active Thread Stage */}
            <div className={cn("w-full md:w-2/3 flex-col bg-card-background", !isViewingThread ? "hidden md:flex" : "flex")}>
                {activeTicket ? (
                    <>
                        {/* Header */}
                        <div className="p-4 border-b border-border bg-card-background flex items-center justify-between shadow-sm z-10">
                            <Button variant="ghost" size="icon" className="md:hidden mr-2 text-primary" onClick={() => setIsViewingThread(false)}>
                                <ChevronLeft className="h-5 w-5" />
                            </Button>
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mr-3 border border-primary/20">
                                <UserCircle2 className="h-6 w-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-heading text-[16px] text-primary truncate">
                                    {activeTicket.userData?.name || "Guest Customer"}
                                </h3>
                                <p className="text-xs text-primary/60 truncate">
                                    {activeTicket.userData?.email || `Ticket #${activeTicket._id.substring(activeTicket._id.length - 6)}`}
                                </p>
                            </div>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-9 px-4 text-xs font-medium text-success border-success/30 hover:bg-success/10 hover:border-success" 
                                onClick={() => setIsConfirmResolveOpen(true)}
                            >
                                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                                Resolve
                            </Button>
                        </div>

                        {/* Feed */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-subtleBackground/30" ref={scrollRef}>
                            <div className="space-y-6">
                                {messages.map((msg) => (
                                    <div key={msg.id} className={cn("flex w-full gap-2", msg.sender === "admin" ? "justify-end" : "justify-start")}>
                                        {msg.sender !== "admin" && (
                                            <div className="h-8 w-8 rounded-full bg-primary/10 flex-shrink-0 flex items-center justify-center text-primary mt-auto mb-5 border border-primary/20">
                                                {msg.sender === "bot" ? <MessageCircle className="h-4 w-4" /> : <UserCircle2 className="h-5 w-5" />}
                                            </div>
                                        )}
                                        <div className={cn("flex flex-col max-w-[80%] md:max-w-[70%]", msg.sender === "admin" ? "items-end" : "items-start")}>
                                            <div className={cn(
                                                "px-4 py-2.5 text-[15px] shadow-sm relative leading-relaxed whitespace-pre-wrap flex flex-col items-start gap-1",
                                                msg.sender === "admin" 
                                                ? "bg-primary text-white rounded-2xl rounded-br-sm" 
                                                : "bg-card-background text-primary border border-border rounded-2xl rounded-bl-sm"
                                            )}>
                                                {msg.sender === "bot" && <span className="text-[10px] uppercase font-bold text-primary/50 tracking-wider">Automated Bot</span>}
                                                <div>{msg.text}</div>
                                            </div>
                                            <span className="text-[11px] text-primary/40 mt-1 px-1">
                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                
                                {isRemoteUserTyping && <TypingIndicator role="client" />}
                                
                                <div className="h-2" />
                            </div>
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-card-background border-t border-border shrink-0 z-10">
                            <form className="flex w-full items-center space-x-3" onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}>
                                <Input 
                                    placeholder="Type your reply securely..." 
                                    value={inputValue} 
                                    onChange={handleInputChange} 
                                    disabled={isSending} 
                                    className="flex-1 focus-visible:ring-primary/40 h-12 rounded-xl bg-background border-border shadow-sm text-[15px]" 
                                    autoFocus 
                                />
                                <Button type="submit" size="icon" className="h-12 w-12 rounded-xl transition-all shadow-md active:scale-95" disabled={!inputValue.trim() || isSending}>
                                    {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                                </Button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-primary/40 bg-subtleBackground/30">
                        <MessageCircle className="h-16 w-16 mb-4 opacity-20" />
                        <h2 className="font-heading text-xl text-primary/70 mb-1">Pick a Ticket</h2>
                        <p className="text-sm font-body">Select an active customer inquiry from the left to resolve</p>
                    </div>
                )}
            </div>

            <ConfirmationModal
                isOpen={isConfirmResolveOpen}
                onClose={() => setIsConfirmResolveOpen(false)}
                onConfirm={handleResolveChat}
                title="Resolve Ticket"
                confirmText={isResolving ? "Resolving..." : "Confirm & Close"}
                variant="primary"
            >
                Are you sure this customer's inquiry has been fully addressed? This will close the chat for both parties.
            </ConfirmationModal>
        </Card>
      </div>
    </div>
  );
}
