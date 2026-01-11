"use client";

import React from "react";
import { Order, OrderStatus } from "@/types";
import { OrderCard } from "@/components/admin/orders/OrderCard";
import { useAlert } from "@/contexts/AlertContext";

interface ProductionQueueProps {
  orders: Order[];
}

export default function ProductionQueue({ orders }: ProductionQueueProps) {
  
  const { showAlert } = useAlert();
  const [localOrders, setLocalOrders] = React.useState<Order[]>(orders);

  React.useEffect(() => {
      setLocalOrders(orders);
  }, [orders]);

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
      // Optimistic Update
      const previousOrders = [...localOrders];
      
      const activeProductionStatuses = [
          OrderStatus.NEW, 
          OrderStatus.PAID, 
          OrderStatus.IN_PROGRESS, 
          OrderStatus.READY
      ];
      
      const shouldKeep = activeProductionStatuses.includes(newStatus);

      if (shouldKeep) {
          setLocalOrders(prev => prev.map(o => o._id.toString() === orderId ? { ...o, status: newStatus } : o));
      } else {
          setLocalOrders(prev => prev.filter(o => o._id.toString() !== orderId));
      }

      try {
           const res = await fetch(`/api/admin/orders/${orderId}/status`, {
               method: "PATCH",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({ status: newStatus })
           });

           if (!res.ok) throw new Error("Failed to update status");
           showAlert("Order status updated", "success");
      } catch (e) {
          console.error(e);
          showAlert("Failed to update status", "error");
          setLocalOrders(previousOrders); // Revert
      }
  };

  if (localOrders.length === 0) {
      return (
        <div className="bg-white p-8 rounded-lg border border-dashed border-gray-300 text-center text-muted-foreground">
            <p>Kitchen quiet for now.</p>
        </div>
      );
  }

  return (
    <div className="space-y-4">
      {localOrders.map((order) => (
        <OrderCard 
            key={order._id.toString()} 
            order={order} 
            onStatusChange={handleStatusChange} 
        />
      ))}
    </div>
  );
}
