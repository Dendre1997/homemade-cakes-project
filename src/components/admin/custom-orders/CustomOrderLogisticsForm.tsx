"use client";

import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import CustomDatePicker from "@/components/ui/CustomDatePicker";
import { Calendar, Clock, Truck, TrendingUp } from "lucide-react";

interface CustomOrderLogisticsFormProps {
  order: any;
  onChange: (field: string, value: any) => void;
}

export const CustomOrderLogisticsForm = ({ 
  order, 
  onChange 
}: CustomOrderLogisticsFormProps) => {
  return (
    <div className="bg-card-background p-lg rounded-large shadow-md space-y-md border border-border/40">
       <h2 className="font-heading text-h4 text-primary border-b border-border/40 pb-4 flex items-center gap-2">
          Status & Logistics
       </h2>
       
       <div className="space-y-sm pt-2">
          <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
             <TrendingUp className="w-3.5 h-3.5 text-primary" /> Request Status
          </Label>
          <Select 
             value={order.status} 
             onValueChange={(val) => onChange("status", val)}
          >
             <SelectTrigger className="h-11">
                <SelectValue placeholder="Set Status" />
             </SelectTrigger>
             <SelectContent>
                <SelectItem value="pending_review">Pending Review</SelectItem>
                <SelectItem value="negotiating">Negotiating</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
             </SelectContent>
          </Select>
       </div>

       <div className="space-y-sm">
          <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
             <Calendar className="w-3.5 h-3.5 text-primary" /> Preferred Date
          </Label>
          <CustomDatePicker 
             selected={order.date ? new Date(order.date) : undefined}
             onSelect={(date?: Date) => onChange("date", date)}
          />
       </div>

       <div className="space-y-sm">
          <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
             <Clock className="w-3.5 h-3.5 text-primary" /> Time Slot
          </Label>
          <Input 
             value={order.timeSlot || ""} 
             onChange={(e) => onChange("timeSlot", e.target.value)}
             className="h-11"
             placeholder="e.g. 10:00 AM - 12:00 PM"
          />
       </div>

       <div className="space-y-sm">
          <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
             <Truck className="w-3.5 h-3.5 text-primary" /> Delivery Method
          </Label>
          <Select 
             value={order.deliveryMethod || "pickup"} 
             onValueChange={(val) => onChange("deliveryMethod", val)}
          >
             <SelectTrigger className="h-11">
                <SelectValue placeholder="Select Method" />
             </SelectTrigger>
             <SelectContent>
                <SelectItem value="pickup">Pickup</SelectItem>
                <SelectItem value="delivery">Delivery</SelectItem>
             </SelectContent>
          </Select>
       </div>

       <div className="space-y-sm pt-4">
          <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Admin Internal Notes</Label>
          <Textarea 
             rows={4}
             value={order.adminNotes || ""} 
             onChange={(e) => onChange("adminNotes", e.target.value)}
             placeholder="Internal notes for staff only..."
             className="resize-none italic bg-muted/5 font-sans"
          />
       </div>
    </div>
  );
};
