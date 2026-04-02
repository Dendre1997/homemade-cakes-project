import { CustomOrderFormData } from "@/lib/validation/customOrderSchema";
import { useRef, useState, useEffect, useMemo } from "react";
import { toPng } from "html-to-image";
import { CheckCircle2, Download, Cake, Info } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/Button";
import HeaderLogo from "@/components/ui/HeaderLogo";
interface Step6Props {
  orderData: CustomOrderFormData | null;
}

export default function Step6Success({ orderData }: Step6Props) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!receiptRef.current) return;
    setIsDownloading(true);
    try {
      const dataUrl = await toPng(receiptRef.current, {
        quality: 1,
        pixelRatio: 2,
        cacheBust: true, // Bypass CORS cache issues
        backgroundColor: '#ffffff'
      });

      const link = document.createElement("a");
      link.download = `CustomOrder_${orderData?.contact.name.replace(/\s+/g, '_')}_Receipt.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Error generating receipt image:", error);
      alert("Failed to download receipt image.");
    } finally {
      setIsDownloading(false);
    }
  };

  if (!orderData) return null;

  const { name, socialNickname, socialPlatform } = orderData.contact;
  const hasSocialPlatform = !!socialPlatform;

  // Build the display name based on what's available
  const displayName = (() => {
    const firstName = name?.trim().split(" ")[0] || "";
    const nickPart = socialNickname?.trim() || "";
    const platformPart = hasSocialPlatform
      ? `${socialPlatform!.charAt(0).toUpperCase() + socialPlatform!.slice(1)} `
      : "";

    if (firstName && nickPart) {
      return `${firstName} (${platformPart}${nickPart})`;
    }
    return firstName || nickPart || "there";
  })();

  // Contact method adapts to what the customer chose
  const contactMethod = hasSocialPlatform && socialNickname
    ? `via ${socialPlatform!.charAt(0).toUpperCase() + socialPlatform!.slice(1)} at ${socialNickname}`
    : "via phone or email";

  return (
    <div className="flex flex-col items-center">
      <h2 className="text-3xl font-heading font-bold text-primary mb-2">Request Received!</h2>
      <p className="text-primary/70 mb-8 max-w-md text-center">
        Thank you, {displayName}! We will review your custom request and contact you {contactMethod} with a price quote.
      </p>

      {/* Download Action */}
      {/* <Button 
        onClick={handleDownload} 
        disabled={isDownloading}
        variant="outline"
        className="mb-8 border-accent text-accent hover:bg-accent/10"
      >
        <Download className="w-4 h-4 mr-2" />
        {isDownloading ? "Generating..." : "Download Receipt"}
      </Button> */}

      {/* Digital Receipt Card (The element to capture) */}
      <div className="w-full max-w-[400px] rounded-2xl shadow-xl overflow-hidden scale-95 sm:scale-100 mx-auto border-primary/10 border bg-primary/5">
        <div ref={receiptRef} className="bg-primary/10 text-primary w-full h-full font-sans flex flex-col pt-6 pb-0">
          
          {/* Header */}
          <div className="px-6 text-center space-y-1 mb-6">
             <div className="w-24 h-24  flex items-center justify-center mx-auto mb-3">
                <HeaderLogo />
             </div>
             <p className="text-primary/60 text-sm uppercase tracking-widest font-semibold flex items-center justify-center gap-2">
                 Order Summary
                 <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full font-bold">PENDING QUOTE</span>
             </p>
          </div>

          {/* Meta details */}
          <div className="px-6 py-4 bg-gray-50/80 border-y border-gray-100 grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
            <div>
              <p className="text-primary/40 text-xs uppercase font-bold tracking-wider mb-0.5">Order Type</p>
              <p className="font-semibold font-mono text-xs mt-1">CUSTOM</p>
            </div>
            
            <div className="col-span-2">
              <p className="text-primary/40 text-xs uppercase font-bold tracking-wider mb-0.5">Customer</p>
              {orderData.contact.name ? (
                <>
                  <p className="font-semibold text-base">{orderData.contact.name}</p>
                  {orderData.contact.socialNickname && (
                    <p className="text-primary/50 text-xs mt-0.5">{orderData.contact.socialPlatform}</p>
                  )}
                </>
              ) : (
                <p className="font-semibold text-base">{orderData.contact.socialNickname}</p>
              )}
              <p className="text-primary/60 font-medium">{orderData.contact.phone}</p>
              {orderData.contact.email && (
                 <p className="text-primary/50 text-xs mt-0.5">{orderData.contact.email}</p>
              )}
            </div>
          </div>

          {/* Fulfillment */}
          <div className="px-6 py-4 border-b border-gray-100">
             <h3 className="text-primary/40 text-xs uppercase font-bold tracking-wider mb-3 flex items-center gap-1.5">
               <Info className="w-4 h-4" />
               Requested Date & Time
             </h3>
             <div className="bg-primary/5 p-3 rounded-xl border border-primary/10">
                 <p className="font-semibold text-primary/90 uppercase text-sm mb-1">{orderData.deliveryMethod}</p>
                 <p className="text-sm font-medium text-primary/70 mb-1">Date: {format(new Date(orderData.date), "MMM d, yyyy")}</p>
                 <p className="text-sm font-medium text-primary/70">Time Slot: {orderData.timeSlot}</p>
                 
                 {orderData.deliveryMethod === "pickup" && (
                    <div className="mt-2 pt-2 border-t border-primary/5">
                        <span className="text-xs font-semibold text-primary/80 block mb-0.5">Location:</span>
                        <p className="text-xs text-primary/60 leading-relaxed">Location will be provided in final quote after confirmation.</p>
                    </div>
                 )}
                 {orderData.deliveryMethod === "delivery" && (
                    <div className="mt-2 pt-2 border-t border-primary/5">
                        <p className="text-xs text-primary/50 italic leading-relaxed">
                            The baker will calculate delivery options based on your location and include them in the final quote.
                        </p>
                    </div>
                 )}
             </div>
          </div>

          {/* Product Breakdown */}
          <div className="px-6 py-4 space-y-4">
             <p className="text-primary/60 text-xs uppercase font-bold tracking-wider">Custom Creation</p>
             
             <div className="flex flex-col gap-2 pb-2">
                 <div className="flex justify-between items-start gap-2">
                     <p className="font-extrabold text-base text-primary/80 leading-snug">{orderData.category}</p>
                     <p className="font-semibold text-sm shrink-0 text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100 italic">
                         TBD
                     </p>
                 </div>
                 <div className="mt-1 text-sm text-primary/60 font-medium space-y-1 bg-primary/5 p-3 rounded-lg border border-primary/10 shadow-sm transition-all overflow-hidden">
                     {orderData.details?.size && (
                       <div className="flex gap-2">
                         <span className="text-primary/40 w-24 shrink-0">Specs:</span>
                         <span className="text-primary/80 font-semibold truncate">{orderData.details.size}</span>
                       </div>
                     )}
                     {orderData.details?.flavor && (
                       <div className="flex gap-2">
                         <span className="text-primary/40 w-24 shrink-0">Flavor:</span>
                         <span className="text-primary/80 truncate">{orderData.details.flavor}</span>
                       </div>
                     )}
                     {orderData.details?.textOnCake && (
                       <div className="flex gap-2">
                         <span className="text-primary/40 w-24 shrink-0">Inscription:</span>
                         <span className="text-primary/80 font-serif italic break-words whitespace-pre-wrap min-w-0 flex-1">"{orderData.details.textOnCake}"</span>
                       </div>
                     )}
                     {orderData.details?.designNotes && (
                       <div className="flex gap-2 pt-2 mt-2 border-t border-primary/10">
                         <span className="text-primary/40 w-24 shrink-0">Notes:</span>
                         <span className="text-primary/70 text-xs leading-relaxed break-words whitespace-pre-wrap min-w-0 flex-1">{orderData.details.designNotes}</span>
                       </div>
                )}
                 </div>
             </div>

             {/* Reference Images Array */}
             {orderData.referenceImages.length > 0 && (
                <div className="pt-2">
                   <p className="text-[10px] text-primary/40 font-bold uppercase tracking-widest mb-2">Attached References ({orderData.referenceImages.length})</p>
                   <div className="flex gap-2 overflow-hidden">
                      {/* Cache-bust each URL once on mount to prevent CORS/browser-cache poisoning.
                          When the same URL was previously fetched without crossOrigin="anonymous"
                          (e.g. in the design step), the browser serves the cached no-CORS response
                          here, causing the image to go blank. Appending ?_cb=<timestamp> forces a
                          fresh Cloudinary request that includes proper CORS headers. */}
                      {orderData.referenceImages.map((img, i) => {
                        const cbImg = img.includes("?") ? `${img}&_cb=${i}` : `${img}?_cb=${i}`;
                        return (
                          <div key={i} className="w-14 h-14 relative rounded-lg border border-primary/10 shadow-sm shrink-0 bg-primary/5 overflow-hidden">
                             {/* eslint-disable-next-line @next/next/no-img-element */}
                             <img src={cbImg} alt="Ref" className="w-full h-full object-cover" crossOrigin="anonymous" />
                          </div>
                        );
                      })}
                   </div>
                </div>
             )}
          </div>

          {/* Financial Breakdown (Mock for Custom Orders) */}
          <div className="bg-primary/5 border-t border-primary/10 px-6 py-5 mt-auto">
             <div className="space-y-2 text-sm font-medium text-primary/40 mb-3">
                 <p className="text-xs font-bold text-center leading-relaxed">
                   This is an estimated price based on the information provided. The final price may change depending on design details and customization. The baker will confirm the final quote after reviewing your request
                 </p>
             </div>
             <div className="flex justify-between items-center mt-3 pt-4 border-t border-gray-300 border-dashed">
                 <span className="font-extrabold text-lg text-primary/40">Est. Total</span>
                 <span className="font-extrabold text-xl text-amber-600 italic">${orderData.approximatePrice}</span>
             </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-6 text-center bg-gray-50 text-xs font-medium text-primary/40 border-t border-gray-200">
              <p className="mb-1 text-primary/50 font-semibold">Thank you for your custom request! 💖</p>
              <p>@D&KCreations</p>
          </div>

        </div>
      </div>
    </div>
  );
}
