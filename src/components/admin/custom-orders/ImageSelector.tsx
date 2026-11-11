"use client";

import { useMemo } from "react";
import { Star, Trash2, Circle, Plus, Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";

interface ImageSelectorProps {
  images: string[];
  selectedImage?: string;
  onSelect: (url: string) => void;
  onRemove: (url: string) => void;
  onUpload: () => void; // Trigger parent's upload logic
}

export default function ImageSelector({
  images,
  selectedImage,
  onSelect,
  onRemove,
  onUpload,
}: ImageSelectorProps) {
  
  // Ensure selectedImage is valid or fallback to first? 
  // Parent logic handles fallback, this just renders state.

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex w-full items-center justify-between">
         <Button 
           variant="secondary"
           onClick={onUpload}
           type="button"
           className="flex h-11 items-center gap-1 rounded-xl text-sm sm:h-10"
         >
           <Plus className="h-4 w-4 shrink-0" /> Add Image
         </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {images.map((url, idx) => {
          const isSelected = selectedImage === url;
          return (
            <div
              key={idx}
              className={`
                group relative aspect-square cursor-pointer overflow-hidden rounded-xl border-2 transition-[border-color,box-shadow]
                ${isSelected ? "border-primary ring-2 ring-primary" : "border-gray-200 hover:border-gray-400"}
              `}
              onClick={() => onSelect(url)}
            >
              {/* Image */}
              <div className="absolute inset-0 bg-gray-100">
                  <Image
                     src={url}
                     alt={`Reference ${idx + 1}`}
                     fill
                     quality={90}
                     className="object-cover"
                  />
              </div>

              {/* Overlay / Controls */}
              <div className="absolute inset-0  group-hover:bg-black/10 transition-colors flex flex-col justify-between p-2">
                 {/* Star */}
                 <div className="self-end">
                    <Circle 
                      className={`w-6 h-6 transition-transform active:scale-95 ${isSelected ? "fill-accent text-accent" : "fill-transparent text-accent opacity-50 hover:opacity-100"}`} 
                    />
                 </div>
                 
                 {/* Trash (Only visible on hover) */}
                 <div className="self-start">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemove(url);
                        }}
                        aria-label="Remove image"
                        className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/90 text-red-500 shadow-sm transition-colors hover:bg-red-50 hover:text-red-700 sm:h-10 sm:w-10"
                        title="Remove Image"
                    >
                        <Trash2 className="h-4 w-4 shrink-0 fill-accent text-accent" />
                    </button>
                 </div>
              </div>
            </div>
          );
        })}

        {/* Empty State placeholder if needed, or if grid is empty */}
        {images.length === 0 && (
            <div className="col-span-3 py-8 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                <span className="text-xs">No images uploaded</span>
            </div>
        )}
      </div>
    </div>
  );
}
