"use client";

import { AppSettings } from "@/types";
import { Switch } from "@/components/ui/Switch";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { useAlert } from "@/contexts/AlertContext";
import { cn } from "@/lib/utils";
import { ChevronDown, CreditCard, Loader2, MessageCircle, Store, Truck } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useForm, Controller, type FieldErrors } from "react-hook-form";
import { catalogFieldClass } from "@/components/admin/catalog/CatalogFormChrome";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

type SettingsSectionProps = {
  id: string;
  title: string;
  subtitle: string;
  icon: ReactNode;
  open: boolean;
  onToggle: () => void;
  pills: ReactNode;
  children: ReactNode;
};

function SettingsSection({
  id,
  title,
  subtitle,
  icon,
  open,
  onToggle,
  pills,
  children,
}: SettingsSectionProps) {
  const panelId = `${id}-panel`;
  const triggerId = `${id}-trigger`;

  return (
    <section className="rounded-2xl border border-primary/15 bg-background/20 shadow-sm backdrop-blur-md">
      <h2>
        <button
          type="button"
          id={triggerId}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex w-full min-h-11 items-start gap-3 rounded-2xl px-4 py-3 text-left transition-colors hover:bg-background/40 sm:items-center sm:px-5"
        >
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background/60 text-primary sm:mt-0">
            {icon}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-heading text-lg font-semibold tracking-tight text-primary text-balance">
              {title}
            </span>
            <span className="mt-0.5 block text-sm text-primary/60 text-pretty">
              {subtitle}
            </span>
            <span className="mt-2 flex flex-wrap gap-1.5">{pills}</span>
          </span>
          <ChevronDown
            className={cn(
              "mt-1 h-4 w-4 shrink-0 text-primary transition-transform motion-reduce:transition-none sm:mt-0",
              open && "rotate-180"
            )}
            aria-hidden
          />
        </button>
      </h2>
      <div
        id={panelId}
        role="region"
        aria-labelledby={triggerId}
        hidden={!open}
        className="px-4 pb-5 sm:px-5"
      >
        {children}
      </div>
    </section>
  );
}

function SummaryPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex max-w-full items-center rounded-full border border-primary/15 bg-background/70 px-2.5 py-0.5 text-xs font-medium text-primary">
      <span className="max-w-[14rem] truncate">{children}</span>
    </span>
  );
}

const settingsTextareaClass =
  "min-h-[120px] rounded-xl border-primary/15 bg-background/40";

function SwitchRow({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <Label
        htmlFor={id}
        className="flex min-h-11 w-full cursor-pointer flex-col justify-center rounded-xl border border-primary/10 bg-background/40 px-3 py-2 pr-16"
      >
        <span className="text-base font-semibold text-primary">{title}</span>
        <span className="text-sm font-normal text-primary/60">{description}</span>
      </Label>
      <div className="absolute right-3 top-1/2 -translate-y-1/2">{children}</div>
    </div>
  );
}

function feeLabel(value: number | null | undefined) {
  const amount = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return `$${amount.toFixed(2)}`;
}

const settingsSchema = z.object({
  _id: z.string(),
  store: z.object({
    isAcceptingOrders: z.boolean(),
    vacationMessage: z.string().optional(),
  }).optional(),
  checkout: z.object({
    isDeliveryEnabled: z.boolean(),
    disabledMessage: z.string().optional(),
    deliveryFee: z.number().optional().nullable(),
    minOrderForDelivery: z.number().optional().nullable(),
    deliveryInstructions: z.string().optional(),
    isPickupEnabled: z.boolean().optional(),
    pickupAddress: z.string().optional(),
    pickupInstructions: z.string().optional(),
  }),
  support: z.object({
    isLiveChatEnabled: z.boolean(),
    botGreetingMessage: z.string().optional(),
  }).optional(),
  eTransferEmail: z
    .string()
    .email("Please enter a valid email address")
    .optional()
    .or(z.literal(""))
    .nullable(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

/** Ensures cleared optional fields survive JSON.stringify (undefined is omitted). */
function buildSettingsPayload(data: SettingsFormValues) {
  return {
    ...data,
    checkout: {
      ...data.checkout,
      deliveryFee: data.checkout.deliveryFee ?? null,
      minOrderForDelivery: data.checkout.minOrderForDelivery ?? null,
    },
    eTransferEmail:
      data.eTransferEmail === "" || data.eTransferEmail === undefined
        ? null
        : data.eTransferEmail,
  };
}

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
      eTransferEmail: initialSettings.eTransferEmail ?? "",
    },
  });

  const { control, watch, handleSubmit, setFocus, formState: { isSubmitting, isDirty, errors } } = form;

  const isAcceptingOrders = watch("store.isAcceptingOrders");
  const isDeliveryEnabled = watch("checkout.isDeliveryEnabled");
  const deliveryFee = watch("checkout.deliveryFee");
  const isPickupEnabled = watch("checkout.isPickupEnabled");
  const isLiveChatEnabled = watch("support.isLiveChatEnabled");
  const eTransferEmail = watch("eTransferEmail");
  const [openSections, setOpenSections] = useState({
    bakery: true,
    logistics: false,
    support: false,
    payment: false,
  });

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections((current) => ({ ...current, [key]: !current[key] }));
  };

  const emailSummary = (eTransferEmail ?? "").trim();

  const onInvalid = (formErrors: FieldErrors<SettingsFormValues>) => {
    if (!formErrors.eTransferEmail) return;
    setOpenSections((current) => ({ ...current, payment: true }));
    // The email field is inside a closed panel; focus it after that panel is shown.
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setFocus("eTransferEmail"));
    });
  };

  const onSubmit = async (data: SettingsFormValues) => {
    try {
      const payload = buildSettingsPayload(data);

      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-4">
      <SettingsSection
        id="bakery-status"
        title="Bakery Status"
        subtitle="Your operating mode and messaging."
        icon={<Store className="h-4 w-4 shrink-0" aria-hidden />}
        open={openSections.bakery}
        onToggle={() => toggleSection("bakery")}
        pills={
          <SummaryPill>
            {isAcceptingOrders ? "Accepting orders" : "Paused"}
          </SummaryPill>
        }
      >
        <div className="space-y-6">
          <SwitchRow
            id="accept-orders-toggle"
            title="Accept New Orders"
            description="Turn off to temporarily stop accepting orders."
          >
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
          </SwitchRow>

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
                    placeholder="e.g. We are currently closed for the holidays…"
                    className={settingsTextareaClass}
                  />
                )}
              />
            </div>
          )}
        </div>
      </SettingsSection>

      <SettingsSection
        id="logistics"
        title="Logistics & Delivery"
        subtitle="Configure delivery fees, pickup addresses, and order limits."
        icon={<Truck className="h-4 w-4 shrink-0" aria-hidden />}
        open={openSections.logistics}
        onToggle={() => toggleSection("logistics")}
        pills={
          <>
            <SummaryPill>
              {isDeliveryEnabled
                ? `Delivery on · ${feeLabel(deliveryFee)}`
                : "Delivery off"}
            </SummaryPill>
            <SummaryPill>
              {isPickupEnabled !== false ? "Pickup on" : "Pickup off"}
            </SummaryPill>
          </>
        }
      >
        <div className="space-y-8">
          {/* Delivery Configuration */}
          <div className="space-y-6">
            <SwitchRow
              id="delivery-toggle"
              title="Enable Delivery"
              description="Allow customers to choose local delivery."
            >
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
            </SwitchRow>

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
                      onChange={(e) =>
                        onChange(
                          e.target.value === ""
                            ? null
                            : parseFloat(e.target.value)
                        )
                      }
                      value={rest.value ?? ""}
                      className={catalogFieldClass}
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
                      onChange={(e) =>
                        onChange(
                          e.target.value === ""
                            ? null
                            : parseFloat(e.target.value)
                        )
                      }
                      value={rest.value ?? ""}
                      className={catalogFieldClass}
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
                    <Input id="disabled-message" {...field} value={field.value ?? ""} placeholder="e.g. Delivery is currently disabled" className={catalogFieldClass} />
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
                      placeholder="e.g. Please leave deliveries at the front desk…" 
                      className={settingsTextareaClass}
                    />
                  )}
                />
              </div>
            </div>
          </div>

          {/* Pickup Configuration */}
          <div className="space-y-6 pt-2">
            <SwitchRow
              id="pickup-toggle"
              title="Enable Pickup"
              description="Allow customers to collect their orders from your location."
            >
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
            </SwitchRow>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pickup-address">Pickup Address</Label>
                <Controller
                  control={control}
                  name="checkout.pickupAddress"
                  render={({ field }) => (
                    <Input id="pickup-address" {...field} value={field.value ?? ""} placeholder="Enter full pickup address" className={catalogFieldClass} />
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
                      className={settingsTextareaClass}
                    />
                  )}
                />
              </div>
            </div>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        id="support-chat"
        title="Support Chat"
        subtitle="Configure customer support touchpoints."
        icon={<MessageCircle className="h-4 w-4 shrink-0" aria-hidden />}
        open={openSections.support}
        onToggle={() => toggleSection("support")}
        pills={
          <SummaryPill>{isLiveChatEnabled ? "Chat on" : "Chat off"}</SummaryPill>
        }
      >
        <div className="space-y-6">
          <SwitchRow
            id="live-chat-toggle"
            title="Enable Live Chat"
            description="Toggle the visual assistant chat widget on the frontend."
          >
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
          </SwitchRow>

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
                  placeholder="e.g. Priwiet! Ya virtualnyi pomichnik…"
                  className={settingsTextareaClass}
                />
              )}
            />
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        id="payment-settings"
        title="Payment Settings"
        subtitle="Configure payment instructions shown to customers on custom order confirmations."
        icon={<CreditCard className="h-4 w-4 shrink-0" aria-hidden />}
        open={openSections.payment}
        onToggle={() => toggleSection("payment")}
        pills={
          <SummaryPill>
            {emailSummary || "No e-transfer email"}
          </SummaryPill>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="e-transfer-email">E-transfer Email</Label>
            <p className="text-sm text-muted-foreground">
              Customers who choose e-transfer will be instructed to send payment to this address.
            </p>
            <Controller
              control={control}
              name="eTransferEmail"
              render={({ field }) => (
                <Input
                  id="e-transfer-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  spellCheck={false}
                  {...field}
                  value={field.value ?? ""}
                  placeholder="payments@yourdomain.com"
                  className={catalogFieldClass}
                  aria-invalid={errors.eTransferEmail ? true : undefined}
                  aria-describedby={
                    errors.eTransferEmail ? "e-transfer-email-error" : undefined
                  }
                />
              )}
            />
            {errors.eTransferEmail?.message ? (
              <p id="e-transfer-email-error" role="alert" className="text-sm text-error">
                {errors.eTransferEmail.message}
              </p>
            ) : null}
          </div>
        </div>
      </SettingsSection>

      <div className="mt-6 flex border-t border-primary/15 pt-4">
        <Button
          type="submit"
          disabled={isSubmitting || !isDirty}
          className="h-11 w-full rounded-xl sm:ml-auto sm:h-10 sm:w-auto"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" aria-hidden />
              Saving Changes…
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </form>
  );
}
