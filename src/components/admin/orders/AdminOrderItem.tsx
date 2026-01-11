import { CartItem, Diameter } from "@/types";
import { PenTool, Edit2, Scroll, Star, AlertCircle, AlertTriangle, X } from "lucide-react";
import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import ImagePreviewGallery from "@/components/ui/ImagePreviewGallery";
import { theme } from "@/styles/theme";

interface AdminOrderItemProps {
  item: CartItem;
  diameters?: Diameter[];
  flavorMap: Record<string, string>;
  onEdit?: (item: CartItem) => void;
  referenceImages?: string[];
}

export const AdminOrderItem = ({
  item,
  flavorMap,
  diameters = [],
  onEdit,
  referenceImages = [],
}: AdminOrderItemProps) => {
  const getFlavorName = (id?: string) => {
    if (!id) return "Unknown Flavor";
    // If it looks like a MongoID (24 hex), rely on map. Else assume it's a name.
    if (id.length === 24 && /^[0-9a-fA-F]+$/.test(id)) {
         return flavorMap[id] || "Unknown Flavor";
    }
    return id; 
  };

  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);

  const getDiameterName = (id?: string) => {
    if (!id) return "";
    const d = diameters.find((dia) => dia._id === id);
    return d ? d.name : id; // Fallback to ID/String if not found
  };

  const isComboSet =
    item.selectedConfig && !!item.selectedConfig.cake;
  
  const isSimpleSet =
    item.selectedConfig &&
    !item.selectedConfig.cake &&
    (item.selectedConfig.items?.length || 0) > 0;

  const isCustom = item.productType === 'custom' || item.isCustom;
  const isStandard = !isComboSet && !isSimpleSet && !isCustom;

  // -- IMAGES SETUP --
  const allImages = [
    ...(item.imageUrl ? [{ src: item.imageUrl, isMain: true }] : []),
    ...(referenceImages || [])
      .filter((img) => img !== item.imageUrl)
      .map((img) => ({ src: img, isMain: false })),
  ];

  const renderGallery = () => {
    if (allImages.length === 0) {
        return (
            <div className="w-20 h-20 rounded-md bg-gray-100 border border-gray-200 flex items-center justify-center text-xs text-gray-400 mb-4">
                No Img
            </div>
        );
    }
    return (
       <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        {allImages.map((imgObj, idx) => (
             <div
                key={idx}
                className="relative aspect-square rounded-lg border border-gray-200 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity bg-gray-100 shadow-sm"
                onClick={() => setGalleryIndex(idx)}
             >
                <Image
                    src={imgObj.src}
                    alt={imgObj.isMain ? item.name : `Reference ${idx}`}
                    fill
                    className="object-cover"
                />
                {imgObj.isMain && (
                     <div className="absolute top-2 left-2 bg-accent text-white p-1 rounded-full shadow-md z-10">
                        <Star className="w-3 h-3 fill-white" />
                    </div>
                )}
             </div>
        ))}
       </div>
    );
  };

  // -- CUSTOM RENDERER --
  if (isCustom) {
      const displaySize = item.customSize || getDiameterName(item.diameterId || item.selectedConfig?.cake?.diameterId);
      const displayFlavor = item.customFlavor || getFlavorName(item.selectedConfig?.cake?.flavorId || item.flavor);

      return (
        <div className="group relative flex flex-col p-4 border-b last:border-0 hover:bg-purple-50/30 transition-colors border-l-4 border-l-purple-500 bg-white">
            {/* Top Gallery */}
            {renderGallery()}

            <div className="flex-grow flex flex-col gap-2">
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="text-lg font-bold text-primary leading-tight">
                                {item.name}
                            </h4>
                            <span className="bg-accent text-primary text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-accent">
                                Custom Order
                            </span>
                        </div>
                        
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-primary">
                             {displaySize && (
                                <span className="flex items-center gap-1">
                                    <span className="font-semibold text-primary">Size:</span> {displaySize}
                                </span>
                             )}
                             {displayFlavor && (
                                <span className="flex items-center gap-1">
                                    <span className="font-semibold text-primary">Flavor:</span> {displayFlavor}
                                </span>
                             )}
                        </div>
                        
                         <span className="text-sm text-gray-500 font-mono mt-1 block flex items-center gap-2">
                            ${item.price.toFixed(2)} x {item.quantity} = <span className="font-bold text-primary">${((item.rowTotal) || (item.price * item.quantity)).toFixed(2)}</span>
                            {item.isManualPrice && (
                                <span title="Manual Price Set" className="cursor-help text-primary">
                                    <AlertCircle className="w-4 h-4" />
                                </span>
                            )}
                         </span>
                    </div>

                    {onEdit && (
                        <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(item)}
                        className="transition-opacity  text-accent"
                        >
                        <Edit2 className="w-4 h-4" />
                        </Button>
                    )}
                </div>

                {/* Admin Notes Box */}
                {item.adminNotes && (
                    <div className="mt-2 bg-amber-50 border border-amber-200 rounded-md p-3 relative">
                        <h5 className="text-amber-800 text-xs font-bold uppercase tracking-wide mb-1 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Admin Notes
                        </h5>
                        <p className="text-amber-900 text-sm whitespace-pre-wrap">
                            {item.adminNotes}
                        </p>
                    </div>
                )}

                 {/* Inscription (if integrated into custom flow) */}
                 {item.inscription && (
                     <div className=" border-2 border-dashed border-accent text-gray-700 font-serif italic p-2 rounded shadow-sm flex gap-2 items-start max-w-md mt-1">
                        <PenTool className="w-4 h-4 mt-1 shrink-0 opacity-70" />
                        <span className="text-md leading-snug">
                            &ldquo;{item.inscription}&rdquo;
                        </span>
                    </div>
                )}
            </div>
            
            {/* Image Modal */}
            <ImagePreviewGallery 
                isOpen={galleryIndex !== null}
                onClose={() => setGalleryIndex(null)}
                images={allImages.map(img => img.src)}
                initialIndex={galleryIndex || 0}
            />
        </div>
      );
  }

  // -- STANDARD / SET RENDERER --
  return (
    <div className="group relative flex flex-col p-4 border-b last:border-0 hover:bg-slate-50 transition-colors">
      {/* Top Gallery */}
      {renderGallery()}

      
      <div className="flex-grow flex flex-col justify-center gap-1">
        

        
        {/* 5. Information Hierarchy (Name & Size) */}
        <div className="flex justify-between items-start">
          <div>
            <h4 className="text-lg font-bold text-primary leading-tight">
              {item.name}
            </h4>
            {/* Condition 3: Standard Size Display */}
            {isStandard && item.diameterId && (
              <span className="text-md font-medium text-primary block">
                {getDiameterName(item.diameterId.toString())}
              </span>
            )}
            {/* Set Size Display */}
            {(isComboSet || isSimpleSet) && item.selectedConfig?.quantityConfigId && (
              <span className="text-md font-medium text-primary block">
                {item.selectedConfig.quantityConfigId}
              </span>
            )}
             <span className="text-sm text-primary font-mono">
                 ${item.price.toFixed(2)} x {item.quantity} = ${((item.rowTotal) || (item.price * item.quantity)).toFixed(2)}
             </span>
          </div>
          
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(item)}
              className="transition-opacity hover:bg-gray-200 text-primary"
            >
              <Edit2 className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* --- 1. Visual Separation (Combo Layout) --- */}
        {isComboSet && item.selectedConfig?.cake && (
          <div className="mt-2 rounded-md border border-gray-200 overflow-hidden flex flex-col md:flex-row shadow-sm">
            {/* Panel A: Bento Zone */}
            <div 
              className="border-l-4 p-3 md:w-1/2 flex flex-col gap-2"
              style={{ 
                  backgroundColor: `${theme.colors.text}0d`, // 5% opacity
                  borderColor: `${theme.colors.text}33` // 20% opacity 
              }}
            >
              <div 
                className="flex items-center gap-2 font-bold text-xs uppercase tracking-wide"
                style={{ color: theme.colors.text }}
              >
                <span>🎂 Bento Component</span>
              </div>
              
              <div className="text-sm font-medium text-gray-800">
                 Flavor: <span className="font-bold">{getFlavorName(item.selectedConfig.cake.flavorId)}</span>
              </div>

              {/* 2. High-Visibility Inscriptions */}
              {item.selectedConfig.cake.inscription ? (
                <div className="bg-yellow-50 border-2 border-dashed border-yellow-200 text-yellow-900 font-serif italic p-2 rounded shadow-sm flex gap-2 items-start mt-1">
                  <PenTool className="w-4 h-4 mt-1 shrink-0 opacity-70" />
                  <span className="text-lg leading-snug">
                    &ldquo;{item.selectedConfig.cake.inscription}&rdquo;
                  </span>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 border-dashed p-2 rounded text-gray-400 italic text-sm flex gap-2 items-center">
                    <PenTool className="w-3 h-3" /> No Inscription
                </div>
              )}
            </div>

            {/* Panel B: Treats Zone */}
            <div className="bg-white p-3 md:w-1/2 border-t md:border-t-0 md:border-l border-gray-100">
               <div className="text-xs font-bold text-gray-500 uppercase mb-2">Treats Breakdown</div>
               {/* 3. Detailed Flavor Breakdown */}
               <div className="flex flex-wrap gap-2">
                  {item.selectedConfig.items?.map((flavorItem, idx) => (
                    <span key={idx} className="inline-flex items-center gap-2 bg-gray-100 px-2 py-1 rounded text-sm border border-gray-200">
                        <span className="font-bold text-gray-900 text-md">[{flavorItem.count}]</span>
                        <span className="text-gray-700">{getFlavorName(flavorItem.flavorId)}</span>
                    </span>
                  ))}
               </div>
            </div>
          </div>
        )}

        {/* --- Condition 2: Simple Set --- */}
        {isSimpleSet && (
             <div className="mt-2">
               {/* Flavor List */}
               <div className="text-xs font-bold text-gray-500 uppercase mb-1">Assorted Flavors</div>
               <div className="flex flex-wrap gap-2">
                  {item.selectedConfig?.items?.map((flavorItem, idx) => (
                    <span key={idx} className="inline-flex items-center gap-2 bg-gray-100 px-2 py-1 rounded text-sm border border-gray-200">
                        <span className="font-bold text-gray-900 text-md">[{flavorItem.count}]</span>
                        <span className="text-gray-700">{getFlavorName(flavorItem.flavorId)}</span>
                    </span>
                  ))}
               </div>
               {/* Global Inscription if any (usually Sets don't, but just in case) */}
                {item.inscription && (
                    <div className="mt-2 bg-yellow-50 border-2 border-dashed border-yellow-200 text-yellow-900 font-serif italic p-2 rounded shadow-sm flex gap-2 items-start">
                        <Scroll className="w-4 h-4 mt-1 shrink-0 opacity-70" />
                        <span className="text-lg leading-snug">
                            &ldquo;{item.inscription}&rdquo;
                        </span>
                    </div>
                )}
             </div>
        )}

        {/* --- Condition 3: Standard Cake --- */}
        {isStandard && (
            <div className="mt-1 flex flex-col gap-2">
                <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-800 border">
                        {/* If it's standard, item.flavor is usually the string name, but let's check */}
                        {item.flavor || "Standard Flavor"}
                    </span>
                </div>
                
                {/* Standard Inscription */}
                {item.inscription ? (
                     <div className="bg-yellow-50 border-2 border-dashed border-yellow-200 text-yellow-900 font-serif italic p-2 rounded shadow-sm flex gap-2 items-start max-w-md">
                        <PenTool className="w-4 h-4 mt-1 shrink-0 opacity-70" />
                        <span className="text-lg leading-snug">
                            &ldquo;{item.inscription}&rdquo;
                        </span>
                    </div>
                ) : (
                     <div className="text-gray-400 text-sm italic flex items-center gap-1">
                        No Inscription
                     </div>
                )}
            </div>
        )}
      </div>

      <ImagePreviewGallery 
            isOpen={galleryIndex !== null}
            onClose={() => setGalleryIndex(null)}
            images={allImages.map(img => img.src)}
            initialIndex={galleryIndex || 0}
        />
    </div>
  );
};
