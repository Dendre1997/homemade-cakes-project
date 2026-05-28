"use client";

import { CustomOrder } from "@/types";
import { format } from "date-fns";
import { Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAlert } from "@/contexts/AlertContext";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";

interface Props {
  order: CustomOrder & Record<string, any>;
  type: 'converted' | 'rejected';
}

export function CompactCustomOrderRow({ order, type }: Props) {
  const router = useRouter();
  const { showAlert } = useAlert();
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const displayName = order.contact?.name || order.contact?.socialNickname || order.customerName || "Unknown Customer";
  const orderDate = order.date || order.eventDate;

  const handleDelete = async () => {
    setIsRejectOpen(false);
    setIsRejecting(true);
    try {
      const res = await fetch(`/api/admin/custom-orders/${order._id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete the order");
      
      showAlert("Deleted successfully", "success");
      router.refresh();
    } catch (err: any) {
      showAlert("Failed to delete: " + err.message, "error");
      setIsRejecting(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-border">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1">
        <div className="min-w-[150px]">
          <p className="font-semibold text-primary">{displayName}</p>
          <p className="text-xs text-muted-foreground">{order.category || "Custom Order"}</p>
          {type === 'rejected' && (
            <p className="text-xs text-muted-foreground italic mt-1">
              Reason: {order.rejectionReason || 'No reason provided'}
            </p>
          )}
        </div>
        
        <div className="min-w-[120px]">
          <p className="text-sm font-medium">{orderDate ? format(new Date(orderDate), "MMM d, yyyy") : "TBD"}</p>
          <p className="text-xs text-muted-foreground">Event Date</p>
        </div>

        {type === 'converted' && order.agreedPrice !== undefined && (
          <div className="min-w-[100px]">
            <p className="text-sm font-bold text-accent">${order.agreedPrice.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Agreed Price</p>
          </div>
        )}

        {type === 'rejected' && order.createdAt && (
          <div className="min-w-[120px]">
             <p className="text-sm">{format(new Date(order.createdAt), "MMM d, yyyy")}</p>
             <p className="text-xs text-muted-foreground">Submitted</p>
          </div>
        )}
      </div>

      <div className="ml-4 flex items-center gap-2">
        {type === 'converted' && order.convertedOrderId && (
          <Link href={`/bakery-manufacturing-orders/orders/${order.convertedOrderId}`}>
            <Button variant="outline" size="sm" className="gap-2">
               <ExternalLink className="w-4 h-4" />
               View Order
            </Button>
          </Link>
        )}

        {type === 'rejected' && (
          <>
            <Button 
              onClick={() => setIsRejectOpen(true)}
              variant="ghost" 
              disabled={isRejecting}
              className="text-red-500 hover:text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>

            <ConfirmationModal
              isOpen={isRejectOpen}
              onClose={() => setIsRejectOpen(false)}
              onConfirm={handleDelete}
              title="Delete Permanently"
              confirmText="Delete"
              variant="danger"
             >
                Are you sure you want to permanently delete this rejected request?
             </ConfirmationModal>
          </>
        )}
      </div>
    </div>
  );
}
