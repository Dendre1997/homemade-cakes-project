import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Order, CartItem, Diameter } from "@/types";
import { format } from "date-fns";
import { Truck, Store } from "lucide-react";
import HeaderLogo from "@/components/ui/HeaderLogo";

interface ClientReceiptCardProps {
  order: Order;
  diameters: Diameter[];
  flavorMap: Record<string, string>;
}

const ReceiptItemImage = ({ effectiveImageUrl, alt }: { effectiveImageUrl: string | undefined, alt: string }) => {
  const [dataUri, setDataUri] = useState<string | undefined>(undefined);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!effectiveImageUrl) {
        setDataUri(undefined);
        return;
    }
    setError(false);
    
    if (effectiveImageUrl.startsWith('data:')) {
        setDataUri(effectiveImageUrl);
        return;
    }

    // Always fetch a fresh copy for the base64 conversion
    const proxyUrl = effectiveImageUrl.startsWith('/') 
        ? `${effectiveImageUrl}?cb=${Date.now()}`
        : `/_next/image?url=${encodeURIComponent(effectiveImageUrl)}&w=128&q=75&cb=${Date.now()}`;

    fetch(proxyUrl)
      .then(res => {
          if (!res.ok) throw new Error("Failed to fetch image proxy");
          return res.blob();
      })
      .then(blob => {
          const reader = new FileReader();
          reader.onloadend = () => setDataUri(reader.result as string);
          reader.readAsDataURL(blob);
      })
      .catch(err => {
          console.error("Failed loading image to Data URI:", err);
          setError(true);
      });
  }, [effectiveImageUrl]);

  if (!effectiveImageUrl || error) {
      return (
          <div className="w-14 h-14 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
              <span className="text-[10px] text-primary/40 font-medium">No Img</span>
          </div>
      );
  }

  return dataUri ? (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img 
        src={dataUri} 
        alt={alt} 
        className="w-14 h-14 object-cover rounded-xl shadow-sm shrink-0 border border-gray-100 bg-gray-50"
      />
  ) : (
      <div className="w-14 h-14 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0 animate-pulse"></div>
  );
};

export const ClientReceiptCard = ({
  order,
  diameters,
  flavorMap,
}: ClientReceiptCardProps) => {
  const isPaid = order.paymentDetails?.status === "paid" || order.isPaid;
  const orderIdShort = order._id.toString().slice(-6).toUpperCase();
  const dateFormatted = format(new Date(order.createdAt), "MMMM d, yyyy");

  // Get flavor name
  const getFlavorName = (id?: string) => {
    if (!id) return "";
    if (id.length === 24 && /^[0-9a-fA-F]+$/.test(id)) {
      return flavorMap[id] || id;
    }
    return id;
  };

  // Get diameter name
  const getDiameterName = (id?: string) => {
    if (!id) return "";
    const d = diameters.find((dia) => dia._id === id);
    return d ? d.name : id;
  };

  // Calculate Subtotal (gross without discounts)
  const calculateSubtotal = () => {
    return order.items.reduce((acc, item) => acc + (item.rowTotal || (item.price * item.quantity)), 0);
  };
  const subtotal = calculateSubtotal();

  const isDelivery = order.deliveryInfo.method === "delivery";

  return (
    <div className="bg-primary/10 text-primary w-[400px] rounded-2xl shadow-xl overflow-hidden font-sans border border-primary/60 flex flex-col pt-6 pb-2">
      {/* Header */}
      <div className="px-6 text-center space-y-1 mb-6">
        <HeaderLogo size={100} />
        <p className="text-primary/60 text-sm uppercase tracking-widest font-semibold flex items-center justify-center gap-2">
          Order Summary
          {isPaid ? (
            <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-bold">PAID</span>
          ) : (
            <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full font-bold">PENDING</span>
          )}
        </p>
      </div>

      {/* Meta details */}
      <div className="px-6 py-4 bg-gray-50/80 border-y border-gray-100 grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
        <div>
          <p className="text-primary/40 text-xs uppercase font-bold tracking-wider mb-0.5">Order ID</p>
          <p className="font-semibold font-mono">#{orderIdShort}</p>
        </div>
        <div>
          <p className="text-primary/40 text-xs uppercase font-bold tracking-wider mb-0.5">Date</p>
          <p className="font-medium">{dateFormatted}</p>
        </div>
        <div className="col-span-2">
          <p className="text-primary/40 text-xs uppercase font-bold tracking-wider mb-0.5">Customer</p>
          <p className="font-semibold text-base">{order.customerInfo.name}</p>
          <p className="text-primary/40">{order.customerInfo.phone}</p>
          {/* Hide bogus emails */}
          {order.customerInfo.email && !order.customerInfo.email.includes("placeholder.com") && (
            <p className="text-primary/40">{order.customerInfo.email}</p>
          )}
        </div>
      </div>

      {/* Fulfillment */}
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-primary/40 text-xs uppercase font-bold tracking-wider mb-3 flex items-center gap-1.5">
          {isDelivery ? <Truck className="w-4 h-4" /> : <Store className="w-4 h-4" />}
          {isDelivery ? "Delivery To" : "Pickup"}
        </h3>
        
        {order.deliveryInfo.deliveryDates?.length > 0 && (
          <div className="space-y-3">
            {order.deliveryInfo.deliveryDates.map((dateObj, idx) => (
              <div key={idx} className="bg-purple-50/50 p-3 rounded-xl border border-purple-100/50">
                 <p className="font-semibold text-primary/90">{format(new Date(dateObj.date), "EEE, MMMM d, yyyy")}</p>
                 <p className="text-sm text-primary/40 mt-0.5">{dateObj.timeSlot}</p>
              </div>
            ))}
          </div>
        )}
        
        {isDelivery && (
            <p className="text-sm font-medium mt-3 text-primary/40 bg-gray-50 p-3 rounded-xl border border-gray-100">
               {order.deliveryInfo.address || "Address pending"}
            </p>
        )}
      </div>

      {/* Line Items */}
      <div className="px-6 py-4 space-y-4">
        <p className="text-primary/60 text-xs uppercase font-bold tracking-wider">Items</p>
        {order.items.map((item: CartItem, idx: number) => {
          const isCustom = item.productType === 'custom' || item.isCustom;
          const displaySize = isCustom ? item.customSize || getDiameterName(item.diameterId || item.selectedConfig?.cake?.diameterId) : getDiameterName(item.diameterId);
          const displayFlavor = isCustom ? item.customFlavor || getFlavorName(item.selectedConfig?.cake?.flavorId || item.flavor) : getFlavorName(item.flavor || item.selectedConfig?.cake?.flavorId);

          const fallbackIdx = order.referenceImages ? Math.min(idx, Math.max(0, order.referenceImages.length - 1)) : 0;
          const effectiveImageUrl = item.imageUrl || (order.referenceImages && order.referenceImages.length > 0 ? order.referenceImages[fallbackIdx] : undefined);

          return (
            <div key={idx} className="flex items-start gap-4 pb-4 border-b border-gray-50 last:border-0 last:pb-0">
               <ReceiptItemImage effectiveImageUrl={effectiveImageUrl} alt={item.name} />
               <div className="flex-1 min-w-0 pt-0.5">
                 <div className="flex justify-between items-start gap-2">
                    <p className="font-bold text-sm text-primary/60 leading-snug">{item.name}</p>
                    <p className="font-semibold text-sm shrink-0">
                        ${(item.rowTotal || (item.price * item.quantity)).toFixed(2)}
                    </p>
                 </div>
                 <div className="mt-1 text-xs text-primary/40 font-medium space-y-0.5">
                    {displaySize && <p>Size: {displaySize}</p>}
                    {displayFlavor && <p>Flavor: {displayFlavor}</p>}
                    <p className="text-primary/40">Qty: {item.quantity}</p>
                 </div>
               </div>
            </div>
          )
        })}
      </div>

      {/* Financial Breakdown */}
      <div className="bg-gray-50/50 border-t border-gray-100 px-6 py-5 mt-auto">
         <div className="space-y-2.5 text-sm font-medium text-primary/40">
             <div className="flex justify-between">
                 <span>Subtotal</span>
                 <span>${subtotal.toFixed(2)}</span>
             </div>
             
             {order.discountInfo && order.discountInfo.amount > 0 && (
                <div className="flex justify-between text-green-600 bg-green-50 px-2 py-1 -mx-2 rounded-md">
                    <span className="flex items-center gap-1">
                        Discount
                        {(order.discountInfo.code || order.discountInfo.name) && (
                           <span className="text-xs font-bold uppercase tracking-wider bg-green-100 text-green-700 px-1.5 py-0.5 rounded-sm">
                               {order.discountInfo.code || order.discountInfo.name}
                           </span>
                        )}
                    </span>
                    <span>-${order.discountInfo.amount.toFixed(2)}</span>
                </div>
             )}
             
             {/* Note: Delivery fees aren't fully architected in the totalAmount yet consistently, 
                 so for now it  will just show the final db total amount difference safely */}
             
         </div>
         <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-200/60">
             <span className="font-extrabold text-lg text-primary/40">Total</span>
             <span className="font-extrabold text-2xl text-primary">${order.totalAmount.toFixed(2)}</span>
         </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-6 text-center bg-gray-50 text-xs font-medium text-primary/40 border-t border-primary/100">
          <p className="mb-1 text-primary/40 font-semibold">Thank you for your order! 💖</p>
          <p>@d&kcreations&bull; d&kcreations.com</p>
      </div>

    </div>
  );
};
