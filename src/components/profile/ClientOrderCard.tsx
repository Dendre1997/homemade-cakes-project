"use client";

import { Order, OrderStatus, Diameter } from "@/types";
import { formatOrderItemDescription } from "@/lib/utils";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { 
  Package, 
  ChefHat, 
  CheckCircle2, 
  Truck, 
  MapPin, 
  Calendar,
  AlertCircle,
  CalendarClock,
  Timer
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import Image from "next/image";

// Import Cake Size Icons
import { EightInchCakeIcon } from "@/components/icons/cake-sizes/EightInchCakeIcon";
import { FiveInchBentoIcon } from "@/components/icons/cake-sizes/FiveInchBentoIcon";
import { FourInchBentoIcon } from "@/components/icons/cake-sizes/FourInchBentoIcon";
import { SevenInchCakeIcon } from "@/components/icons/cake-sizes/SevenInchCakeIcon";
import { SixInchCakeIcon } from "@/components/icons/cake-sizes/SixInchCakeIcon";

const SIZE_ICONS: Record<string, React.FC<any>> = {
  "EightInchCakeIcon": EightInchCakeIcon,
  "FiveInchBentoIcon": FiveInchBentoIcon,
  "FourInchBentoIcon": FourInchBentoIcon,
  "SevenInchCakeIcon": SevenInchCakeIcon,
  "SixInchCakeIcon": SixInchCakeIcon,
};

interface ClientOrderCardProps {
  order: Order;
  diameters?: Diameter[]; // Optional to avoid breaking if parent not updated immediately, but we updated parent.
}

const steps = [
  { id: "placed", label: "Placed", icon: Package, statuses: [OrderStatus.NEW, OrderStatus.PAID, OrderStatus.PENDING_CONFIRMATION] },
  { id: "baking", label: "Baking", icon: ChefHat, statuses: [OrderStatus.IN_PROGRESS] },
  { id: "ready", label: "Ready", icon: CheckCircle2, statuses: [OrderStatus.READY] },
  { id: "enjoy", label: "Enjoy", icon: Truck, statuses: [OrderStatus.DELIVERED] },
];

export default function ClientOrderCard({ order, diameters = [] }: ClientOrderCardProps) {
  const isCancelled = order.status === OrderStatus.CANCELLED;

  const getCurrentStepIndex = () => {
    if (steps[3].statuses.includes(order.status)) return 3;
    if (steps[2].statuses.includes(order.status)) return 2;
    if (steps[1].statuses.includes(order.status)) return 1;
    return 0; // Default to placed
  };

  const currentStep = getCurrentStepIndex();

  const deliveryDate = order.deliveryInfo.deliveryDates?.[0];
  const dateObj = deliveryDate ? new Date(deliveryDate.date) : null;
  const dateString = dateObj ? format(dateObj, "EEEE, MMMM do") : "Date Pending";
  const timeString = deliveryDate?.timeSlot || "Time Pending";

  const isDelivery = order.deliveryInfo.method === 'delivery';

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-subtleBackground/50 pb-4 ">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
           <div>
              <div className="flex items-center gap-2">
                 <h3 className="font-heading text-lg font-bold text-primary">
                    Order #{order._id.toString().slice(-6).toUpperCase()}
                 </h3>
                 {isCancelled && <Badge variant="destructive">Cancelled</Badge>}
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                 <Calendar className="w-3 h-3" />
                 Ordered on: {format(new Date(order.createdAt), "PPP")}
              </p>
           </div>
           {!isCancelled && (
              <Badge variant="outline" className="capitalize">
                 Status: {order.status.replace("_", " ")}
              </Badge>
           )}
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        
        {!isCancelled && (
            <div className="bg-subtleBackground/50 rounded-lg p-4 border border-blue-100 flex items-start gap-3">
                <div className="bg-white p-2 rounded-full border border-blue-100 text-blue-600">
                    <CalendarClock className="w-5 h-5 text-primary" />
                </div>
                <div>
                    <h4 className="font-bold text-primary text-sm uppercase tracking-wide mb-1">
                        {isDelivery ? "Scheduled Delivery" : "Scheduled Pickup"}
                    </h4>
                    <p className="font-heading text-lg font-semibold text-primary leading-none">
                        {dateString}
                    </p>
                    <div className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground">
                        <Timer className="w-4 h-4" />
                        <span>Between {timeString}</span>
                    </div>
                </div>
            </div>
        )}

        {!isCancelled ? (
          <div className="relative px-2 pt-2">
             <div className="absolute top-4 left-0 w-full h-1 bg-gray-100 rounded-full" />
             <div 
               className="absolute top-4 left-0 h-1 bg-accent transition-all duration-500 rounded-full"
               style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }} 
             />
             <div className="relative flex justify-between">
                {steps.map((step, index) => {
                   const isActive = index <= currentStep;
                   const isCurrent = index === currentStep;
                   return (
                     <div key={step.id} className="flex flex-col items-center">
                        <div 
                          className={cn(
                             "w-8 h-8 rounded-full flex items-center justify-center z-10 border-2 transition-colors duration-300",
                             isActive 
                               ? "bg-accent border-accent text-white" 
                               : "bg-white border-gray-200 text-gray-400"
                          )}
                        >
                           <step.icon className="w-4 h-4" />
                        </div>
                        <span 
                          className={cn(
                             "text-xs mt-2 font-medium transition-colors duration-300",
                             isActive ? "text-primary" : "text-gray-400",
                             isCurrent && "font-bold"
                          )}
                        >
                           {step.label}
                        </span>
                     </div>
                   );
                })}
             </div>
          </div>
        ) : (
           <div className="p-4 bg-red-50 text-red-700 rounded-md flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm font-medium">This order has been cancelled.</p>
           </div>
        )}

        <div>
           <div className="flex items-center gap-2 mb-4 pb-2 border-b border-dashed">
               <Package className="w-4 h-4 text-primary" />
               <h4 className="text-sm font-bold text-primary uppercase tracking-wider">Order Summary</h4>
           </div>
           
           <div className="space-y-4">
               {order.items.map((item, idx) => {
                  
                  // Resolve Diameter/Size
                  let sizeName = item.customSize;
                  let SizeIcon = null;

                  if (item.diameterId && diameters.length > 0) {
                      const diameter = diameters.find(d => d._id === item.diameterId);
                      if (diameter) {
                          sizeName = diameter.name;
                          // Look up icon
                          if (diameter.illustration && SIZE_ICONS[diameter.illustration]) {
                              SizeIcon = SIZE_ICONS[diameter.illustration];
                          }
                      }
                  }

                  return (
                    <div key={idx} className="flex gap-4 p-3 bg-subtleBackground/20 rounded-lg border border-transparent hover:border-gray-200 transition-colors">
                        <div className="flex-1 flex flex-col justify-between">
                            <div>
                                <div className="flex items-start gap-2">
                                    <span className="font-bold text-primary text-base">
                                        <span className="text-accent">{item.quantity}x</span> {item.name}
                                    </span>
                                </div>
                                
                                <div className="mt-2 text-sm text-muted-foreground space-y-1">
                                    {/* Size with Icon */}
                                    {sizeName ? (
                                        <div className="flex items-center gap-2 text-primary font-medium">
                                            {SizeIcon ? (
                                                <div className="w-6 h-6 text-primary">
                                                    <SizeIcon className="w-full h-full" />
                                                </div>
                                            ) : (
                                                <div className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
                                            )}
                                            <span>Size: {sizeName}</span>
                                        </div>
                                    ) : null}
                                    
                                    <p className="leading-relaxed pl-3 border-l-2 border-primary">
                                        {formatOrderItemDescription(item).replace(item.name, "").replace(/^\s*-\s*/, "").trim() || "Standard Configuration"}
                                    </p>
                                    
                                    {item.inscription && (
                                        <div className="mt-2 text-xs bg-yellow-50 text-yellow-800 p-1.5 rounded inline-block">
                                            <span className="block font-medium">Inscription: "{item.inscription}"</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <p className="mt-3 font-bold text-primary text-sm">
                                ${(item.price * item.quantity).toFixed(2)}
                            </p>
                        </div>

                         <div className="flex-shrink-0">
                            <div className="relative w-20 h-20 rounded-md overflow-hidden bg-gray-100 border border-gray-200">
                                {item.imageUrl ? (
                                    <Image 
                                        src={item.imageUrl} 
                                        alt={item.name}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50">
                                        <Package className="w-8 h-8" />
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                  );
               })}
           </div>
        </div>
      </CardContent>

      <CardFooter className="bg-subtleBackground/30 border-t p-4 flex justify-between items-center">
         <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {order.deliveryInfo.method === 'delivery' ? (
                <>
                   <Truck className="w-4 h-4" /> 
                   <span className="font-medium">Delivery to {order.deliveryInfo.address?.split(',')[0]}</span>
                </>
            ) : (
                <>
                   <MapPin className="w-4 h-4" />
                   <span className="font-medium">Store Pickup</span>
                </>
            )}
         </div>
         <div className="text-right">
            <span className="text-xs text-muted-foreground mr-2 uppercase tracking-wide font-bold">Total</span>
            <span className="text-xl font-heading font-bold text-primary">${order.totalAmount.toFixed(2)}</span>
         </div>
      </CardFooter>
    </Card>
  );
}
