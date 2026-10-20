"use client";

import { useState } from "react";
import { Order } from "@/types";
import { SocialHandleAnchor } from "@/components/ui/SocialHandleAnchor";
import { Button } from "@/components/ui/Button";
import {
  Pencil,
  X,
  Check,
  Loader2,
  User,
  Mail,
  Phone,
  Truck,
  MapPin,
  ExternalLink,
  AtSign,
} from "lucide-react";
import { useAlert } from "@/contexts/AlertContext";
import { CustomerPhoneActionSheet } from "@/components/admin/orders/CustomerPhoneActionSheet";
import { buildGoogleMapsSearchUrl } from "@/lib/messages/customerContactLinks";
import { cn } from "@/lib/utils";

interface OrderDetailCustomerProps {
  customerInfo: Order["customerInfo"];
  deliveryInfo: Order["deliveryInfo"];
  orderId: string;
  onUpdate: () => void;
}

const inputCls =
  "w-full rounded-md border border-border bg-white px-3 py-1.5 text-sm text-primary " +
  "placeholder:text-primary/30 focus:outline-none focus:ring-2 focus:ring-accent/50 transition";

const labelCls =
  "block text-xs font-semibold uppercase tracking-wide text-primary/40 mb-1";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[10px] font-bold uppercase tracking-wide text-primary/45">
      {children}
    </h3>
  );
}

function ContactRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 py-2">
      <div
        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/8 text-primary/70"
        aria-hidden
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-primary/45">
          {label}
        </p>
        <div className="mt-0.5 text-sm text-primary">{children}</div>
      </div>
    </div>
  );
}

const OrderDetailCustomer = ({
  customerInfo,
  deliveryInfo,
  orderId,
  onUpdate,
}: OrderDetailCustomerProps) => {
  const { showAlert } = useAlert();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [draft, setDraft] = useState({
    name: customerInfo.name ?? "",
    email: customerInfo.email ?? "",
    phone: customerInfo.phone ?? "",
    socialNickname: customerInfo.socialNickname ?? "",
    socialPlatform: (customerInfo.socialPlatform ?? "") as
      | "instagram"
      | "facebook"
      | "",
  });

  const resetDraft = () =>
    setDraft({
      name: customerInfo.name ?? "",
      email: customerInfo.email ?? "",
      phone: customerInfo.phone ?? "",
      socialNickname: customerInfo.socialNickname ?? "",
      socialPlatform: (customerInfo.socialPlatform ?? "") as
        | "instagram"
        | "facebook"
        | "",
    });

  const handleCancel = () => {
    resetDraft();
    setIsEditing(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerInfo: draft }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to save");
      }
      showAlert("Customer info updated!", "success");
      setIsEditing(false);
      onUpdate();
    } catch (e) {
      showAlert(
        e instanceof Error ? e.message : "Something went wrong",
        "error"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const hasSocial =
    !!customerInfo.socialPlatform &&
    !!(customerInfo.socialNickname || "").trim();

  const mapsUrl = buildGoogleMapsSearchUrl(deliveryInfo.address);
  const email = customerInfo.email?.trim();

  return (
    <div className="space-y-4 rounded-2xl border border-primary/15 bg-background/20 p-4 shadow-sm backdrop-blur-xl backdrop-saturate-150 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-heading text-lg font-semibold text-primary">
          Customer
        </h2>
        {!isEditing ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="shrink-0 text-accent hover:bg-accent/10 gap-1.5"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        ) : (
          <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={isSaving}
              className="gap-1 text-primary/50 hover:bg-primary/5"
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="gap-1.5"
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              {isSaving ? "Saving…" : "Save"}
            </Button>
          </div>
        )}
      </div>

      {!isEditing && (
        <>
          <div className="space-y-1 border-b border-primary/10 pb-3">
            <SectionTitle>Contact</SectionTitle>
            <ContactRow icon={<User className="h-4 w-4" />} label="Name">
              {customerInfo.name?.trim() || "—"}
            </ContactRow>
            <ContactRow icon={<Mail className="h-4 w-4" />} label="Email">
              {email ? (
                <a
                  href={`mailto:${email}`}
                  className="break-all font-medium text-accent underline-offset-2 hover:underline"
                >
                  {email}
                </a>
              ) : (
                "—"
              )}
            </ContactRow>
            <ContactRow icon={<Phone className="h-4 w-4" />} label="Phone">
              {customerInfo.phone?.trim() ? (
                <CustomerPhoneActionSheet phone={customerInfo.phone} />
              ) : (
                "—"
              )}
            </ContactRow>
            {hasSocial && (
              <ContactRow icon={<AtSign className="h-4 w-4" />} label="Social">
                <SocialHandleAnchor
                  platform={customerInfo.socialPlatform}
                  nickname={customerInfo.socialNickname}
                  showPlatform
                  className="font-medium text-accent hover:underline break-all"
                />
              </ContactRow>
            )}
          </div>

          <div className="space-y-1">
            <SectionTitle>Pickup & delivery</SectionTitle>
            <ContactRow icon={<Truck className="h-4 w-4" />} label="Method">
              <span className="capitalize">{deliveryInfo.method}</span>
            </ContactRow>
            {deliveryInfo.address?.trim() && (
              <ContactRow icon={<MapPin className="h-4 w-4" />} label="Address">
                <p className="break-words">{deliveryInfo.address}</p>
                {mapsUrl && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
                    )}
                  >
                    Open in Maps
                    <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                )}
              </ContactRow>
            )}
          </div>
        </>
      )}

      {isEditing && (
        <div className="space-y-4 border-t border-primary/10 pt-4">
          <div>
            <label className={labelCls} htmlFor="edit-customer-name">
              Full Name
            </label>
            <input
              id="edit-customer-name"
              type="text"
              className={inputCls}
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="Full name"
            />
          </div>

          <div>
            <label className={labelCls} htmlFor="edit-customer-email">
              Email
            </label>
            <input
              id="edit-customer-email"
              type="email"
              className={inputCls}
              value={draft.email}
              onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
              placeholder="email@example.com"
            />
          </div>

          <div>
            <label className={labelCls} htmlFor="edit-customer-phone">
              Phone
            </label>
            <input
              id="edit-customer-phone"
              type="tel"
              className={inputCls}
              value={draft.phone}
              onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
              placeholder="+1 (555) 000-0000"
            />
          </div>

          <div>
            <label className={labelCls} htmlFor="edit-customer-platform">
              Social Platform
            </label>
            <select
              id="edit-customer-platform"
              className={inputCls}
              value={draft.socialPlatform}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  socialPlatform: e.target.value as "instagram" | "facebook" | "",
                }))
              }
            >
              <option value="">— None —</option>
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
            </select>
          </div>

          {draft.socialPlatform && (
            <div>
              <label className={labelCls} htmlFor="edit-customer-nickname">
                {draft.socialPlatform === "instagram"
                  ? "Instagram"
                  : "Facebook"}{" "}
                Handle
              </label>
              <input
                id="edit-customer-nickname"
                type="text"
                className={inputCls}
                value={draft.socialNickname}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, socialNickname: e.target.value }))
                }
                placeholder={
                  draft.socialPlatform === "facebook"
                    ? "vanity-name, full URL, or people/Name/123"
                    : "@handle"
                }
              />
              <p className="mt-1 text-[11px] leading-relaxed text-primary/30">
                {draft.socialPlatform === "facebook"
                  ? "Accepts: vanity slug, full facebook.com URL, people/Name/ID path, or numeric ID."
                  : "Enter the handle with or without @."}
              </p>
            </div>
          )}

          <div className="border-t border-border/30 pt-2">
            <p className="text-xs text-primary/40">
              <strong className="text-primary/60">Delivery method:</strong>{" "}
              <span className="capitalize">{deliveryInfo.method}</span>
              {deliveryInfo.address && ` — ${deliveryInfo.address}`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetailCustomer;
