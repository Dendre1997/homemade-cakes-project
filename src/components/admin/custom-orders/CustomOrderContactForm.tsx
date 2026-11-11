"use client";

import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/Select";
import { Mail, Phone, User } from "lucide-react";
import { SocialHandleAnchor } from "@/components/ui/SocialHandleAnchor";
import { DashboardGlassCard } from "@/components/admin/dashboard/DashboardGlassCard";

interface CustomOrderContactFormProps {
  contact: any;
  onChange: (field: string, value: any) => void;
}

const fieldClass = "h-11 rounded-xl sm:h-10";
const labelClass = "mb-1.5 flex items-center gap-1.5 text-xs font-medium text-primary/55";

export const CustomOrderContactForm = ({
  contact,
  onChange
}: CustomOrderContactFormProps) => {
  const phone = String(contact.phone || "").trim();
  const email = String(contact.email || "").trim();

  return (
    <DashboardGlassCard className="space-y-4">
      <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-primary">
        <User className="h-4 w-4 text-primary/70" aria-hidden />
        Customer
      </h2>

      <div>
        <Label className={labelClass}>Full name</Label>
        <Input
          value={contact.name || ""}
          onChange={(e) => onChange("contact", { ...contact, name: e.target.value })}
          className={fieldClass}
          autoComplete="name"
          placeholder="Customer name"
        />
      </div>

      <div>
        <Label className={labelClass}>
          <Phone className="h-3.5 w-3.5" aria-hidden /> Phone
        </Label>
        <div className="flex min-w-0 items-center gap-2">
          <Input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={contact.phone || ""}
            onChange={(e) => onChange("contact", { ...contact, phone: e.target.value })}
            className={`${fieldClass} min-w-0`}
            placeholder="403-555-0100"
          />
          {phone ? (
            <a
              href={`tel:${phone}`}
              aria-label="Call customer"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/15 text-primary hover:bg-background/60 sm:h-10 sm:w-10"
            >
              <Phone className="h-4 w-4" aria-hidden />
            </a>
          ) : null}
        </div>
      </div>

      <div>
        <Label className={labelClass}>
          <Mail className="h-3.5 w-3.5" aria-hidden /> Email
        </Label>
        <div className="flex min-w-0 items-center gap-2">
          <Input
            type="email"
            inputMode="email"
            autoComplete="email"
            spellCheck={false}
            value={contact.email || ""}
            onChange={(e) => onChange("contact", { ...contact, email: e.target.value })}
            className={`${fieldClass} min-w-0`}
            placeholder="name@email.com"
          />
          {email ? (
            <a
              href={`mailto:${email}`}
              aria-label="Email customer"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/15 text-primary hover:bg-background/60 sm:h-10 sm:w-10"
            >
              <Mail className="h-4 w-4" aria-hidden />
            </a>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="min-w-0">
          <Label className={labelClass}>Social</Label>
          <Select
            value={contact.socialPlatform || "instagram"}
            onValueChange={(val) => onChange("contact", { ...contact, socialPlatform: val })}
          >
            <SelectTrigger className={fieldClass}>
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="facebook">Facebook</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-0">
          <Label className={labelClass}>Handle</Label>
          <Input
            value={contact.socialNickname || ""}
            onChange={(e) => onChange("contact", { ...contact, socialNickname: e.target.value })}
            className={fieldClass}
            autoComplete="off"
            placeholder="delicious_cakes"
          />
        </div>
      </div>

      {contact.socialNickname?.trim() &&
        (contact.socialPlatform === "instagram" ||
          contact.socialPlatform === "facebook") && (
          <div className="min-w-0 rounded-xl border border-primary/10 bg-background/40 px-3 py-2 text-sm">
            <span className="text-[10px] font-bold uppercase tracking-wide text-primary/45">
              Open profile
            </span>
            <div className="mt-1 min-w-0">
              <SocialHandleAnchor
                platform={contact.socialPlatform}
                nickname={contact.socialNickname}
                showPlatform
                className="break-all font-semibold text-primary hover:underline"
              />
            </div>
          </div>
        )}
    </DashboardGlassCard>
  );
};
