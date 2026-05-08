const fs = require('fs');
const file = 'src/app/(client)/products/[slug]/page.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('Addon } from')) {
    content = content.replace('SelectedAddon } from "@/types";', 'SelectedAddon, Addon } from "@/types";');
}

if (!content.includes('const [allAddons')) {
    content = content.replace('const [allDiameters, setAllDiameters] = useState<any[]>([]);', 'const [allDiameters, setAllDiameters] = useState<any[]>([]);\n  const [allAddons, setAllAddons] = useState<Addon[]>([]);\n  const hasHydratedAddons = useRef(false);');
}

const oldFetch = \  // Fetch all diameters
  useEffect(() => {
     const fetchDiameters = async () => {
         try {
             const res = await fetch("/api/diameters");
             if(res.ok) {
                 const data = await res.json();
                 setAllDiameters(data);
             }
         } catch(e) {
             console.error("Failed to fetch diameters", e);
         }
     }
     fetchDiameters();
  }, [])\;

const newFetch = \  // Fetch all diameters and addons
  useEffect(() => {
     const fetchData = async () => {
         try {
             const [diamRes, addonsRes] = await Promise.all([
                 fetch("/api/diameters"),
                 fetch("/api/addons")
             ]);
             if(diamRes.ok) {
                 const data = await diamRes.json();
                 setAllDiameters(data);
             }
             if(addonsRes.ok) {
                 const data = await addonsRes.json();
                 setAllAddons(data);
             }
         } catch(e) {
             console.error("Failed to fetch reference data", e);
         }
     }
     fetchData();
  }, []);\;

content = content.replace(oldFetch, newFetch);

const hydrationEffect = \
  // Hydrate Addons
  useEffect(() => {
      if (product && allAddons.length > 0 && !hasHydratedAddons.current) {
          if (product.defaultAddons && product.defaultAddons.length > 0) {
              const hydrated = [];
              for (const da of product.defaultAddons) {
                  const addon = allAddons.find((a) => a._id === da.addonId);
                  if (addon) {
                      const variant = addon.variants.find((v) => v._id === da.variantId);
                      if (variant) {
                          hydrated.push({
                              addonId: addon._id,
                              variantId: variant._id,
                              name: addon.name,
                              variantName: variant.name,
                              price: variant.price,
                              imageUrl: variant.imageUrl || addon.imageUrl,
                          });
                      }
                  }
              }
              setSelectedAddons(hydrated);
          }
          hasHydratedAddons.current = true;
      }
  }, [product, allAddons]);
\;

if (!content.includes('// Hydrate Addons')) {
    content = content.replace('// --- Combo Set Helpers ---', hydrationEffect + '\n  // --- Combo Set Helpers ---');
}

content = content.replace('<AddonSelector \r\n                categoryId={product.categoryId}\r\n                selectedAddons={selectedAddons}\r\n                onChange={setSelectedAddons}\r\n              />', '<AddonSelector \r\n                categoryId={product.categoryId}\r\n                selectedAddons={selectedAddons}\r\n                onChange={setSelectedAddons}\r\n                availableAddons={allAddons}\r\n              />');
content = content.replace('<AddonSelector \n                categoryId={product.categoryId}\n                selectedAddons={selectedAddons}\n                onChange={setSelectedAddons}\n              />', '<AddonSelector \n                categoryId={product.categoryId}\n                selectedAddons={selectedAddons}\n                onChange={setSelectedAddons}\n                availableAddons={allAddons}\n              />');

fs.writeFileSync(file, content);
console.log('Product Page Hydrated');
