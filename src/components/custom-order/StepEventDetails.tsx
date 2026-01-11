"use client";

import { useFormContext, Controller } from "react-hook-form";
import CustomDatePicker from "@/components/ui/CustomDatePicker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Label } from "@/components/ui/Label";
import { Card, CardContent } from "@/components/ui/Card";

export default function StepEventDetails() {
  const { control, formState: { errors } } = useFormContext();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Event Date (Left Column on Desktop) */}
        <div className="space-y-2">
          <Label className="text-base font-semibold">Event Date</Label>
          <Controller
            control={control}
            name="eventDate"
            render={({ field }) => (
              <CustomDatePicker
                selected={field.value}
                onSelect={(date) => field.onChange(date)}
                leadTimeDays={3} // Assumption: 3 days lead time
              />
            )}
          />
          {errors.eventDate && (
            <p className="text-error text-sm">{errors.eventDate.message as string}</p>
          )}
        </div>

        {/* Details (Right Column on Desktop) */}
        <div className="space-y-6">
           {/* Event Type */}
           <div className="space-y-2">
            <Label htmlFor="eventType" className="text-base font-semibold">Event Type</Label>
            <Controller
              control={control}
              name="eventType"
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger id="eventType" className="w-full h-12">
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Birthday">Birthday</SelectItem>
                    <SelectItem value="Wedding">Wedding</SelectItem>
                    <SelectItem value="Corporate">Corporate</SelectItem>
                    <SelectItem value="Anniversary">Anniversary</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.eventType && (
              <p className="text-error text-sm">{errors.eventType.message as string}</p>
            )}
          </div>

          {/* Serving Size */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Serving Size</Label>
            <Controller
              control={control}
              name="servingSize"
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-3">
                  {["10-20", "20-40", "40-60", "60+"].map((size) => (
                    <div
                      key={size}
                      onClick={() => field.onChange(size)}
                      className={`
                        cursor-pointer border-2 rounded-lg p-3 text-center transition-all hover:border-primary/50
                        ${field.value === size ? "border-primary bg-primary/5 font-bold text-primary" : "border-border bg-white text-gray-600"}
                      `}
                    >
                      {size} Guests
                    </div>
                  ))}
                </div>
              )}
            />
            {errors.servingSize && (
              <p className="text-error text-sm">{errors.servingSize.message as string}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
