"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { MessageCircle, Send, Loader2, Bot, Cat, ChevronLeft, PlusCircle, Mail, Phone } from "lucide-react";
import { AppSettings, IChat, IMessage, Flavor, Diameter } from "@/types";
import { pusherClient } from "@/lib/pusher";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { botDecisionTree, BotOption, BotNode } from "@/lib/chat/botLogic";
import { TypingIndicator } from "./TypingIndicator";
import { cn } from "@/lib/utils";

interface PopulatedChat extends Omit<IChat, "createdAt" | "updatedAt"> {
  _id: string; // Mongo ID returned as string
  createdAt: string;
  updatedAt: string;
  isLocal?: boolean;
}

export default function ContactClient({ initialSettings, isAuthenticated = false }: { initialSettings: AppSettings, isAuthenticated?: boolean }) {
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
  const [dynamicNode, setDynamicNode] = useState<BotNode | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  
  // Human Typing State
  const [isRemoteUserTyping, setIsRemoteUserTyping] = useState(false);
  const typingFailsafeRef = useRef<NodeJS.Timeout | null>(null);
  
  const [isLocallyTyping, setIsLocallyTyping] = useState(false);
  const localTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    if (!isAuthenticated) {
      setIsLoadingChats(false);
      return;
    }
    const fetchChats = async () => {
      try {
        const res = await fetch("/api/chat");
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
  }, [isAuthenticated]);

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
           setDynamicNode(null);
           setIsTyping(true);
           setTimeout(() => {
              appendLocalBotMessage(initialSettings.support?.botGreetingMessage || "Hello! You are connected to D&K Creations Support.");
              setIsTyping(false);
           }, 800);
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

    channel.bind("typing-update", (data: { isTyping: boolean, sender: string }) => {
        if (data.sender === "admin") {
            setIsRemoteUserTyping(data.isTyping);
            if (typingFailsafeRef.current) clearTimeout(typingFailsafeRef.current);
            if (data.isTyping) {
                typingFailsafeRef.current = setTimeout(() => {
                    setIsRemoteUserTyping(false);
                }, 5000); // 5s stuck-bubble failsafe
            }
        }
    });

    return () => {
      pusherClient?.unsubscribe(channelName);
      if (typingFailsafeRef.current) clearTimeout(typingFailsafeRef.current);
      if (localTypingTimeoutRef.current) clearTimeout(localTypingTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChat?._id]);

  const changeActiveChat = (chat: PopulatedChat) => {
     setActiveChat(chat);
     setMessages(chat.messages || []); // Sync thread natively from MongoDB DB cache
     setIsViewingThread(true);
  };

  const handleCreateChat = async () => {
    if (chats.length >= 3) {
      setToastMessage("You already have 3 active inquiries. Please resolve one before starting another.");
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }

    const newChat: PopulatedChat = {
      _id: "local_" + generateTempId(),
      userId: isAuthenticated ? "me" : "guest",
      status: "bot_active",
      hasUnread: false,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isLocal: true
    };
    setChats([newChat, ...chats]);
    changeActiveChat(newChat);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setInputValue(val);
      
      if (!activeChat || activeChat.isLocal || activeChat.status === "bot_active") return;
      
      if (!isLocallyTyping && val.trim() !== "") {
          setIsLocallyTyping(true);
          fetch("/api/chat/typing", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chatId: activeChat._id, isTyping: true, sender: "client" })
          }).catch(console.error);
      }
      
      if (localTypingTimeoutRef.current) clearTimeout(localTypingTimeoutRef.current);
      
      localTypingTimeoutRef.current = setTimeout(() => {
          setIsLocallyTyping(false);
          fetch("/api/chat/typing", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chatId: activeChat._id, isTyping: false, sender: "client" })
          }).catch(console.error);
      }, 1500);
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
    
    if (localTypingTimeoutRef.current) clearTimeout(localTypingTimeoutRef.current);
    if (isLocallyTyping && activeChat && !activeChat.isLocal) {
        setIsLocallyTyping(false);
        fetch("/api/chat/typing", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chatId: activeChat._id, isTyping: false, sender: "client" })
        }).catch(console.error);
    }

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
      setMessages(prev => {
          if (prev.some(m => m.id === serverMessage.id && m.id !== tempId)) {
              return prev.filter(m => m.id !== tempId);
          }
          return prev.map(m => m.id === tempId ? serverMessage : m);
      });
      setChats(prev => prev.map(c => {
        if (c._id !== activeChat._id) return c;
        const msgs = c.messages || [];
        if (msgs.some(m => m.id === serverMessage.id && m.id !== tempId)) {
            return { ...c, messages: msgs.filter(m => m.id !== tempId) };
        }
        return { ...c, messages: msgs.map(m => m.id === tempId ? serverMessage : m) };
      }));

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
    
    if (activeChat.isLocal) {
        setChats(prev => prev.filter(c => c._id !== activeChat._id));
        setActiveChat(null);
        setIsConfirmCloseOpen(false);
        setTimeout(() => setIsViewingThread(false), 400);
        return;
    }

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
          setDynamicNode(null);
          setCurrentBotNodeId(option.nextNodeId);
          setIsTyping(true);
          await new Promise(resolve => setTimeout(resolve, 800));
          appendLocalBotMessage(botDecisionTree[option.nextNodeId!].botText);
          setIsTyping(false);
        }
        break;

      case 'SHOW_INFO':
        if (option.infoKey === 'flavors') {
          setIsTyping(true);
          await new Promise(resolve => setTimeout(resolve, 800));
          appendLocalBotMessage("Looking up our menu categories...");
          try {
            const res = await fetch('/api/categories');
            if (!res.ok) throw new Error("Failed");
            const categories = await res.json();
            const categoryOptions: BotOption[] = categories.map((c: any) => ({
               label: c.name,
               action: 'FETCH_FLAVORS',
               categoryId: c._id
            }));
            categoryOptions.push({ label: "Go Back", action: 'NAVIGATE', nextNodeId: 'explore_menu_and_orders' });
            
            await new Promise(resolve => setTimeout(resolve, 800));
            setDynamicNode({
               id: 'dynamic_categories',
               botText: "Which type of treat are you looking for?",
               options: categoryOptions
            });
            setCurrentBotNodeId('dynamic_categories');
            appendLocalBotMessage("Which type of treat are you looking for?");
            setIsTyping(false);
          } catch (err) {
            console.error("Failed to fetch categories", err);
            await new Promise(resolve => setTimeout(resolve, 800));
            appendLocalBotMessage("Sorry, I'm having trouble retrieving the menu right now.");
            await new Promise(resolve => setTimeout(resolve, 500));
            setDynamicNode(null);
            setCurrentBotNodeId('anything_else');
            await new Promise(resolve => setTimeout(resolve, 800));
            appendLocalBotMessage(botDecisionTree['anything_else'].botText);
            setIsTyping(false);
          }
        } else if (option.infoKey === 'sizes') {
          setIsTyping(true);
          await new Promise(resolve => setTimeout(resolve, 800));
          appendLocalBotMessage("Let me grab our sizing chart for you...");
          try {
            const res = await fetch('/api/diameters');
            if (!res.ok) throw new Error("Failed");
            const diameters: Diameter[] = await res.json();
            
            diameters.sort((a, b) => (a.sizeValue || 0) - (b.sizeValue || 0));
            
            let msg = "Here is our sizing guide:\n\n";
            diameters.forEach(d => {
               msg += `• **${d.name}** (feeds ${d.servings} people)\n`;
            });
            msg += "\nWe can also do tiered cakes for larger events! Are you ready to start your order?";
            
            await new Promise(resolve => setTimeout(resolve, 800));
            appendLocalBotMessage(msg);
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            setDynamicNode(null);
            setCurrentBotNodeId('anything_else');
            await new Promise(resolve => setTimeout(resolve, 800));
            appendLocalBotMessage(botDecisionTree['anything_else'].botText);
            setIsTyping(false);
          } catch (err) {
            console.error("Failed to fetch diameters", err);
            await new Promise(resolve => setTimeout(resolve, 800));
            appendLocalBotMessage("Sorry, I'm having trouble fetching the sizing guide right now.");
            await new Promise(resolve => setTimeout(resolve, 500));
            setDynamicNode(null);
            setCurrentBotNodeId('anything_else');
            await new Promise(resolve => setTimeout(resolve, 800));
            appendLocalBotMessage(botDecisionTree['anything_else'].botText);
            setIsTyping(false);
          }
        } else {
            const checkout = initialSettings.checkout || {} as any;
            setIsTyping(true);
            await new Promise(resolve => setTimeout(resolve, 800));
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
            await new Promise(resolve => setTimeout(resolve, 500));
            setDynamicNode(null);
            if (option.infoKey === 'delivery' || option.infoKey === 'pickup') {
               setCurrentBotNodeId('logistics_followup');
               await new Promise(resolve => setTimeout(resolve, 800));
               appendLocalBotMessage(botDecisionTree['logistics_followup'].botText);
               setIsTyping(false);
            } else {
               setCurrentBotNodeId('anything_else');
               await new Promise(resolve => setTimeout(resolve, 800));
               appendLocalBotMessage(botDecisionTree['anything_else'].botText);
               setIsTyping(false);
            }
        }
        break;

      case 'FETCH_FLAVORS':
        setIsTyping(true);
        await new Promise(resolve => setTimeout(resolve, 800));
        appendLocalBotMessage("Give me a second to pull up the options...");
        try {
          const flavorsRes = await fetch(`/api/flavors`);
          if (!flavorsRes.ok) throw new Error("Failed");
          const allFlavors = await flavorsRes.json();
          const categoryFlavors = allFlavors.filter((f: Flavor) => f.categoryIds?.includes(option.categoryId!));
          
          let msg = `Here are the options for this category:\n\n`;
          if (categoryFlavors.length === 0) {
              msg = "We don't have any specific flavors listed for this category right now, but we can usually accommodate requests!";
          } else {
              categoryFlavors.forEach((f: Flavor) => {
                  msg += `• **${f.name}**${f.description ? ` - ${f.description}` : ''}\n`;
              });
             msg += `\nYou can refer to these when filling out the custom order form!`;
          }
          
          await new Promise(resolve => setTimeout(resolve, 800));
          appendLocalBotMessage(msg);
          
          await new Promise(resolve => setTimeout(resolve, 1000));
          setDynamicNode(null);
          setCurrentBotNodeId('anything_else');
          await new Promise(resolve => setTimeout(resolve, 800));
          appendLocalBotMessage(botDecisionTree['anything_else'].botText);
          setIsTyping(false);
        } catch (err) {
          console.error("Failed to fetch flavors", err);
          await new Promise(resolve => setTimeout(resolve, 800));
          appendLocalBotMessage("Sorry, I'm having trouble retrieving the flavors right now.");
          await new Promise(resolve => setTimeout(resolve, 500));
          setDynamicNode(null);
          setCurrentBotNodeId('anything_else');
          await new Promise(resolve => setTimeout(resolve, 800));
          appendLocalBotMessage(botDecisionTree['anything_else'].botText);
          setIsTyping(false);
        }
        break;

      case 'ESCALATE':
        if (!isAuthenticated) {
          setCurrentBotNodeId('login_required');
          setIsTyping(true);
          await new Promise(resolve => setTimeout(resolve, 800));
          appendLocalBotMessage(botDecisionTree['login_required'].botText);
          setIsTyping(false);
          return;
        }

        let targetChatId = activeChat?._id;
        
        if (activeChat?.isLocal || !targetChatId) {
          setIsCreating(true);
          try {
            const res = await fetch("/api/chat", { method: "POST" });
            if (res.status === 429) {
               setToastMessage("You already have 3 active inquiries. Please resolve one before starting another.");
               setTimeout(() => setToastMessage(null), 4000);
               setIsCreating(false);
               return;
            }
            if (!res.ok) throw new Error("Failed to create chat");
            
            const data = await res.json();
            targetChatId = data.chatId as string;

            const updatedActiveChat = { ...activeChat!, _id: targetChatId, isLocal: false, status: "waiting_admin" as const };
            setActiveChat(updatedActiveChat);
            setChats(prev => prev.map(c => c._id === activeChat?._id ? updatedActiveChat : c));

          } catch (e) {
             console.error(e);
             setToastMessage("Failed to connect to agent.");
             setTimeout(() => setToastMessage(null), 4000);
             setIsCreating(false);
             return;
          }
          setIsCreating(false);
        } else {
            setActiveChat(prev => prev ? { ...prev, status: "waiting_admin" as const } : null);
            setChats(prev => prev.map(c => c._id === activeChat?._id ? { ...c, status: "waiting_admin" as const } : c));
        }

        setIsSending(true);
        const text =
          "You're connected with the baker. Replies may take some time, but baker will get back to you as soon as possible";
        const tempId = generateTempId();
        const optimisticMsg: IMessage = { id: tempId, sender: "client", text, createdAt: new Date() };
        setMessages(prev => [...prev, optimisticMsg]);

        try {
           const resMsg = await fetch("/api/chat/message", {
             method: "POST",
             headers: { "Content-Type": "application/json" },
             body: JSON.stringify({
               chatId: targetChatId,
               text,
               sender: "client"
             })
           });
           
           if (!resMsg.ok) throw new Error("Delivery failed");
           const serverMessage = await resMsg.json();
           
           setMessages(prev => {
               if (prev.some(m => m.id === serverMessage.id && m.id !== tempId)) {
                   return prev.filter(m => m.id !== tempId);
               }
               return prev.map(m => m.id === tempId ? serverMessage : m);
           });
           setChats(prev => prev.map(c => {
               if (c._id !== targetChatId) return c;
               const msgs = c.messages || [];
               if (msgs.some(m => m.id === serverMessage.id && m.id !== tempId)) {
                   return { ...c, messages: msgs.filter(m => m.id !== tempId) };
               }
               return { ...c, messages: msgs.map(m => m.id === tempId ? serverMessage : m) };
           }));
        } catch (err) {
           console.error(err);
        } finally {
           setIsSending(false);
        }
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

  // 2. Active Split-Pane UI
  const currentNode = dynamicNode?.id === currentBotNodeId ? dynamicNode : botDecisionTree[currentBotNodeId] || botDecisionTree['greeting'];

  return (
    <div className="h-[calc(100vh-[100px])] min-h-[600px] overflow-hidden bg-background p-4 md:p-8 flex justify-center items-center font-body text-primary">
      
      {toastMessage && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50 bg-error text-white px-6 py-3 rounded-md shadow-xl font-medium text-sm animate-in slide-in-from-top-4 fade-in">
          {toastMessage}
        </div>
      )}

      <Card className="w-full max-w-6xl  flex bg-card-background overflow-hidden border-0 h-[80vh] min-h-[600px]">
        {(!isLoadingChats && chats.length === 0) ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 bg-background md:p-12 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-primary/5 pointer-events-none" />
                <div className="relative bg-card-background p-8 md:p-12 rounded-[2.5rem] shadow-xl border border-primary/10 flex flex-col items-center max-w-lg text-center animate-in fade-in zoom-in-95 duration-500">
                    <div className="h-24 w-24 bg-subtleBackground/30 text-primary rounded-full flex items-center justify-center mb-6 shadow-sm border border-primary/20">
                        <Cat className="h-12 w-12" />
                    </div>
                    <h2 className="font-heading text-3xl md:text-4xl text-primary mb-4 tracking-tight">Hi there!</h2>
                    <p className="text-primary/70 mb-8 leading-relaxed text-lg font-body">
                I'm bakery assistant <br/>
                I'm here to help you with orders, questions, and everything sweet.
                Do you have any questions?
                    </p>
                    <Button 
                        onClick={handleCreateChat} 
                        className="rounded-full px-8 h-14 bg-primary hover:bg-primary/90 text-white font-medium shadow-md transition-all hover:-translate-y-0.5 text-[17px] w-full sm:w-auto"
                        disabled={isCreating}
                    >
                        {isCreating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <MessageCircle className="mr-2 h-5 w-5" />}
                        Yes, I have a question
                    </Button>
                </div>
            </div>
        ) : (
        <>
        {/* Left Sidebar: Inbox Array */}
        <div className={cn("w-full md:w-1/3 flex-col border-r border-border bg-subtleBackground/10", isViewingThread ? "hidden md:flex" : "flex")}>
            <div className="p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <h2 className="font-heading text-xl text-primary tracking-tight">Your conversations</h2>
                    <Button size="icon" variant="ghost" className="text-primary hover:bg-primary/10" onClick={handleCreateChat} disabled={isCreating || chats.length >= 3}>
                        {isCreating ? <Loader2 className="h-5 w-5 animate-spin" /> : <PlusCircle className="h-5 w-5" />}
                    </Button>
                </div>
                {chats.length >= 3 && (
                    <p className="text-xs text-error tracking-tight font-medium bg-error/10 p-2 rounded-md">
                        Limit reached. Please end an existing conversation to start a new one.
                    </p>
                )}
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
                        <div className="h-9 w-9 rounded-full bg-subtleBackground/30 flex items-center justify-center text-primary mr-2">
                            <Cat className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-heading text-sm text-primary">Support Assistant</h3>
                            <p className="text-xs text-primary/60">Ticket #{activeChat._id.substring(activeChat._id.length - 6)}</p>
                        </div>
                        {activeChat.status !== "resolved" && (
                            <Button variant="danger" size="sm" className="h-8 px-3 text-xs shadow-sm bg-error/10 hover:bg-error/10 text-error border border-error/10" onClick={() => setIsConfirmCloseOpen(true)}>
                                End conversation
                            </Button>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-subtleBackground/30" ref={scrollRef}>
                        <div className="space-y-6">
                            {messages.map((msg, idx) => {
                                const isLastMessage = idx === messages.length - 1;
                                // Hide options while the bot is processing/fetching to prevent old options from flashing under transition messages
                                const showOptions = isLastMessage && msg.sender === "bot" && activeChat.status === "bot_active" && !isTyping;

                                return (
                                    <React.Fragment key={msg.id}>
                                        <div className={cn("flex w-full gap-2", msg.sender === "client" ? "justify-end" : "justify-start")}>
                                            {msg.sender !== "client" && (
                                                <div className="h-8 w-8 rounded-full bg-subtleBackground/30 flex-shrink-0 flex items-center justify-center text-primary mt-auto mb-5">
                                                    <Cat className="h-4 w-4" />
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
                            
                            {isTyping && <TypingIndicator role="bot" />}
                            {isRemoteUserTyping && <TypingIndicator role="admin" />}

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
                                <Input placeholder="Type your message securely..." value={inputValue} onChange={handleInputChange} disabled={isSending} className="flex-1 focus-visible:ring-primary/50 h-12 rounded-xl bg-background border-border" autoFocus />
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
        </>
        )}

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
