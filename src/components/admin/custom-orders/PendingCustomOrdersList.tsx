"use client";

import { CustomOrder } from "@/types";
import { CustomOrderCard } from "@/components/admin/custom-orders/CustomOrderCard";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/shadcn-carousel";

interface PendingCustomOrdersListProps {
  orders: CustomOrder[];
}

/** Receives the pending list once and renders both the mobile carousel and desktop grid from it. */
export function PendingCustomOrdersList({ orders }: PendingCustomOrdersListProps) {
  return (
    <>
      {/* Mobile Carousel (sm and below) */}
      <div className="block md:hidden">
        <Carousel className="w-full">
          <CarouselContent>
            {orders.map((order) => (
              <CarouselItem key={order._id} className="basis-[85%]">
                <CustomOrderCard order={order} />
              </CarouselItem>
            ))}
          </CarouselContent>
          <div className="flex justify-center gap-4 mt-6">
             <CarouselPrevious className="static translate-y-0" />
             <CarouselNext className="static translate-y-0" />
          </div>
        </Carousel>
      </div>

      {/* Desktop Grid (md and up) */}
      <div className="hidden md:grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {orders.map((order) => (
          <CustomOrderCard key={order._id} order={order} />
        ))}
      </div>
    </>
  );
}
