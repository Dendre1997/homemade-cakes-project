"use client";

import { useEffect, useState } from "react";
import { notFound, useParams, useRouter } from "next/navigation";
import { ProductWithCategory, Flavor, AvailableDiameterConfig } from "@/types";
import Image from "next/image";
import Link from "next/link";
import { useCartStore } from "@/lib/store/cartStore";
import { useAlert } from "@/contexts/AlertContext";
import { cn } from "@/lib/utils";
import QuantityStepper from "@/components/ui/QuantityStepper";
import FlavorSelector from "@/components/ui/FlavorSelector";

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
import ImageCarousel from "@/components/ui/ImageCarousel";

const SingleProductPage = () => {
  const params = useParams();
  const id = params.id as string;
  const { showAlert } = useAlert();
  const router = useRouter();

  const [product, setProduct] = useState<ProductWithCategory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedFlavorId, setSelectedFlavorId] = useState<string | null>(null);
  const [selectedDiameterConfig, setSelectedDiameterConfig] = useState<AvailableDiameterConfig | null>(null);
  const addItem = useCartStore((state) => state.addItem);

  const [activeImage, setActiveImage] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState("description");
  const [inscription, setInscription] = useState("");
  const [showInscriptionInput, setShowInscriptionInput] = useState(false);
  const openMiniCart = useCartStore((state) => state.openMiniCart);

  useEffect(() => {
    if (id) {
      const fetchProduct = async () => {
        try {
          setIsLoading(true);
          setError(null);
          const res = await fetch(`/api/products/${id}`);
          if (res.status === 404) {
            notFound();
            return;
          }
          if (!res.ok) throw new Error("Failed to fetch data");
          const data = await res.json();
          setProduct(data);

          setActiveImage(data.imageUrls[0] || "");
          if (data.availableDiameterConfigs?.length > 0) {
            setSelectedDiameterConfig(data.availableDiameterConfigs[0]);
          }
        } catch (err) {
          if (err instanceof Error) setError(err.message);
        } finally {
          setIsLoading(false);
        }
      };
      fetchProduct();
    }
  }, [id]);

  const getIllustrationForSize = (sizeValue: number) => {
    if (sizeValue <= 4) return FourInchBentoIcon;
    if (sizeValue === 5) return FiveInchBentoIcon;
    if (sizeValue === 6) return SixInchCakeIcon
    if (sizeValue === 7) return SevenInchCakeIcon;
    if (sizeValue === 8) return EightInchCakeIcon;
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

  let calculatedPrice = product ? product.structureBasePrice : 0;
  if (product) {
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
  const handleSelectDiameter = (diameterId: string) => {
    const config = product?.availableDiameterConfigs.find(
      (c) => c.diameterId === diameterId
    );
    setSelectedDiameterConfig(config || null);
  };

  const handleAddToCart = () => {
    if (!selectedFlavorId || !selectedDiameterConfig || !product) {
      showAlert("Please select a flavor and size.", "error");
      return;
    }
    if (showInscriptionInput && inscription.trim() === "") {
      showAlert(
        'Please enter your Cake writing  or press "Cancel".',
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
      price: calculatedPrice,
      quantity: quantity,
      imageUrl: product.imageUrls[0] || "/placeholder.png",
      inscription: inscription,
    };
    addItem(cartItem);
    openMiniCart();
    setQuantity(1);
    setSelectedFlavorId(null);
    setSelectedDiameterConfig(product.availableDiameterConfigs[0] || null);
    if (showInscriptionInput) {
      setInscription("");
      setShowInscriptionInput(false);
    }
  };

  if (isLoading)
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <LoadingSpinner />
      </div>
    );
  if (error)
    return <div className="text-center py-xl text-error">Error: {error}</div>;
  if (!product) return <p>Product not found.</p>;

  const tabs = [
    { id: "description", label: "Full Description" },
    { id: "ingredients", label: "Ingredients & Allergens" },
    { id: "delivery", label: "Delivery Terms" },
  ];

  return (
    <div className="bg-background">
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

        <div className="mt-lg grid grid-cols-1 gap-xl lg:grid-cols-2">
          <div>
            <div className="relative aspect-square w-full overflow-hidden rounded-medium">
              <ImageCarousel imageUrls={product.imageUrls} alt={product.name} />
            </div>
            {product.inscriptionSettings?.isAvailable && (
              <div className="mt-6">
                {!showInscriptionInput ? (
                  <Button
                    variant="secondary"
                    onClick={() => setShowInscriptionInput(true)}
                  >
                    Add Custom Inscription{" "}
                    {product.inscriptionSettings.price !== 0
                      ? ` +$${product.inscriptionSettings.price.toFixed(2)}`
                      : null}
                  </Button>
                ) : (
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">
                      Custom Inscription{" "}
                      {product.inscriptionSettings.price !== 0
                        ? ` +$${product.inscriptionSettings.price.toFixed(2)}`
                        : null}
                    </h3>
                    <p className="text-sm text-gray-500 mb-2">
                      Max {product.inscriptionSettings.maxLength} characters.
                    </p>
                    <Input
                      type="text"
                      placeholder="e.g., Happy Birthday, Mom!"
                      value={inscription}
                      onChange={(e) => setInscription(e.target.value)}
                      maxLength={product.inscriptionSettings.maxLength}
                      className="w-full"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowInscriptionInput(false);
                        setInscription("");
                      }}
                      className="text-sm text-red-600 hover:underline mt-1"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <h1 className="font-heading text-h1 text-primary">
              {product.name}
            </h1>
            <div className="mt-lg space-y-lg border-t border-border pt-lg">
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
                <div className="ml-auto">
                  <p className="mt-lg font-body text-h3 font-bold text-primary">
                    ${(calculatedPrice * quantity).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-lg">
              <Button
                onClick={handleAddToCart}
                disabled={!selectedFlavorId || !selectedDiameterConfig}
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
    </div>
  );
};

export default SingleProductPage;
