"use client";

import React, { useState } from "react";
import { Order } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Bell, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

interface PendingOrdersCardProps {
  pendingOrders: Order[];
}

export default function PendingOrdersCard({ pendingOrders }: PendingOrdersCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const count = pendingOrders.length;
  const isHighPriority = count > 0;

  const handleOrderClick = (orderId: string) => {
    setIsOpen(false); // Close dialog
    router.push(`/admin/orders/${orderId}`);
  };

  return (
    <>
      <Card
        className={`border-l-4 shadow-sm cursor-pointer transition-colors hover:bg-accent/5 ${
          isHighPriority ? "border-l-orange-500" : "border-l-gray-200"
        }`}
        onClick={() => {
          if (count > 0) setIsOpen(true);
        }}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Action Required
          </CardTitle>
          <Bell
            className={`h-4 w-4 ${
              isHighPriority ? "text-orange-500" : "text-gray-400"
            }`}
          />
        </CardHeader>
        <CardContent>
          <div
            className={`text-2xl font-bold ${
              isHighPriority ? "text-orange-600" : ""
            }`}
          >
            {count}
          </div>
          <p className="text-xs text-muted-foreground">
            {count === 0
              ? "All caught up!"
              : `${count} orders waiting for confirmation`}
          </p>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pending Orders ({count})</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-4">
            {pendingOrders.map((order) => (
              <div
                key={order._id.toString()}
                onClick={() => handleOrderClick(order._id.toString())}
                className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-orange-300 hover:bg-orange-50 cursor-pointer transition-all group"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">
                      {order.customerInfo.name}
                    </span>
                    <span className="text-xs text-muted-foreground px-2 py-0.5 bg-secondary rounded-full">
                      {format(new Date(order.createdAt), "MMM d, h:mm a")}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                     {order.items.length} items • ${order.totalAmount.toFixed(2)}
                  </div>
                </div>
                <div className="text-orange-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
