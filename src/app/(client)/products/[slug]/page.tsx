"use client";

import { useEffect, useState, useRef } from "react";
import { notFound, useParams, useRouter } from "next/navigation";
import { ProductWithCategory, Flavor, AvailableDiameterConfig, Discount } from "@/types";
import Link from "next/link";
import { useCartStore } from "@/lib/store/cartStore";
import { useAlert } from "@/contexts/AlertContext";
import { cn, isValidObjectId } from "../../../../lib/utils";
import QuantityStepper from "@/components/ui/QuantityStepper";
import FlavorSelector from "@/components/ui/FlavorSelector";
import QuantitySelector from "@/components/ui/QuantitySelector";

import LoadingSpinner from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { FourInchBentoIcon } from "@/components/icons/cake-sizes/FourInchBentoIcon";
import { FiveInchBentoIcon } from "@/components/icons/cake-sizes/FiveInchBentoIcon";
import { SixInchCakeIcon } from "@/components/icons/cake-sizes/SixInchCakeIcon";
import { SevenInchCakeIcon } from "@/components/icons/cake-sizes/SevenInchCakeIcon";
import { EightInchCakeIcon } from "@/components/icons/cake-sizes/EightInchCakeIcon";
import DiameterSelector, {
  DiameterOption,
} from "@/components/ui/DiameterSelector";
import { Input } from "@/components/ui/Input";
import { FlavorCarousel } from "@/components/(client)/home/flavors/FlavorCarousel";
import ImageCarousel from "@/components/ui/ImageCarousel";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { Switch } from "@/components/ui/Switch";
import { Label } from "@/components/ui/Label";

// Translator Page Pattern
const SingleProductPage = () => {
    const params = useParams();
    const slug = params.slug as string;
    const router = useRouter(); 
    
    // fetch the product by SLUG (or ID via Hybrid API)
    const [product, setProduct] = useState<ProductWithCategory | null>(null);
    const [isFetching, setIsFetching] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);

    useEffect(() => {
        if (!slug) return;
        
        setIsFetching(true);
        fetch(`/api/products/${slug}`)
            .then(res => {
                if (res.status === 404) return null;
                return res.json();
            })
            .then(data => {
                if (!data) {
                    setFetchError("Product not found");
                } else {
                    setProduct(data);
                    
                    // SEO Redirect Logic
                    // If navigated via ID (slug is an ID) BUT the product has a real slug, redirect!
                    if (isValidObjectId(slug) && data.slug && data.slug !== slug) {
                         router.replace(`/products/${data.slug}`);
                    }
                }
            })
            .catch(err => setFetchError(err.message))
            .finally(() => setIsFetching(false));
    }, [slug, router]);

    if (isFetching) return (
      <div className="flex h-screen items-center justify-center bg-background">
        <LoadingSpinner />
      </div>
    );

    if (fetchError || !product) {
        if (fetchError === "Product not found") notFound();
        return <div className="text-center py-xl text-error">Error: {fetchError}</div>;
  }
  
    return <SingleProductContent product={product} />;
};


const SingleProductContent = ({ product }: { product: ProductWithCategory }) => {
  const { showAlert } = useAlert();
  const topRef = useRef<HTMLDivElement>(null);
  



  const [selectedFlavorId, setSelectedFlavorId] = useState<string | null>(null);
  const [selectedDiameterConfig, setSelectedDiameterConfig] = useState<AvailableDiameterConfig | null>(null);
  
  // Sets & Combo State
  const [selectedQtyConfigId, setSelectedQtyConfigId] = useState<string | null>(null);
  const [selectedSetFlavorIds, setSelectedSetFlavorIds] = useState<string[]>([]); // CHANGED: Array of IDs
  const [comboSelection, setComboSelection] = useState({
    flavorId: "",
    diameterId: "",
  });

  // Accordion State for Combo Sets
  const [activeAccordion, setActiveAccordion] = useState<string | null>('set-flavors'); 
  
  const [allDiameters, setAllDiameters] = useState<any[]>([]); 
  const [relatedFlavors, setRelatedFlavors] = useState<Flavor[]>([]); 

  const toggleAccordion = (id: string) => {
    setActiveAccordion(prev => (prev === id ? null : id));
  };

  const addItem = useCartStore((state) => state.addItem);

  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState("description");
  const [inscription, setInscription] = useState("");
  const [showInscriptionInput, setShowInscriptionInput] = useState(false);
  const openMiniCart = useCartStore((state) => state.openMiniCart);

  const [discounts, setDiscounts] = useState<Discount[]>([]);

  // Fetch Discounts
  useEffect(() => {
    const fetchDiscounts = async () => {
      try {
        const res = await fetch("/api/discounts/active");
        if (res.ok) {
          const data = await res.json();
          setDiscounts(data);
        }
      } catch (err) {
        console.error("Failed to fetch discounts", err);
      }
    };
    fetchDiscounts();
  }, []);

  // Fetch all diameters
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
  }, [])

  // Initial Logic when product loads/changes
  useEffect(() => {
      if (product) {
          // Initializations
          if ((product.availableDiameterConfigs?.length ?? 0) > 0) {
            setSelectedDiameterConfig(product.availableDiameterConfigs[0]);
          }
          
          // Initialize Set Quantity Logic
          if (product.productType === 'set' && product.availableQuantityConfigs && product.availableQuantityConfigs.length > 0) {
             const firstConfig = product.availableQuantityConfigs[0];
             setSelectedQtyConfigId(firstConfig._id || firstConfig.label);
          }
          
          // Fetch related flavors
          if (product.categoryId) {
             fetch(`/api/flavors?categoryId=${product.categoryId}`)
               .then(res => res.json())
               .then(data => {
                  if (Array.isArray(data)) {
                      setRelatedFlavors(data);
                  }
               })
               .catch(err => console.error("Failed to fetch related flavors", err));
          }
      }
  }, [product]);

  const getIllustrationForSize = (sizeValue: number) => {
    if (sizeValue <= 4) return FourInchBentoIcon;
    if (sizeValue === 5) return FiveInchBentoIcon;
    if (sizeValue === 6) return SixInchCakeIcon
    if (sizeValue === 7) return SevenInchCakeIcon;
    if (sizeValue >= 8) return EightInchCakeIcon;
    return FourInchBentoIcon;
  };

  const displayableDiameters: DiameterOption[] =
    product?.availableDiameterConfigs
      .map((config) => {
        const details = product.availableDiameters.find(
          (d) => d._id.toString() === config.diameterId
        );
        if (!details) return null;
        return {
          id: details?._id || "",
          name: details?.name || "Unknown",
          servings: `Approx. ${details?.sizeValue || 0} servings`,
          illustration: getIllustrationForSize(details?.sizeValue || 0),
        };
      })
      .filter((d): d is DiameterOption => d !== null) || [];

  // --- Combo Set Helpers ---
  const isSet = product?.productType === 'set';
  const isCombo = isSet && product?.comboConfig?.hasCake;

  // Filtered lists for the Combo Cake part
  const comboCakeFlavors = product?.availableFlavors
      .filter(f => !product.comboConfig?.cakeFlavorIds?.length || product.comboConfig.cakeFlavorIds.includes(f._id)) || [];

  const comboCakeDiameters: DiameterOption[] = allDiameters
      .filter(d => !product?.comboConfig?.cakeDiameterIds?.length || product?.comboConfig.cakeDiameterIds.includes(d._id))
      .map(details => {
           return {
              id: details._id,
              name: details.name,
              servings: `Approx. ${details.sizeValue} servings`,
              illustration: getIllustrationForSize(details.sizeValue),
           };
      });

  // Effect: Auto-select diameter if there's only one (Rule: 4-inch is forced)
  useEffect(() => {
     if (isCombo && comboCakeDiameters.length > 0 && !comboSelection.diameterId) {
         setComboSelection(prev => ({...prev, diameterId: comboCakeDiameters[0].id}));
     }
  }, [isCombo, comboCakeDiameters, comboSelection.diameterId]);


  // Selected Quantity Config for Sets
  const selectedQtyConfig = isSet 
    ? product?.availableQuantityConfigs?.find(c => (c._id || c.label) === selectedQtyConfigId)
    : null;
    
  // --- Calculate Prices ---
  let calculatedPrice = 0;
  
  if (product) {
     if (isSet && selectedQtyConfig) {
        // Set Price Logic
        if (isCombo) {
             const firstBoxPrice = product.availableQuantityConfigs?.[0]?.price || 0;
             const cakeOnlyPrice = product.structureBasePrice - firstBoxPrice;
             // Final = Cake Only + Selected Box Price
             calculatedPrice = cakeOnlyPrice + selectedQtyConfig.price;
        } else {
             // Simple Set: Price is just the selected box
             calculatedPrice = selectedQtyConfig.price;
        }
        
        if (product.inscriptionSettings?.isAvailable && inscription.trim() !== "") {
           calculatedPrice += product.inscriptionSettings.price;
        }

        if (isCombo) {
           // Cake Flavor Price
           if (comboSelection.flavorId) {
              const cFlavor = product.availableFlavors.find(f => f._id === comboSelection.flavorId);
              if (cFlavor) calculatedPrice += cFlavor.price;
           }
        }
        
     } else {
        calculatedPrice = product.structureBasePrice;
        
        const selectedFlavor = product.availableFlavors.find(
          (f) => f._id.toString() === selectedFlavorId
        );
        if (selectedFlavor) calculatedPrice += selectedFlavor.price;
    
        if (product.inscriptionSettings?.isAvailable && inscription.trim() !== "") {
          calculatedPrice += product.inscriptionSettings.price;
        }  
        if (selectedDiameterConfig)
          calculatedPrice *= selectedDiameterConfig.multiplier;
     }
  }

  // --- Determine Best Discount ---
  let finalPrice = calculatedPrice;
  let appliedDiscountName: string | undefined;

  if (product && discounts.length > 0) {
    let bestSavings = 0;
    
    for (const discount of discounts) {
      let isMatch = false;
      const targetIds = discount.targetIds as string[];

      if (discount.targetType === "all") {
        isMatch = true;
      } else if (discount.targetType === "product") {
         isMatch = targetIds.includes(product._id);
      } else if (discount.targetType === "category") {
         isMatch = targetIds.includes(product.categoryId);
      } else if (discount.targetType === "collection") {
         isMatch = product.collectionIds?.some(id => targetIds.includes(id)) || false;
      } else if (discount.targetType === "seasonal") {
         isMatch = product.seasonalEventIds?.some(id => targetIds.includes(id)) || false;
      }

      if (isMatch) {
         let savings = 0;
         if (discount.type === "percentage") {
            savings = calculatedPrice * (discount.value / 100);
         } else {
            savings = discount.value;
         }
         
         if (savings > calculatedPrice) savings = calculatedPrice;

         if (savings > bestSavings) {
            bestSavings = savings;
            appliedDiscountName = discount.name;
         }
      }
    }
    
    if (bestSavings > 0) {
      finalPrice = calculatedPrice - bestSavings;
    }
  }

  const handleSelectDiameter = (diameterId: string) => {
    const config = product?.availableDiameterConfigs.find(
      (c) => c.diameterId === diameterId
    );
    setSelectedDiameterConfig(config || null);
  };
  

  
  const handleToggleSetFlavor = (id: string) => {
     setSelectedSetFlavorIds(prev => {
        if (prev.includes(id)) {
            return prev.filter(fid => fid !== id);
        }
        if (prev.length >= 3) return prev; // Max 3
        return [...prev, id];
     });
  };

  const handleAddToCart = () => {
    if (!product) return;

    if (isSet) {
        // --- SET VALIDATION ---
        if (selectedSetFlavorIds.length === 0) {
             showAlert("Please select at least 1 flavor.", "error");
             return;
        }

        if (!selectedQtyConfig) {
             showAlert("Please select a box size.", "error");
             return;
        }
        
        // Validate Combo Selection
        if (isCombo) {
            if (!comboSelection.flavorId || !comboSelection.diameterId) {
                showAlert("Please configure your cake options.", "error");
                return;
            }
        }

        if (showInscriptionInput && inscription.trim() === "") {
             showAlert('Please enter your text.', "error");
             return;
        }
        
        const items = selectedSetFlavorIds.map(id => ({ flavorId: id, count: 1 })); 
        
        const flavorNames = selectedSetFlavorIds
             .map(id => product.availableFlavors.find(f => f._id === id)?.name)
             .filter(Boolean)
             .join(", ");


        const cartItem = {
          id: `${product._id}-${selectedQtyConfigId}-${Date.now()}`, 
          productId: product._id.toString(),
          categoryId: product.category._id.toString(),
          name: product.name,
          price: finalPrice,
          quantity: quantity,
          imageUrl: product.imageUrls[0] || "/placeholder.png",
          inscription: inscription,
          originalPrice: appliedDiscountName ? calculatedPrice : undefined,
          discountName: appliedDiscountName,
          
          // SET SPECIFIC
          flavor: `Mix: ${flavorNames}`, 
          diameterId: isCombo ? comboSelection.diameterId : undefined,
          selectedConfig: {
             items,
             quantityConfigId: selectedQtyConfigId,
             ...(isCombo && {
                 cake: {
                     flavorId: comboSelection.flavorId,
                     diameterId: comboSelection.diameterId,
                     inscription 
                 }
             })
          }
        };
        
        addItem(cartItem);

    } else {
        // --- STANDARD CAKE VALIDATION ---
        if (!selectedFlavorId || !selectedDiameterConfig) {
          showAlert("Please select a flavor and size.", "error");
          return;
        }
        if (showInscriptionInput && inscription.trim() === "") {
          showAlert(
            'Please enter your Cake writing.',
            "error"
          );
          return;
        }
        const selectedFlavor = product.availableFlavors.find(
          (f) => f._id.toString() === selectedFlavorId
        );
        const cartItem = {
          id: `${product._id.toString()}-${selectedFlavorId}-${
            selectedDiameterConfig.diameterId
          }-${inscription}`,
          productId: product._id.toString(),
          categoryId: product.category._id.toString(),
          name: product.name,
          flavor: selectedFlavor?.name || "N/A",
          diameterId: selectedDiameterConfig.diameterId,
          price: finalPrice, // Discounted Price
          quantity: quantity,
          imageUrl: product.imageUrls[0] || "/placeholder.png",
          inscription: inscription,
          originalPrice: appliedDiscountName ? calculatedPrice : undefined,
          discountName: appliedDiscountName,
        };
        addItem(cartItem);
    }
    
    // Reset Logic
    setQuantity(1);
    if (!isSet) {
        setSelectedFlavorId(null);
        setSelectedDiameterConfig(product.availableDiameterConfigs[0] || null);
    } else {
        setSelectedSetFlavorIds([]);
        // Keep config selected
    }
    
    if (showInscriptionInput) {
      setInscription("");
      setShowInscriptionInput(false);
    }
    
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (document.scrollingElement) {
        document.scrollingElement.scrollTo({ top: 0, behavior: "smooth" });
      }
      
    }, 100);
    openMiniCart();
  };

  const tabs = [
    { id: "description", label: "Full Description" },
    { id: "ingredients", label: "Ingredients & Allergens" },
    { id: "delivery", label: "Delivery Terms" },
  ];

  return (
    <div className="bg-background" ref={topRef}>
      <div className="mx-auto max-w-7xl px-lg py-xl">
        <nav className="font-body text-small text-primary/80">
          <Link href="/" className="hover:text-accent">
            Home
          </Link>{" "}
          &gt;
          <Link href="/products" className="hover:text-accent">
            {" "}
            Catalog
          </Link>{" "}
          &gt;
          <span className="font-bold text-primary"> {product.name}</span>
        </nav>
        <h2 className="font-heading text-h2 text-primary pt-lg">
          {product.name}
        </h2>
        <div className="mt-lg grid grid-cols-1 gap-xl lg:grid-cols-2">
          <div>
            <ImageCarousel imageUrls={product.imageUrls} alt={product.name} />
            {product.inscriptionSettings?.isAvailable && (
              <div className="mt-6">
                <div className="mt-6 border-t pt-4">
                  <div className="flex items-center space-x-2 mb-4">
                    <Switch
                      id="inscription-toggle"
                      checked={showInscriptionInput}
                      onCheckedChange={(checked) => {
                        setShowInscriptionInput(checked);
                        if (!checked) setInscription("");
                      }}
                    />
                    <Label htmlFor="inscription-toggle" className="font-medium cursor-pointer">
                      Add Cake writing
                      {product.inscriptionSettings.price !== 0 && (
                        <span className="text-muted-foreground ml-1">
                          (+$ {product.inscriptionSettings.price.toFixed(2)})
                        </span>
                      )}
                    </Label>
                  </div>

                  <div
                    className={cn(
                      "grid transition-all duration-300 ease-in-out overflow-hidden",
                      showInscriptionInput
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                    )}
                  >
                    <div className="min-h-0">
                      <p className="text-sm text-gray-500 mb-2">
                        Max {product.inscriptionSettings.maxLength} characters.
                      </p>
                      <Input
                        type="text"
                        placeholder="e.g., Happy Birthday, Mom!"
                        value={inscription}
                        onChange={(e) => setInscription(e.target.value)}
                        maxLength={product.inscriptionSettings.maxLength}
                        className="w-full mb-2"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <div className=" space-y-lg border-border">
              {!isSet ? (
                /* --- STANDARD CAKE UI --- */
                <>
                  {/* Flavor Selector */}
                  <div>
                    <FlavorSelector
                      mode="single"
                      flavors={product.availableFlavors}
                      selectedId={selectedFlavorId}
                      onSelectId={setSelectedFlavorId}
                    />
                  </div>

                  {/* Size Selector */}
                  <DiameterSelector
                    diameters={displayableDiameters}
                    selectedDiameterId={
                      selectedDiameterConfig?.diameterId.toString() || null
                    }
                    onSelectDiameter={handleSelectDiameter}
                  />
                </>
              ) : (
                /* --- SETS / COMBOS UI --- */
                <>
                  {isCombo ? (
                    /* --- COMBO ACCORDION LAYOUT --- */
                    <div className="space-y-2">
                      {/* 1. Set Flavors */}
                      <CollapsibleSection
                        title="1. Choose flavors for your treats"
                        isOpen={activeAccordion === "set-flavors"}
                        onToggle={() => toggleAccordion("set-flavors")}
                      >
                        <p className="text-sm text-gray-500 mb-4">
                          Choose up to 3 flavors for your box.
                        </p>
                        <FlavorSelector
                          mode="multiple"
                          flavors={product.availableFlavors}
                          selectedIds={selectedSetFlavorIds}
                          onToggleId={handleToggleSetFlavor}
                          maxSelection={3}
                          hidePrice={true}
                        />
                      </CollapsibleSection>

                      {/* 2. Box Size */}
                      {product.availableQuantityConfigs && (
                        <CollapsibleSection
                          title="2. Choose Box Size"
                          isOpen={activeAccordion === "quantity"}
                          onToggle={() => toggleAccordion("quantity")}
                        >
                          <QuantitySelector
                            configs={product.availableQuantityConfigs}
                            selectedId={selectedQtyConfigId}
                            onSelect={setSelectedQtyConfigId}
                          />
                        </CollapsibleSection>
                      )}

                      {/* 3. Cake Flavor */}
                      <CollapsibleSection
                        title="3. Choose Cake Flavor"
                        isOpen={activeAccordion === "cake-flavor"}
                        onToggle={() => toggleAccordion("cake-flavor")}
                      >
                        <div className="mb-4 p-3 bg-subtleBackground rounded-md border border-primary/20 flex gap-3">
                          <div className="h-24 w-24 flex items-center justify-center pb-4">
                            <FourInchBentoIcon className="h-16 w-16" />
                          </div>

                          <div className="flex flex-col justify-center h-24">
                            <p className="text-sm font-bold text-primary leading-tight">
                              Includes 4 inch Bento Cake
                            </p>
                            <p className="text-xs text-primary/70 leading-tight">
                              Standard size for combo sets
                            </p>
                          </div>
                        </div>

                        <FlavorSelector
                          mode="single"
                          flavors={comboCakeFlavors}
                          selectedId={comboSelection.flavorId}
                          onSelectId={(id) =>
                            setComboSelection((prev) => ({
                              ...prev,
                              flavorId: id,
                            }))
                          }
                          hidePrice={false}
                        />
                      </CollapsibleSection>

                    </div>
                  ) : (
                    <>
                      {/* 1. Set Flavors */}
                      <div>
                        <h3 className="font-heading text-h3 text-primary mb-2">
                          Pick your flavors
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">
                          Choose up to 3 flavors for your box.
                        </p>
                        <FlavorSelector
                          mode="multiple"
                          flavors={product.availableFlavors}
                          selectedIds={selectedSetFlavorIds}
                          onToggleId={handleToggleSetFlavor}
                          maxSelection={3}
                          hidePrice={true}
                        />
                      </div>

                      {/* 2. Box Size */}
                      {product.availableQuantityConfigs && (
                        <div className="border-t border-border pt-4 mt-4">
                          <h3 className="font-heading text-h3 text-primary mb-2">
                            Choose Box Size
                          </h3>
                          <QuantitySelector
                            configs={product.availableQuantityConfigs}
                            selectedId={selectedQtyConfigId}
                            onSelect={setSelectedQtyConfigId}
                          />
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {/* --- Quantity Stepper --- */}
              <div className="flex">
                <div>
                  <h3 className="font-body text-body font-bold text-primary">
                    Quantity:
                  </h3>
                  <QuantityStepper
                    quantity={quantity}
                    onIncrease={() => setQuantity((q) => q + 1)}
                    onDecrease={() => setQuantity((q) => Math.max(1, q - 1))}
                  />
                </div>

                <div className="ml-auto text-right">
                  {appliedDiscountName ? (
                    <>
                      <p className="font-body text-body text-gray-400 line-through">
                        ${(calculatedPrice * quantity).toFixed(2)}
                      </p>
                      <p className="font-body text-h3 font-bold text-error">
                        ${(finalPrice * quantity).toFixed(2)}
                      </p>
                      <div className="text-xs bg-error/10 text-error px-2 py-0.5 rounded-full inline-block mt-1 font-medium">
                        {appliedDiscountName}
                      </div>
                    </>
                  ) : (
                    <p className="font-body text-h3 font-bold text-primary">
                      ${(finalPrice * quantity).toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-lg">
              <Button
                onClick={handleAddToCart}
                disabled={
                  isSet
                    ? selectedSetFlavorIds.length === 0 || !selectedQtyConfig
                    : !selectedFlavorId || !selectedDiameterConfig
                }
                className="w-full"
              >
                Add to Cart
              </Button>
            </div>
          </div>
        </div>

        {/* --- Detailed Info Tabs --- */}
        <div className="mt-xxl">
          <div className="border-b border-border">
            <nav className="-mb-px flex space-x-lg" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "py-md px-sm font-body text-body border-b-2 transition-colors",
                    activeTab === tab.id
                      ? "border-accent text-accent"
                      : "border-transparent text-primary/60 hover:border-primary/30 hover:text-primary"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
          <div className="py-lg font-body text-body text-primary/80 prose max-w-none">
            {activeTab === "description" && (
              <div>
                <p>{product.description}</p>
              </div>
            )}
            {activeTab === "ingredients" && (
              <div>
                <p>List of ingredients and allergens goes here...</p>
              </div>
            )}
            {activeTab === "delivery" && (
              <div>
                <p>Information about delivery and pickup terms goes here...</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
       {relatedFlavors.length > 0 && (
        <section className="py-xxl bg-subtleBackground/30 border-t border-border/50">
          <div className="mx-auto max-w-7xl px-lg">
             <h2 className="text-center font-heading text-h2 mb-lg">
              Explore Our Flavors
             </h2>
             <FlavorCarousel flavors={relatedFlavors} />
          </div>
        </section>
      )}

    </div>
  );
};

export default SingleProductPage;
