"use client";

import { CustomOrder } from "@/types";
import { format } from "date-fns";
import { 
  Calendar, Phone, Mail, Copy, CheckCircle2, 
  Trash2, AlertTriangle, Instagram, Globe, 
  ScrollText, Layers, Box, Cake
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { useAlert } from "@/contexts/AlertContext";

interface CustomOrderCardProps {
  order: CustomOrder & Record<string, any>;
}

export const CustomOrderCard = ({ order }: CustomOrderCardProps) => {
  const router = useRouter();
  const { showAlert } = useAlert();
  const [agreedPrice, setAgreedPrice] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectOpen] = useState(false);

  // Use all reference images
  const images = order.referenceImages || order.referenceImageUrls || [];
  const displayImage = images.length > 0 ? images[0] : null;

  const handleConvert = async () => {
    setIsConvertModalOpen(false);
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/admin/custom-orders/${order._id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agreedPrice: Number(agreedPrice) }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to convert");
      
      setPaymentLink(data.paymentLink);
    } catch (err: any) {
      showAlert("Conversion failed: " + err.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    setIsRejectOpen(false);
    setIsRejecting(true);
    try {
      const res = await fetch(`/api/admin/custom-orders/${order._id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete the order");
      
      router.refresh();
    } catch (err: any) {
      showAlert("Failed to reject: " + err.message, "error");
      setIsRejecting(false);
    }
  };

  const copyLinkAndDismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (paymentLink) {
      navigator.clipboard.writeText(paymentLink);
      showAlert("Payment link copied to clipboard!", "success");
      router.refresh(); // Refresh list to remove the converted/deleted card from UI
    }
  };

  const stopPropagation = (e: React.MouseEvent | React.FocusEvent) => {
    e.stopPropagation();
  };

  const displayName = order.contact?.name || order.contact?.socialNickname || order.customerName || "Unknown Customer";
  const displayEmail = order.contact?.email || order.customerEmail;
  const displayPhone = order.contact?.phone || order.customerPhone;
  const orderDate = order.date || order.eventDate;

  return (
    <div className="flex flex-col h-full bg-white rounded-[16px] shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border-none relative">
        <Link 
          href={`/bakery-manufacturing-orders/custom-orders/${order._id}`}
          className="block h-full group"
        >
        
        {/* Header: Date & Meta */}
        <div className="px-5 pt-4 flex justify-between items-start">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#764a4d]" />
            <div className="flex flex-col">
              <span className="text-xs font-bold leading-none text-[#231416]">
                {orderDate ? format(new Date(orderDate), "MMM d") : "TBD"}
              </span>
              <span className="text-[10px] sm:text-xs font-medium text-[#764a4d]">
                {order.timeSlot || "Anytime"}
              </span>
            </div>
          </div>
          <span className="text-xs font-mono text-[#A39E9A]">
            #{order._id.slice(-4)}
          </span>
        </div>

        {/* Customer Info */}
        <div className="px-5 py-2 mt-1 border-b border-dashed border-[#f0f0f0]">
          <div className="flex justify-between items-center">
            <h3 className="font-heading text-lg text-[#231416] leading-tight line-clamp-1">
              {displayName}
            </h3>
            {order.contact?.socialPlatform === "instagram" ? (
               <Instagram className="w-3.5 h-3.5 text-[#764a4d]" />
            ) : (
               <Globe className="w-3.5 h-3.5 text-[#764a4d]" />
            )}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[#764a4d]/70 mt-1">
             {displayEmail && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {displayEmail}</span>}
             {displayPhone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {displayPhone}</span>}
          </div>
        </div>

        {/* Visuals - Horizontal scroll for images if multiple */}
        {displayImage && (
          <div className="px-5 py-3 flex gap-2 overflow-x-auto custom-scrollbar no-scrollbar" onClick={stopPropagation}>
             <div className="relative w-20 h-20 rounded-lg overflow-hidden shrink-0 border border-black/5 shadow-sm">
                <Image src={displayImage} alt="Reference" fill className="object-cover" />
             </div>
             {images.slice(1).map((img: string, idx: number) => (
                <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden shrink-0 border border-black/5 shadow-sm">
                   <Image src={img} alt={`Ref ${idx+2}`} fill className="object-cover" />
                </div>
             ))}
          </div>
        )}

        {/* The "Receipt" Block */}
        <div className="mx-4 my-2 p-3 bg-[#fdf2f1] rounded-md flex-1 text-sm">
           <div className="space-y-3">
              <div className="flex justify-between items-center border-b border-[#764a4d]/10 pb-2">
                 <span className="font-heading text-[#231416] uppercase text-[10px] tracking-wider">
                    {order.category || "Custom Order"}
                 </span>
                 <span className="text-[#764a4d] text-xs font-bold">
                    {order.details?.size || "N/A"}
                 </span>
              </div>

              <div className="flex flex-col gap-1.5 text-[#764a4d]">
                 <div className="flex items-start gap-2">
                    <Layers className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span className="text-xs leading-tight">{order.details?.flavor || "Flavor TBD"}</span>
                 </div>
                 
                 {order.details?.textOnCake && (
                    <div className="flex items-start gap-2 p-1.5 bg-white/50 rounded border border-[#764a4d]/10">
                       <ScrollText className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                       <span className="text-[11px] italic text-[#231416] leading-tight">
                          "{order.details.textOnCake}"
                       </span>
                    </div>
                 )}
                 
                 {(order.details?.designNotes || order.description) && (
                    <div className="flex items-start gap-2">
                       <Box className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                       <p className="text-[11px] text-gray-600 line-clamp-3 leading-snug">
                          {order.details?.designNotes || order.description}
                       </p>
                    </div>
                 )}
              </div>

              {/* Allergies Row */}
              {order.allergies && order.allergies !== "No" && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-2 py-1.5 mt-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-red-700 font-semibold text-[10px] leading-tight">{order.allergies}</p>
                </div>
              )}
           </div>
        </div>

        </Link>
        {/* Footer: Conversion / Actions */}
        <div className="px-5 pb-4 pt-2 mt-auto border-t border-gray-50 bg-gray-50/30">
           {!paymentLink ? (
              <div className="flex flex-col gap-3">
                 <div className="relative" onClick={stopPropagation}>
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-xs">$</span>
                    <Input 
                      type="number" 
                      placeholder="Agreed Price" 
                      value={agreedPrice}
                      onChange={(e) => setAgreedPrice(e.target.value)}
                      onFocus={stopPropagation}
                      className="text-right font-bold text-sm h-9 pl-7 border-[#764a4d]/10 focus:ring-[#764a4d]/10"
                    />
                 </div>
                 <div className="flex gap-2">
                    <Button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!agreedPrice || isNaN(Number(agreedPrice))) {
                           showAlert("Please enter a valid number for the price.", "error");
                           return;
                        }
                        setIsConvertModalOpen(true);
                      }} 
                      disabled={isProcessing || isRejecting || !agreedPrice} 
                      className="flex-1  text-white h-9 text-xs shadow-sm"
                    >
                      {isProcessing ? "Finalizing..." : "Convert"}
                    </Button>
                    <Button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsRejectOpen(true);
                      }}
                      variant="ghost" 
                      disabled={isProcessing || isRejecting}
                      className="px-3 text-red-500 hover:text-primary hover:bg-subtitleBackground h-9 transition-colors"
                    >
                       <Trash2 className="w-4 h-4" />
                    </Button>
                 </div>
              </div>
           ) : (
              <div className="flex flex-col items-center gap-2 animate-in fade-in zoom-in duration-300">
                 <div className="flex items-center gap-2 text-primary text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4" /> 
                    Done!
                 </div>
                 <Button onClick={copyLinkAndDismiss} size="sm" className="w-full gap-2 h-9 text-[11px] shadow-sm">
                    <Copy className="w-3.5 h-3.5" /> Copy & Dismiss
                 </Button>
              </div>
           )}

           {/* Modals */}
           <ConfirmationModal
            isOpen={isConvertModalOpen}
            onClose={() => setIsConvertModalOpen(false)}
            onConfirm={handleConvert}
            title="Convert to Order"
            confirmText="Convert Now"
           >
              Are you sure you want to convert this request into a production order for <span className="font-bold">${agreedPrice}</span>? This will generate a payment link for the customer.
           </ConfirmationModal>

           <ConfirmationModal
            isOpen={isRejectModalOpen}
            onClose={() => setIsRejectOpen(false)}
            onConfirm={handleReject}
            title="Reject Request"
            confirmText="Delete Permanently"
            variant="danger"
           >
              Are you sure you want to reject and completely delete this custom request? 
              <span className="block mt-2 font-semibold">All associated reference images will be permanently purged from cloud storage.</span>
           </ConfirmationModal>
        </div>
      </div>
  );
};
