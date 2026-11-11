"use client";

import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import CustomDatePicker from "@/components/ui/CustomDatePicker";
import { DashboardGlassCard } from "@/components/admin/dashboard/DashboardGlassCard";
import { CalendarClock } from "lucide-react";

interface CustomOrderLogisticsFormProps {
  order: any;
  onChange: (field: string, value: any) => void;
}

const fieldClass = "h-11 rounded-xl sm:h-10";
const labelClass = "mb-1.5 block text-xs font-medium text-primary/55";

export const CustomOrderLogisticsForm = ({
  order,
  onChange
}: CustomOrderLogisticsFormProps) => {
  return (
    <DashboardGlassCard className="space-y-4">
      <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-primary">
        <CalendarClock className="h-4 w-4 text-primary/70" aria-hidden />
        Date & status
      </h2>

      <div>
        <Label className={labelClass}>Request status</Label>
        <Select
          value={order.status}
          onValueChange={(val) => onChange("status", val)}
        >
          <SelectTrigger className={fieldClass}>
            <SelectValue placeholder="Set status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending_review">Pending Review</SelectItem>
            <SelectItem value="negotiating">Negotiating</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className={labelClass}>Preferred date</Label>
        <CustomDatePicker
          selected={order.date ? new Date(order.date) : undefined}
          onSelect={(date?: Date) => onChange("date", date)}
        />
      </div>

      <div>
        <Label className={labelClass}>Time slot</Label>
        <Input
          value={order.timeSlot || ""}
          onChange={(e) => onChange("timeSlot", e.target.value)}
          className={fieldClass}
          placeholder="10:00 AM – 12:00 PM"
        />
      </div>

      <div>
        <Label className={labelClass}>Fulfillment</Label>
        <Select
          value={order.deliveryMethod || "pickup"}
          onValueChange={(val) => onChange("deliveryMethod", val)}
        >
          <SelectTrigger className={fieldClass}>
            <SelectValue placeholder="Select method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pickup">Pickup</SelectItem>
            <SelectItem value="delivery">Delivery</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className={labelClass}>Staff notes</Label>
        <Textarea
          rows={4}
          value={order.adminNotes || ""}
          onChange={(e) => onChange("adminNotes", e.target.value)}
          placeholder="Internal notes for staff only…"
          className="resize-none rounded-xl bg-background/40"
        />
      </div>
    </DashboardGlassCard>
  );
};
