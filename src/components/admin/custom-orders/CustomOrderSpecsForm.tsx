"use client";

import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Label } from "@/components/ui/Label";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/Select";
import { AlertTriangle, Image as ImageIcon, Trash2, Plus, Loader2 } from "lucide-react";
import Image from "next/image";
import { useRef } from "react";

interface CustomOrderSpecsFormProps {
  order: any;
  onChange: (field: string, value: any) => void;
  onImageUpload: (files: FileList) => Promise<void>;
  isUploading: boolean;
}

export const CustomOrderSpecsForm = ({ 
  order, 
  onChange, 
  onImageUpload,
  isUploading
}: CustomOrderSpecsFormProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleRemoveImage = (index: number) => {
    const newImages = [...(order.referenceImages || [])];
    newImages.splice(index, 1);
    onChange("referenceImages", newImages);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onImageUpload(e.target.files);
    }
  };

  return (
    <div className="bg-card-background p-lg rounded-large shadow-md space-y-lg border border-border/40">
       <h2 className="font-heading text-h4 text-primary border-b border-border/40 pb-4 flex items-center gap-2">
          Product Details
       </h2>
       
       <div className="grid grid-cols-1 md:grid-cols-2 gap-md pt-2">
          <div className="space-y-sm">
             <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Category</Label>
             <Select 
                value={order.category} 
                onValueChange={(val) => onChange("category", val)}
             >
                <SelectTrigger className="h-11">
                   <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                   <SelectItem value="Cake">Cake</SelectItem>
                   <SelectItem value="Bento">Bento</SelectItem>
                   <SelectItem value="Cupcakes">Cupcakes</SelectItem>
                   <SelectItem value="Macarons">Macarons</SelectItem>
                </SelectContent>
             </Select>
          </div>
          
          <div className="space-y-sm">
             <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Price Estimate ($)</Label>
             <Input 
                type="number" 
                value={order.approximatePrice ?? ""} 
                onChange={(e) => onChange("approximatePrice", e.target.value === "" ? null : Number(e.target.value))}
                className="h-11 font-mono font-bold"
                placeholder="0.00"
             />
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
          <div className="space-y-sm">
             <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Size / Configuration</Label>
             <Input 
                value={order.details?.size || ""} 
                onChange={(e) => onChange("details", { ...order.details, size: e.target.value })}
                className="h-11"
                placeholder="e.g. 8 inch, Box of 12"
             />
          </div>
          <div className="space-y-sm">
             <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Flavor Profile</Label>
             <Input 
                value={order.details?.flavor || ""} 
                onChange={(e) => onChange("details", { ...order.details, flavor: e.target.value })}
                className="h-11"
                placeholder="e.g. Vanilla, Chocolate"
             />
          </div>
       </div>

       <div className="space-y-sm">
          <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Text on Cake</Label>
          <Input 
             value={order.details?.textOnCake || ""} 
             onChange={(e) => onChange("details", { ...order.details, textOnCake: e.target.value })}
             className="h-11"
             placeholder="Optional inscription..."
          />
       </div>

       <div className="space-y-sm">
          <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Design Notes / Description</Label>
          <Textarea 
             rows={4}
             value={order.details?.designNotes || ""} 
             onChange={(e) => onChange("details", { ...order.details, designNotes: e.target.value })}
             placeholder="Detailed design requests for the baker..."
             className="resize-none"
          />
       </div>

       <div className="space-y-sm">
          <Label className="flex items-center gap-2 text-error text-xs font-bold uppercase tracking-widest">
             <AlertTriangle className="w-4 h-4" /> Allergies
          </Label>
          <Input 
             value={order.allergies || ""} 
             onChange={(e) => onChange("allergies", e.target.value)}
             className="h-11 border-error/20 focus:ring-error/20 bg-error/5"
             placeholder="List any allergies..."
          />
       </div>

       <div className="space-y-sm pt-4">
          <Label className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-muted-foreground">
             <span className="flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Reference Images</span>
             <span className="text-[10px] lowercase font-normal italic">{(order.referenceImages?.length || 0)} uploaded</span>
          </Label>
          <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-3 xl:grid-cols-4 gap-3 pt-2">
             {order.referenceImages?.map((url: string, idx: number) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-border group shadow-sm">
                   <Image src={url} alt="Reference" fill className="object-cover" />
                   <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button 
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="bg-error text-white p-2 rounded-full hover:scale-110 transition-transform shadow-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                   </div>
                </div>
             ))}
             <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5 hover:text-primary transition-all text-muted-foreground bg-subtleBackground group"
             >
                {isUploading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                ) : (
                  <>
                    <Plus className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Add Image</span>
                  </>
                )}
             </button>
          </div>
          <input 
            type="file" 
            ref={fileInputRef}
            className="hidden" 
            multiple 
            accept="image/*"
            onChange={handleFileChange}
          />
       </div>
    </div>
  );
};
