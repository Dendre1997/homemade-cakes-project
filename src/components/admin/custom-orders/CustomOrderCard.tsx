import { CustomOrder } from "@/types";
import { format } from "date-fns";
import { Calendar, Phone, Mail, ArrowRight, MessageCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

interface CustomOrderCardProps {
  order: CustomOrder;
}

export const CustomOrderCard = ({ order }: CustomOrderCardProps) => {
  const isConverted = order.status === "converted";
  const statusColor =
    order.status === "new"
      ? "bg-red-100 text-red-800"
      : order.status === "negotiating"
      ? "bg-yellow-100 text-yellow-800"
      : order.status === "converted"
      ? "bg-green-100 text-green-800"
      : "bg-gray-100 text-gray-800";

  // Use admin selected image, or first reference image, or placeholder
  const displayImage =
    order.adminSelectedImage ||
    (order.referenceImageUrls && order.referenceImageUrls.length > 0
      ? order.referenceImageUrls[0]
      : null);

  return (
    <div className="flex flex-col md:flex-row w-full bg-card border border-border rounded-xl shadow-sm hover:shadow-md transition-all overflow-hidden group">
      {/* LEFT: Visuals */}
      <div className="relative w-full md:w-48 h-48 md:h-auto shrink-0 bg-muted">
        {displayImage ? (
          <Image
            src={displayImage}
            alt="Reference"
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground bg-gray-100">
            <span className="text-xs">No Image</span>
          </div>
        )}
        
        {/* Status Badge (Overlay on Mobile/Desktop) */}
        <div className="absolute top-2 left-2">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide shadow-sm ${statusColor}`}>
              {order.status}
            </span>
        </div>
      </div>

      {/* MIDDLE: Content */}
      <div className="flex-1 p-4 flex flex-col justify-center min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
           <h3 className="font-bold text-lg text-primary truncate">
             {order.customerName}
           </h3>
           <div className="flex items-center text-xs text-muted-foreground whitespace-nowrap">
              <Calendar className="w-3 h-3 mr-1" />
              {order.eventDate ? format(new Date(order.eventDate), "MMM dd, yyyy") : "TBD"}
           </div>
        </div>

        <div className="space-y-1 mb-3">
             <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="w-3 h-3 text-primary/70" />
                <span className="truncate">{order.customerEmail}</span>
             </div>
             <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="w-3 h-3 text-primary/70" />
                <span className="truncate">{order.customerPhone}</span>
             </div>
        </div>

        <p className="text-sm text-gray-500 line-clamp-2 mb-2">
            {order.description}
        </p>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-auto pt-2 border-t border-border/50">
            <MessageCircle className="w-3 h-3" /> 
            <span>via {order.communicationMethod || "Web Form"}</span>
            {isConverted && (
                <span className="ml-auto text-green-600 font-medium">
                    Order #{order.convertedOrderId?.slice(-4)}
                </span>
            )}
        </div>
      </div>

      {/* RIGHT: Actions */}
      <div className="p-4 bg-gray-50/50 flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-4 border-t md:border-t-0 md:border-l border-border md:w-48 shrink-0">
         <div className="text-left md:text-right">
             <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Budget</div>
             <div className="text-lg font-bold text-primary">
                 {order.budgetRange}
             </div>
         </div>

         <Link href={`/admin/custom-orders/${order._id}`} className="w-full md:w-auto">
            <Button size="sm" variant={order.status === 'new' ? "default" : "outline"} className="w-full md:w-auto gap-2">
                {isConverted ? "View Deal" : "Manage"} 
                {!isConverted && <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />}
            </Button>
         </Link>
      </div>
    </div>
  );
};
