import { Order, OrderStatus } from "@/types"; 
import { format, isToday, isTomorrow } from "date-fns";
import { 
  Printer, Eye, Truck, Store, Instagram, 
  Globe, ScrollText, Box, Cake, Layers 
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import Link from "next/link";
import { cn } from "../../../lib/utils";

interface OrderCardProps {
  order: Order;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
  diametersMap?: Record<string, number>;
}

export const OrderCard = ({ order, onStatusChange, diametersMap }: OrderCardProps) => {
  const isDelivery = order.deliveryInfo.method === "delivery";
  const primaryDateObj = order.deliveryInfo.deliveryDates?.[0] || { date: order.createdAt, timeSlot: "N/A" };
  const primaryDate = new Date(primaryDateObj.date);
  const isUrgent = isToday(primaryDate) || isTomorrow(primaryDate);

  const renderItemDetails = (item: any) => {
    if (item.selectedConfig?.cake) {
      return (
        <div className="flex flex-col gap-2 mt-1 w-full">
          {/* Bento Section */}
          <div className="pl-2 border-l-2 border-[#764a4d] bg-[#764a4d]/5 p-1.5 rounded-r text-xs">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Cake className="w-3 h-3 text-[#764a4d]" />
              <span className="font-bold text-[#231416] uppercase tracking-wide">Bento Cake</span>
            </div>
            <span className="text-[#231416] block">{item.flavor.split('For Bento')[1] || "Custom Flavor"}</span> 
            {item.selectedConfig.cake.inscription && (
              <div className="flex items-start gap-1 mt-1 text-[#764a4d]">
                <ScrollText className="w-3 h-3 shrink-0" />
                <span className="italic font-medium">"{item.selectedConfig.cake.inscription}"</span>
              </div>
            )}
          </div>

          {/* Cupcakes Section */}
          <div className="pl-2 border-l-2 border-gray-300 text-xs text-gray-600">
             <div className="flex items-center gap-1.5 mb-0.5">
              <Box className="w-3 h-3" />
              <span className="font-bold">Box Items ({item.selectedConfig.quantityConfigId})</span>
            </div>
             <span>{item.flavor.split('For Bento')[0] || "Mix"}</span>
          </div>
        </div>
      );
    }

    if (item.selectedConfig?.items && !item.selectedConfig?.cake) {
      return (
        <div className="flex flex-col gap-1 mt-0.5 w-full">
          <div className="flex items-center gap-1.5 text-xs text-[#764a4d] font-medium">
            <Box className="w-3 h-3" />
            <span>Set of {item.selectedConfig.quantityConfigId}</span>
          </div>
          <span className="text-xs text-[#231416] pl-4.5">{item.flavor}</span>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-0.5 text-xs text-[#764a4d] mt-0.5">
        <span className="flex items-center gap-1">
          <Layers className="w-3 h-3" />
          {item.flavor}
        </span>
        {item.diameterId && (
          <span>
            Size: {diametersMap && diametersMap[item.diameterId.toString()] 
              ? `${diametersMap[item.diameterId.toString()]} inches` 
              : `${String(item.diameterId).slice(-4)}...`}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-[16px] shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden border-none group">
      {/* Header: Urgency & Meta */}
      <div className="px-5 pt-4 flex justify-between items-start">
        <div className="flex items-center gap-2">
          {isDelivery ? <Truck className="w-4 h-4 text-[#764a4d]" /> : <Store className="w-4 h-4 text-[#764a4d]" />}
          <div className="flex flex-col">
            <span className={cn("text-xs font-bold leading-none", isUrgent ? "text-red-600" : "text-[#231416]")}>
              {format(primaryDate, "MMM d")}
            </span>
            <span className={cn("text-[10px] sm:text-xs font-medium", isUrgent ? "text-red-500" : "text-[#764a4d]")}>
              {primaryDateObj.timeSlot}
            </span>
          </div>
        </div>
        <span className="text-xs font-mono text-[#A39E9A]">#{order._id.slice(-4)}</span>
      </div>

      {/* Customer Info */}
      <div className="px-5 py-2 mt-1 border-b border-dashed border-[#f0f0f0]">
         <div className="flex justify-between items-center">
            <h3 className="font-heading text-lg text-[#231416] leading-tight line-clamp-1">
              {order.customerInfo.name}
            </h3>
            {order.source === 'instagram' 
              ? <Instagram className="w-3.5 h-3.5 text-[#764a4d]" /> 
              : <Globe className="w-3.5 h-3.5 text-[#764a4d]" />
            }
         </div>
      </div>

      {/* The "Receipt" Block */}
      <div className="mx-4 my-2 p-3 bg-[#fdf2f1] rounded-md flex-1">
        <div className="space-y-4">
          {order.items.map((item, idx) => {
            const hasDiscount = item.originalPrice && item.originalPrice > item.price;
            
            return (
              <div key={idx} className="flex gap-3 items-start relative">
                {/* Quantity Badge */}
                <div className="shrink-0 w-6 h-6 rounded-full bg-[#2f1b23] flex items-center justify-center text-white text-[10px] font-bold mt-0.5 shadow-sm">
                  {item.quantity}
                </div>
                
                <div className="flex flex-col min-w-0 w-full">
                  {/* Item Header: Name & Price */}
                  <div className="flex justify-between items-start">
                    <span className="font-heading text-sm text-[#231416] leading-snug">
                      {item.name}
                    </span>
                    <div className="text-right flex flex-col items-end leading-none">
                       <span className="text-xs font-bold text-[#2f1b23]">
                         ${(item.price * item.quantity).toFixed(2)}
                       </span>
                       {hasDiscount && (
                         <span className="text-[10px] text-gray-400 line-through decoration-red-400">
                           ${((item.originalPrice ?? 0) * item.quantity).toFixed(2)}
                         </span>
                       )}
                    </div>
                  </div>

                  {/* Polymorphic Item Details */}
                  {renderItemDetails(item)}

                  {!item.selectedConfig?.cake && item.inscription && (
                    <div className="flex items-start gap-1 mt-1.5 p-1 bg-white/50 rounded border border-[#764a4d]/10">
                      <ScrollText className="w-3 h-3 mt-0.5 shrink-0 text-[#764a4d]" />
                      <span className="text-[11px] italic text-[#231416] leading-tight">
                        "{item.inscription}"
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="px-5 pb-4 mt-auto flex items-center justify-between gap-2 pt-2">
        <Select
          value={order.status}
          onValueChange={(val) => onStatusChange(order._id, val as OrderStatus)}
        >
          <SelectTrigger className="h-8 w-[140px] text-xs bg-white border-[#A39E9A]/20 focus:ring-[#2f1b23]/10 text-[#231416]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {Object.values(OrderStatus).map((status) => (
              <SelectItem key={status} value={status} className="text-xs capitalize">
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1">
          <Link href={`/admin/orders/${order._id.toString()}/print`} target="_blank">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-[#2f1b23] hover:bg-[#2f1b23]/5">
              <Printer className="w-4 h-4" />
            </Button>
          </Link>
          <Link href={`/admin/orders/${order._id.toString()}`}>
             <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-[#764a4d] hover:bg-[#764a4d]/5">
              <Eye className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
