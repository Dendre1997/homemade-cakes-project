import { CustomOrderFormData } from "@/lib/validation/customOrderSchema";
import { useRef, useState, useEffect } from "react";
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
  const [pickupAddress, setPickupAddress] = useState<string>("");

  useEffect(() => {
    if (orderData?.deliveryMethod === "pickup") {
      fetch("/api/admin/settings")
        .then((res) => res.json())
        .then((data) => {
           // Gracefully handle their variable naming discrepancies (pickupAddress vs deliveryAddress)
           const address = data?.checkout?.pickupAddress || data?.checkout?.deliveryAddress || "Home Bakery Location will be provided in final quote";
           setPickupAddress(address);
        })
        .catch(console.error);
    }
  }, [orderData?.deliveryMethod]);

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

  return (
    <div className="flex flex-col items-center">
      <h2 className="text-3xl font-heading font-bold text-primary mb-2">Request Received!</h2>
      <p className="text-primary/70 mb-8 max-w-md text-center">
        Thank you, {orderData.contact.name.split(' ')[0]}! We will review your custom request and contact you via phone or email with a price quote.
      </p>

      {/* Download Action */}
      <Button 
        onClick={handleDownload} 
        disabled={isDownloading}
        variant="outline"
        className="mb-8 border-accent text-accent hover:bg-accent/10"
      >
        <Download className="w-4 h-4 mr-2" />
        {isDownloading ? "Generating..." : "Download Receipt"}
      </Button>

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
            <div>
              <p className="text-primary/40 text-xs uppercase font-bold tracking-wider mb-0.5">Req. Date</p>
              <p className="font-medium">{format(new Date(orderData.date), "MMM d, yyyy")}</p>
            </div>
            <div className="col-span-2">
              <p className="text-primary/40 text-xs uppercase font-bold tracking-wider mb-0.5">Customer</p>
              <p className="font-semibold text-base">{orderData.contact.name}</p>
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
               Logistic Preferences
             </h3>
             <div className="bg-primary/5 p-3 rounded-xl border border-primary/10">
                 <p className="font-semibold text-primary/90 uppercase text-sm mb-1">{orderData.deliveryMethod}</p>
                 <p className="text-sm font-medium text-primary/70 mb-2">Time Slot: {orderData.timeSlot}</p>
                 
                 {orderData.deliveryMethod === "pickup" && pickupAddress && (
                    <div className="mt-2 pt-2 border-t border-primary/5">
                        <span className="text-xs font-semibold text-primary/80 block mb-0.5">Location:</span>
                        <p className="text-xs text-primary/60 leading-relaxed">{pickupAddress}</p>
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
                      {orderData.referenceImages.map((img, i) => (
                         <div key={i} className="w-14 h-14 relative rounded-lg border border-primary/10 shadow-sm shrink-0 bg-primary/5 overflow-hidden">
                            {/* NOTE: html-to-image requires CORS headers from your image hosts (like Cloudinary) to render images correctly! */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={img} alt="Ref" className="w-full h-full object-cover" crossOrigin="anonymous" />
                         </div>
                      ))}
                   </div>
                </div>
             )}
          </div>

          {/* Financial Breakdown (Mock for Custom Orders) */}
          <div className="bg-primary/5 border-t border-primary/10 px-6 py-5 mt-auto">
             <div className="space-y-2 text-sm font-medium text-primary/40 mb-3">
                 <p className="text-xs text-center leading-relaxed">
                   This is a custom request. Our baker will review your design requirements and attached images to calculate a final quote.
                 </p>
             </div>
             <div className="flex justify-between items-center mt-3 pt-4 border-t border-gray-300 border-dashed">
                 <span className="font-extrabold text-lg text-primary/40">Est. Total</span>
                 <span className="font-extrabold text-xl text-amber-600 italic">Pending Quote</span>
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
