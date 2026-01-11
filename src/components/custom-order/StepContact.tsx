"use client";

import { useFormContext, Controller } from "react-hook-form";
import { Label } from "@/components/ui/Label";
import { Input } from "@/components/ui/Input";
import { Phone, Mail, MessageCircle } from "lucide-react";

export default function StepContact() {
  const { register, control, formState: { errors, touchedFields } } = useFormContext();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="customerName">Full Name</Label>
          <Input
            id="customerName"
            {...register("customerName")}
            placeholder="Jane Doe"
          />
          {errors.customerName && touchedFields.customerName && (
            <p className="text-error text-sm">{errors.customerName.message as string}</p>
          )}
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="customerPhone">Phone Number</Label>
          <Input
            id="customerPhone"
            {...register("customerPhone")}
            placeholder="(+1)*******"
          />
          {errors.customerPhone && touchedFields.customerPhone && (
            <p className="text-error text-sm">{errors.customerPhone.message as string}</p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="customerEmail">Email Address</Label>
          <Input
            id="customerEmail"
            type="email"
            {...register("customerEmail")}
            placeholder="jane@example.com"
          />
          {errors.customerEmail && touchedFields.customerEmail && (
            <p className="text-error text-sm">{errors.customerEmail.message as string}</p>
          )}
        </div>
      </div>

      {/* Communication Preferences */}
      <div className="space-y-4 pt-4 border-t">
        <Label className="text-base font-semibold">Preferred Contact Method</Label>
        <Controller
          control={control}
          name="communicationMethod"
          render={({ field }) => (
            <div className="grid grid-cols-3 gap-4">
              {[
                { value: "phone", label: "Phone Call", icon: Phone },
                { value: "email", label: "Email", icon: Mail },
                { value: "WhatsApp", label: "WhatsApp", icon: MessageCircle },
              ].map((option) => (
                <div
                  key={option.value}
                  onClick={() => field.onChange(option.value)}
                  className={`
                    cursor-pointer flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all
                    ${field.value === option.value 
                        ? "border-primary bg-primary/5 text-primary" 
                        : "border-border hover:border-primary/30 text-gray-500 hover:text-primary"}
                  `}
                >
                  <option.icon className={`w-6 h-6 mb-2 ${field.value === option.value ? "text-primary" : "opacity-50"}`} />
                  <span className="text-sm font-medium">{option.label}</span>
                </div>
              ))}
            </div>
          )}
        />
        {errors.communicationMethod && touchedFields.communicationMethod && (
            <p className="text-error text-sm">{errors.communicationMethod.message as string}</p>
        )}
      </div>
    </div>
  );
}
