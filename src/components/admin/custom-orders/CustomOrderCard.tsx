"use client";

import { CustomOrder } from "@/types";
import { format } from "date-fns";
import { Calendar, Phone, Mail, Copy, CheckCircle2, Trash2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useRouter } from "next/navigation";

interface CustomOrderCardProps {
  order: CustomOrder & Record<string, any>;
}

export const CustomOrderCard = ({ order }: CustomOrderCardProps) => {
  const router = useRouter();
  const [agreedPrice, setAgreedPrice] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);

  // Use all reference images
  const images = order.referenceImages || order.referenceImageUrls || [];
  const displayImage = images.length > 0 ? images[0] : null;

  const handleConvert = async () => {
    if (!agreedPrice || isNaN(Number(agreedPrice))) {
      alert("Please enter a valid number for the price.");
      return;
    }
    
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/custom-orders/${order._id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agreedPrice: Number(agreedPrice) }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to convert");
      
      setPaymentLink(data.paymentLink);
      // We don't refresh immediately so the admin can copy the link
    } catch (err: any) {
      alert("Conversion failed: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!confirm("Are you sure you want to reject and completely delete this custom request? All associated reference images will be permanently purged from cloud storage.")) return;
    
    setIsRejecting(true);
    try {
      const res = await fetch(`/api/custom-orders/${order._id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete the order");
      
      // Auto refresh the list on success
      router.refresh();
    } catch (err: any) {
      alert("Failed to reject: " + err.message);
      setIsRejecting(false);
    }
  };

  const copyLinkAndDismiss = () => {
    if (paymentLink) {
      navigator.clipboard.writeText(paymentLink);
      alert("Payment link copied to clipboard!");
      router.refresh(); // Refresh list to remove the converted/deleted card from UI
    }
  };

  return (
    <div className="flex flex-col md:flex-row w-full bg-card border border-border rounded-xl shadow-sm hover:shadow-md transition-all overflow-hidden group">
      {/* LEFT: Visuals */}
      <div className="relative w-full md:w-56 shrink-0 bg-muted flex flex-col p-3 gap-2 border-b md:border-b-0 md:border-r border-border">
        <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-gray-100 shadow-sm border border-black/5">
          {displayImage ? (
             <Image src={displayImage} alt="Primary Reference" fill className="object-cover" />
          ) : (
             <div className="flex items-center justify-center h-full text-muted-foreground"><span className="text-xs">No Image</span></div>
          )}
        </div>
        
        {images.length > 1 && (
           <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
             {images.slice(1).map((img: string, idx: number) => (
                <div key={idx} className="relative w-12 h-12 rounded-md overflow-hidden shrink-0 border border-black/5 shadow-sm">
                  <Image src={img} alt={`Ref ${idx+2}`} fill className="object-cover" />
                </div>
             ))}
           </div>
        )}
      </div>

      {/* MIDDLE: Content */}
      <div className="flex-1 p-5 flex flex-col justify-start min-w-0">
        <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-3 mb-4">
           <div>
             <h3 className="font-bold text-xl text-primary truncate max-w-sm">
               {order.contact?.name || order.customerName || "Unknown Customer"}
             </h3>
             <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm mt-1.5">
                <span className="flex items-center text-gray-600"><Mail className="w-3.5 h-3.5 mr-1.5 text-primary/50" /> {order.contact?.email || order.customerEmail || "No Email"}</span>
                <span className="flex items-center text-gray-600"><Phone className="w-3.5 h-3.5 mr-1.5 text-primary/50" /> {order.contact?.phone || order.customerPhone || "No Phone"}</span>
             </div>
           </div>
           
           <div className="flex flex-row xl:flex-col items-center xl:items-end gap-2 shrink-0">
              <span className="bg-accent/10 text-accent px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center shadow-sm">
                 <Calendar className="w-4 h-4 mr-1.5" />
                 {order.date || order.eventDate ? format(new Date(order.date || order.eventDate!), "EEEE, MMM do, yyyy") : "TBD"}
              </span>
              <span className="text-xs text-muted-foreground font-bold uppercase tracking-widest bg-gray-100/80 border border-gray-200 px-2 py-1 rounded-md">
                 {order.category || order.eventType || "Unknown Type"}
              </span>
           </div>
        </div>

        <div className="bg-gray-50 border border-gray-200/60 rounded-xl p-4 text-sm mt-auto flex-1">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-3 border-b border-gray-200/60 pb-4">
               <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-0.5">Size / Yield</span>
                  <span className="font-semibold text-primary">{order.details?.size || order.servingSize || "N/A"}</span>
               </div>
               <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-0.5">Flavor Profile</span>
                  <span className="font-semibold text-primary">{order.details?.flavor || order.flavorPreferences || "N/A"}</span>
               </div>
            </div>

            {order.details?.textOnCake && (
              <div className="mb-4">
                 <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Inscription</span>
                 <p className="font-serif italic text-primary text-base border-l-2 border-accent pl-3">"{order.details.textOnCake}"</p>
              </div>
            )}
            
            {(order.details?.designNotes || order.description) && (
              <div>
                 <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Design Notes</span>
                 <p className="text-gray-700 mt-1 whitespace-pre-wrap leading-relaxed">{order.details?.designNotes || order.description}</p>
              </div>
            )}
        </div>
      </div>

      {/* RIGHT: Actions / Conversion Block */}
      <div className="p-5 bg-gray-50/70 flex flex-col justify-between items-center md:items-end gap-4 border-t md:border-t-0 md:border-l border-border md:w-72 shrink-0 relative">
         
         {!paymentLink ? (
            <div className="w-full h-full flex flex-col justify-between">
               <div className="space-y-4 mb-8">
                 <div className="text-xs text-primary font-bold text-center md:text-right">Price Configuration</div>
                 <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">$</span>
                    <Input 
                      type="number" 
                      placeholder="0.00" 
                      value={agreedPrice}
                      onChange={(e) => setAgreedPrice(e.target.value)}
                      className="text-right font-bold text-lg h-12 pl-7 border-primary/20 focus:border-accent"
                    />
                 </div>
                 
                 <Button 
                  onClick={handleConvert} 
                  disabled={isProcessing || isRejecting || !agreedPrice} 
                  className="w-full bg-green-600 hover:bg-green-700 text-white h-12 shadow-md relative overflow-hidden group"
                 >
                   {isProcessing ? "Finalizing..." : "Convert to Order"}
                 </Button>
               </div>
               
               <Button 
                  onClick={handleReject}
                  variant="ghost" 
                  disabled={isProcessing || isRejecting}
                  className="w-full text-red-500 hover:text-red-700 hover:bg-red-50 text-xs font-semibold h-10 transition-colors"
               >
                  {isRejecting ? "Deleting..." : <><Trash2 className="w-3.5 h-3.5 mr-1.5" /> Reject Request</>}
               </Button>
            </div>
         ) : (
            <div className="w-full h-full flex flex-col justify-center items-center text-center space-y-5 animate-in fade-in zoom-in duration-500">
               <div className="flex flex-col items-center gap-2 text-green-600 bg-green-50 w-full py-4 rounded-xl border border-green-100">
                 <CheckCircle2 className="w-10 h-10" /> 
                 <span className="font-black text-xl leading-tight">Deal Closed!</span>
               </div>
               
               <div className="w-full text-left space-y-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">The active trace has been cleaned up. Forward this specific Stripe link to the client for immediate payment.</p>
                  <Button onClick={copyLinkAndDismiss} size="default" className="w-full gap-2 h-12 text-sm shadow-xl active:scale-95 transition-all">
                    <Copy className="w-4 h-4" /> Copy & Dismiss
                  </Button>
               </div>
            </div>
         )}
      </div>
    </div>
  );
};
