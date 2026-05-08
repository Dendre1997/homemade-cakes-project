const fs = require('fs');
const file = 'src/app/bakery-manufacturing-orders/gallery/page.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('import { AddonSelector }')) {
    content = content.replace('import { ChipCheckbox } from "@/components/ui/ChipCheckbox";', 'import { ChipCheckbox } from "@/components/ui/ChipCheckbox";\nimport { AddonSelector } from "@/components/shared/AddonSelector";');
}

content = content.replace('decorationPrice: 0,\r\n    isActive: true,\r\n  };', 'decorationPrice: 0,\r\n    isActive: true,\r\n    defaultAddons: [],\r\n  };');
content = content.replace('decorationPrice: 0,\n    isActive: true,\n  };', 'decorationPrice: 0,\n    isActive: true,\n    defaultAddons: [],\n  };');

const addonJsx = 
                <div className="pt-4 border-t mt-4">
                   <AddonSelector 
                     categoryId={editingItem?.categories}
                     selectedAddons={editingItem?.defaultAddons?.map(da => ({ addonId: da.addonId, variantId: da.variantId, name: "", variantName: "", price: 0 })) || []}
                     onChange={(newaddons) => {
                         setEditingItem(prev => ({ 
                             ...prev!, 
                             defaultAddons: newaddons.map(na => ({ addonId: na.addonId, variantId: na.variantId || "" })) 
                         }));
                     }}
                   />
                </div>
;

content = content.replace('<div className="pt-6 flex items-center gap-3">', addonJsx + '\n                <div className="pt-6 flex items-center gap-3">');

fs.writeFileSync(file, content);
console.log('Done Gallery Update');
