"use client";

import { AppSettings } from "@/types";
import { Switch } from "@/components/ui/Switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { useAlert } from "@/contexts/AlertContext";
import { Loader2 } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const settingsSchema = z.object({
  _id: z.string(),
  store: z.object({
    isAcceptingOrders: z.boolean(),
    vacationMessage: z.string().optional(),
  }).optional(),
  checkout: z.object({
    isDeliveryEnabled: z.boolean(),
    disabledMessage: z.string().optional(),
    deliveryFee: z.number().optional(),
    minOrderForDelivery: z.number().optional(),
    deliveryInstructions: z.string().optional(),
    isPickupEnabled: z.boolean().optional(),
    pickupAddress: z.string().optional(),
    pickupInstructions: z.string().optional(),
  }),
  support: z.object({
    isLiveChatEnabled: z.boolean(),
    botGreetingMessage: z.string().optional(),
  }).optional(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

interface SettingsFormProps {
  initialSettings: AppSettings;
}

export default function SettingsForm({ initialSettings }: SettingsFormProps) {
  const { showAlert } = useAlert();

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      _id: initialSettings._id,
      store: {
        isAcceptingOrders: initialSettings.store?.isAcceptingOrders ?? true,
        vacationMessage: initialSettings.store?.vacationMessage ?? "",
      },
      checkout: {
        isDeliveryEnabled: initialSettings.checkout.isDeliveryEnabled,
        disabledMessage: initialSettings.checkout.disabledMessage ?? "",
        deliveryFee: initialSettings.checkout.deliveryFee ?? 0,
        minOrderForDelivery: initialSettings.checkout.minOrderForDelivery ?? 0,
        deliveryInstructions: initialSettings.checkout.deliveryInstructions ?? "",
        isPickupEnabled: initialSettings.checkout.isPickupEnabled ?? true,
        pickupAddress: initialSettings.checkout.pickupAddress ?? "",
        pickupInstructions: initialSettings.checkout.pickupInstructions ?? "",
      },
      support: {
        isLiveChatEnabled: initialSettings.support?.isLiveChatEnabled ?? true,
        botGreetingMessage: initialSettings.support?.botGreetingMessage ?? "",
      },
    },
  });

  const { control, watch, handleSubmit, formState: { isSubmitting, isDirty } } = form;

  const isAcceptingOrders = watch("store.isAcceptingOrders");

  const onSubmit = async (data: SettingsFormValues) => {
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Failed to save settings");
      
      form.reset(data);
      showAlert("Settings updated successfully", "success");
    } catch (e) {
      console.error(e);
      showAlert("Failed to update settings", "error");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 pb-32">
      {/* 1. Store Status */}
      <Card>
        <CardHeader>
          <CardTitle>Bakery Status</CardTitle>
          <CardDescription>Your operating mode and messaging.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="accept-orders-toggle" className="text-base font-semibold">
                Accept New Orders
              </Label>
              <p className="text-sm text-muted-foreground">
                Turn off to temporarily stop accepting orders.
              </p>
            </div>
            <Controller
              control={control}
              name="store.isAcceptingOrders"
              render={({ field }) => (
                <Switch
                  id="accept-orders-toggle"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>

          {!isAcceptingOrders && (
            <div className="space-y-2">
              <Label htmlFor="vacation-message" className="text-base font-semibold">Vacation Message</Label>
              <p className="text-sm text-muted-foreground pb-2">
                This message will be shown to customers when the store is not accepting orders.
              </p>
              <Controller
                control={control}
                name="store.vacationMessage"
                render={({ field }) => (
                  <Textarea
                    id="vacation-message"
                    {...field}
                    placeholder="e.g. We are currently closed for the holidays..."
                    className="min-h-[100px]"
                  />
                )}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Logistics & Delivery */}
      <Card>
        <CardHeader>
          <CardTitle>Logistics & Delivery</CardTitle>
          <CardDescription>Configure delivery fees, pickup addresses, and order limits.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Delivery Configuration */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="space-y-0.5">
                <Label htmlFor="delivery-toggle" className="text-base font-semibold">Enable Delivery</Label>
                <p className="text-sm text-muted-foreground">Allow customers to choose local delivery.</p>
              </div>
              <Controller
                control={control}
                name="checkout.isDeliveryEnabled"
                render={({ field }) => (
                  <Switch
                    id="delivery-toggle"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="delivery-fee">Delivery Fee ($)</Label>
                <Controller
                  control={control}
                  name="checkout.deliveryFee"
                  render={({ field: { onChange, ...rest } }) => (
                    <Input 
                      id="delivery-fee" 
                      type="number" 
                      step="0.01" 
                      {...rest} 
                      onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="min-order">Minimum Order for Delivery ($)</Label>
                <Controller
                  control={control}
                  name="checkout.minOrderForDelivery"
                  render={({ field: { onChange, ...rest } }) => (
                    <Input 
                      id="min-order" 
                      type="number" 
                      step="0.01" 
                      {...rest} 
                      onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  )}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="disabled-message">Message when Delivery is Unavailable</Label>
                <Controller
                  control={control}
                  name="checkout.disabledMessage"
                  render={({ field }) => (
                    <Input id="disabled-message" {...field} value={field.value ?? ""} placeholder="e.g. Delivery is currently disabled" />
                  )}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="delivery-instructions">Delivery Instructions</Label>
                <Controller
                  control={control}
                  name="checkout.deliveryInstructions"
                  render={({ field }) => (
                    <Textarea 
                      id="delivery-instructions" 
                      {...field} 
                      value={field.value ?? ""} 
                      placeholder="e.g. Please leave deliveries at the front desk..." 
                      className="min-h-[100px]"
                    />
                  )}
                />
              </div>
            </div>
          </div>

          {/* Pickup Configuration */}
          <div className="space-y-6 pt-2">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="space-y-0.5">
                <Label htmlFor="pickup-toggle" className="text-base font-semibold">Enable Pickup</Label>
                <p className="text-sm text-muted-foreground">Allow customers to collect their orders from your location.</p>
              </div>
              <Controller
                control={control}
                name="checkout.isPickupEnabled"
                render={({ field }) => (
                  <Switch
                    id="pickup-toggle"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pickup-address">Pickup Address</Label>
                <Controller
                  control={control}
                  name="checkout.pickupAddress"
                  render={({ field }) => (
                    <Input id="pickup-address" {...field} value={field.value ?? ""} placeholder="Enter full pickup address" />
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pickup-instructions">Pickup Instructions</Label>
                <Controller
                  control={control}
                  name="checkout.pickupInstructions"
                  render={({ field }) => (
                    <Textarea 
                      id="pickup-instructions" 
                      {...field} 
                      value={field.value ?? ""}
                      placeholder="e.g. Ring the doorbell and have your order number ready."
                      className="min-h-[100px]"
                    />
                  )}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Support Chat */}
      <Card>
        <CardHeader>
          <CardTitle>Support Chat</CardTitle>
          <CardDescription>Configure customer support touchpoints.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div className="space-y-0.5">
              <Label htmlFor="live-chat-toggle" className="text-base font-semibold">Enable Live Chat</Label>
              <p className="text-sm text-muted-foreground">Toggle the visual assistant chat widget on the frontend.</p>
            </div>
            <Controller
              control={control}
              name="support.isLiveChatEnabled"
              render={({ field }) => (
                <Switch
                  id="live-chat-toggle"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bot-greeting">Bot Greeting Message</Label>
            <Controller
              control={control}
              name="support.botGreetingMessage"
              render={({ field }) => (
                <Textarea 
                  id="bot-greeting" 
                  {...field} 
                  value={field.value ?? ""}
                  placeholder="e.g. Priwiet! Ya virtualnyi pomichnik..."
                  className="min-h-[100px]"
                />
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Fixed Bottom Action Panel */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-md border-t z-30">
        <div className="max-w-4xl mx-auto flex justify-end">
          <Button type="submit" size="lg" disabled={isSubmitting || !isDirty}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving Changes...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
