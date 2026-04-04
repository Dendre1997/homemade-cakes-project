"use client";

import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/Select";
import { User, Phone, Mail, Globe, Instagram, Facebook } from "lucide-react";

interface CustomOrderContactFormProps {
  contact: any;
  onChange: (field: string, value: any) => void;
}

export const CustomOrderContactForm = ({ 
  contact, 
  onChange 
}: CustomOrderContactFormProps) => {
  return (
    <div className="bg-card-background p-lg rounded-large shadow-md space-y-md border border-border/40">
       <h2 className="font-heading text-h4 text-primary border-b border-border/40 pb-4 flex items-center gap-2">
          Customer Information
       </h2>
       
       <div className="space-y-sm pt-2">
          <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
             <User className="w-3.5 h-3.5 text-primary" /> Full Name
          </Label>
          <Input 
             value={contact.name || ""} 
             onChange={(e) => onChange("contact", { ...contact, name: e.target.value })}
             className="h-11"
             placeholder="Customer Name"
          />
       </div>

       <div className="space-y-sm">
          <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
             <Phone className="w-3.5 h-3.5 text-primary" /> Phone Number
          </Label>
          <Input 
             value={contact.phone || ""} 
             onChange={(e) => onChange("contact", { ...contact, phone: e.target.value })}
             className="h-11"
             placeholder="Phone Number"
          />
       </div>

       <div className="space-y-sm">
          <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
             <Mail className="w-3.5 h-3.5 text-primary" /> Email Address
          </Label>
          <Input 
             value={contact.email || ""} 
             onChange={(e) => onChange("contact", { ...contact, email: e.target.value })}
             className="h-11 outline-none"
             placeholder="Email Address"
          />
       </div>

       <div className="grid grid-cols-1 gap-md pt-2">
          <div className="space-y-sm">
             <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-primary" /> Social Platform
             </Label>
             <Select 
                value={contact.socialPlatform || "instagram"} 
                onValueChange={(val) => onChange("contact", { ...contact, socialPlatform: val })}
             >
                <SelectTrigger className="h-11">
                   {contact.socialPlatform === "instagram" ? (
                      <Instagram className="w-4 h-4 mr-2" />
                    ) : contact.socialPlatform === "facebook" ? (
                      <Facebook className="w-4 h-4 mr-2" />
                    ) : <Globe className="w-4 h-4 mr-2" />}
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
          
          <div className="space-y-sm">
             <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                @ Handle / Nickname
             </Label>
             <Input 
                value={contact.socialNickname || ""} 
                onChange={(e) => onChange("contact", { ...contact, socialNickname: e.target.value })}
                className="h-11"
                placeholder="e.g. delicious_cakes_2024"
             />
          </div>
       </div>
    </div>
  );
};
