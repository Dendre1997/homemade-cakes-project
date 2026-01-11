"use client";

import { useState } from "react";
import { AppSettings } from "@/types";
import { Switch } from "@/components/ui/Switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { useAlert } from "@/contexts/AlertContext";
import { Loader2 } from "lucide-react";

interface SettingsFormProps {
  initialSettings: AppSettings;
}

export default function SettingsForm({ initialSettings }: SettingsFormProps) {
  const [isDeliveryEnabled, setIsDeliveryEnabled] = useState(
    initialSettings.checkout?.isDeliveryEnabled ?? true
  );
  const [isLoading, setIsLoading] = useState(false);
  const { showAlert } = useAlert();

  const handleToggle = async (checked: boolean) => {
    setIsDeliveryEnabled(checked); // Optimistic Update
    setIsLoading(true);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        // Preserve other settings if we had them, but for now just updating checkout object
        body: JSON.stringify({ 
           checkout: { 
             ...initialSettings.checkout,
             isDeliveryEnabled: checked 
           } 
        }),
      });

      if (!res.ok) throw new Error("Failed to save settings");
      
      showAlert("Settings updated successfully", "success");
    } catch (e) {
      console.error(e);
      setIsDeliveryEnabled(!checked); // Revert
      showAlert("Failed to update settings", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Checkout Settings</CardTitle>
        <CardDescription>
          Manage availability of delivery methods for customers.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <div className="space-y-0.5">
          <label
            htmlFor="delivery-toggle"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Enable Delivery Method
          </label>
          <p className="text-sm text-muted-foreground">
            {isDeliveryEnabled
              ? "Customers can choose Delivery or Pickup."
              : "Customers can ONLY choose Pickup. Delivery option is hidden."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          <Switch
            id="delivery-toggle"
            checked={isDeliveryEnabled}
            onCheckedChange={handleToggle}
            disabled={isLoading}
          />
        </div>
      </CardContent>
    </Card>
  );
}
