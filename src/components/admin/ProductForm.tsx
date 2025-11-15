"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Allergen,
  Diameter,
  Flavor,
  Product,
  ProductCategory,
  AvailableDiameterConfig,
  ProductFormData,
  Collection
} from "@/types";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";

import SortableImage from "./SortableImage";

import { Button } from "../ui/Button";
import { Input } from "@/components/ui/Input";
import { Checkbox } from "../ui/Checkbox";
import { Textarea } from "../ui/Textarea";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/Select";
interface ProductFormProps {
  existingProduct?: Product | null;
  onFormSubmit: (productData: ProductFormData) => void;
  flavors: Flavor[];
  diameters: Diameter[];
  allergens: Allergen[];
  categories: ProductCategory[];
  collections: Collection[];
  categoryId?: string;
  onCategoryChange: (newCategoryId: string) => void;
  isSubmitting?: boolean;
}
import FlavorSelector from "../ui/FlavorSelector";
import { ChipCheckbox } from "../ui/ChipCheckbox";

import { FourInchBentoIcon } from "@/components/icons/cake-sizes/FourInchBentoIcon";
import { FiveInchBentoIcon } from "@/components/icons/cake-sizes/FiveInchBentoIcon";
import { SixInchCakeIcon } from "@/components/icons/cake-sizes/SixInchCakeIcon";
import { SevenInchCakeIcon } from "@/components/icons/cake-sizes/SevenInchCakeIcon";
import { EightInchCakeIcon } from "@/components/icons/cake-sizes/EightInchCakeIcon";

import { X } from "lucide-react";
import { useAlert } from "@/contexts/AlertContext";

const ProductForm = ({
  existingProduct,
  flavors,
  diameters,
  allergens,
  collections,
  categoryId,
  onFormSubmit,
  onCategoryChange,
  categories,
}: ProductFormProps) => {
  const {showAlert} = useAlert()
  const isEditMode = !!existingProduct;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [structureBasePrice, setStructureBasePrice] = useState("");
  const [isActive, setIsActive] = useState<boolean>(true);
  const [availableFlavorIds, setAvailableFlavorIds] = useState<string[]>([]);
  const [allergenIds, setAllergenIds] = useState<string[]>([]);
  const [availableDiameterConfigs, setAvailableDiameterConfigs] = useState<AvailableDiameterConfig[]>([]);
  const [collectionIds, setCollectionIds] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  const [inscriptionAvailable, setInscriptionAvailable] = useState(false);
  const [inscriptionPrice, setInscriptionPrice] = useState("");
  const [inscriptionMaxLength, setInscriptionMaxLength] = useState("");

  const iconMap: { [key: string]: React.FC<React.SVGProps<SVGSVGElement>> } = {
    FourInchBentoIcon: FourInchBentoIcon,
    FiveInchBentoIcon: FiveInchBentoIcon,
    SixInchCakeIcon: SixInchCakeIcon,
    SevenInchCakeIcon: SevenInchCakeIcon,
    EightInchCakeIcon: EightInchCakeIcon,
  };
  const sortedDiameters = [...diameters].sort(
    (a, b) => a.sizeValue - b.sizeValue
  );
  const assignedIds = availableDiameterConfigs.map((c) => c.diameterId);
  const unassignedDiameters = sortedDiameters.filter(
    (d) => !assignedIds.includes(d._id)
  );
  const assignedDiameters = availableDiameterConfigs
    .map((config) => {
      const details = sortedDiameters.find((d) => d._id === config.diameterId);
      return { ...details, ...config };
    })
    .sort((a, b) => (a.sizeValue || 0) - (b.sizeValue || 0));

  const addDiameter = (diameterId: string) => {
    setAvailableDiameterConfigs((prev) => [
      ...prev,
      { diameterId, multiplier: 1 },
    ]);
  };
  const removeDiameter = (diameterId: string) => {
    setAvailableDiameterConfigs((prev) =>
      prev.filter((c) => c.diameterId !== diameterId)
    );
  };
  const handleMultiSelectChange = (
    idToToggle: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setter((prev) =>
      prev.includes(idToToggle)
        ? prev.filter((id) => id !== idToToggle)
        : [...prev, idToToggle]
    );
  };

  const handleDiameterConfigChange = (
    diameterId: string,
    multiplier: string
  ) => {
    const numericMultiplier = parseFloat(multiplier);
    setAvailableDiameterConfigs((prev) => {
      const existingConfig = prev.find((c) => c.diameterId === diameterId);
      if (multiplier === "" || isNaN(numericMultiplier)) {
        return prev.filter((c) => c.diameterId !== diameterId);
      }
      if (existingConfig) {
        return prev.map((c) =>
          c.diameterId === diameterId
            ? { ...c, multiplier: numericMultiplier }
            : c
        );
      } else {
        return [...prev, { diameterId, multiplier: numericMultiplier }];
      }
    });
  };

  useEffect(() => {
    if (existingProduct) {
      setName(existingProduct.name || "");
      setDescription(existingProduct.description || "");
      setStructureBasePrice(
        existingProduct.structureBasePrice?.toString() || ""
      );
      setIsActive(existingProduct.isActive);

      setAvailableFlavorIds(
        existingProduct.availableFlavorIds?.map((id) => id.toString()) || []
      );
      // setCategoryIds(existingProduct.categoryId?.toString() || '');
      setAllergenIds(
        existingProduct.allergenIds?.map((id) => id.toString()) || []
      );
      setAvailableDiameterConfigs(
        existingProduct.availableDiameterConfigs?.map((config) => ({
          ...config,
          diameterId: config.diameterId.toString(),
        })) || []
      );
      setImageUrls(existingProduct.imageUrls || []);
      setCollectionIds(
        existingProduct.collectionIds?.map((id) => id.toString()) || []
      );
    }
    if (existingProduct?.inscriptionSettings) {
      setInscriptionAvailable(existingProduct.inscriptionSettings.isAvailable);
      setInscriptionPrice(existingProduct.inscriptionSettings.price.toString());
      setInscriptionMaxLength(
        existingProduct.inscriptionSettings.maxLength.toString()
      );
    } else {
      setInscriptionAvailable(false);
      setInscriptionPrice("");
      setInscriptionMaxLength("");
    }
  }, [existingProduct]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setError(null);

    const uploadPromises: Promise<any>[] = [];

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "homemade_cakes_preset");

      const uploadPromise = fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      ).then((response) => {
        if (!response.ok)
          throw new Error(`Image upload failed for ${file.name}`);
        return response.json();
      });
      uploadPromises.push(uploadPromise);
    }

    try {
      const results = await Promise.all(uploadPromises);
      const newUrls = results.map((result) => result.secure_url);

      setImageUrls((prevUrls) => [...prevUrls, ...newUrls]);
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      else setError("An image upload error occurred");
    } finally {
      setIsUploading(false);
    }
  };
  const handleRemoveImage = (indexToRemove: number) => {
    setImageUrls((prevUrls) =>
      prevUrls.filter((_, index) => index !== indexToRemove)
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!categoryId) {
      showAlert("Please select a category before submitting.", 'error');
      return;
    }

    const sortedConfigsToSubmit = [...availableDiameterConfigs].sort((a, b) => {
      const diameterA = diameters.find((d) => d._id === a.diameterId);
      const diameterB = diameters.find((d) => d._id === b.diameterId);
      return (diameterA?.sizeValue || 0) - (diameterB?.sizeValue || 0);
    });
    
    const productData: ProductFormData = {
      name,
      description,
      categoryId,
      structureBasePrice: parseFloat(structureBasePrice),
      isActive,
      availableFlavorIds,
      allergenIds,
      availableDiameterConfigs: sortedConfigsToSubmit,
      imageUrls: imageUrls,
      inscriptionSettings: {
        isAvailable: inscriptionAvailable,
        price: parseFloat(inscriptionPrice) || 0,
        maxLength: parseInt(inscriptionMaxLength) || 0,
      },
      collectionIds: collectionIds,
    };

    onFormSubmit(productData);
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setImageUrls((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const iconSizeClass = "h-8 w-8 text-primary shrink-0";

  return (
    <form onSubmit={handleSubmit} className="space-y-8 p-8 rounded-lg ">
      <div className="space-y-4">
        <h2 className="text-xl font-heading">Basic Information</h2>
        <div>
          <label htmlFor="category" className="block text-lg font-heading">
            Product Category
          </label>
          <Select value={categoryId} onValueChange={onCategoryChange}>
            <SelectTrigger>
              <SelectValue placeholder="-- Select a Category --" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat._id.toString()} value={cat._id.toString()}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label htmlFor="name">Product Name</label>
          <Input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="description">Description</label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Images
          </label>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={imageUrls} strategy={rectSortingStrategy}>
              <div className="mt-2 flex flex-wrap gap-4">
                {imageUrls.map((url, index) => (
                  <SortableImage
                    key={url}
                    url={url}
                    index={index}
                    handleRemoveImage={handleRemoveImage}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <div className="mt-4">
            <label className="flex items-center justify-center px-4 py-2 bg-background text-text-main text-sm font-medium rounded-xl shadow-md cursor-pointer hover:opacity-90 transition">
              {isUploading ? "Uploading..." : "Upload Image"}
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                disabled={isUploading}
                className="hidden"
              />
            </label>

            {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
          </div>
        </div>
        <div>
          <label htmlFor="price">Base Price</label>
          <Input
            type="number"
            id="price"
            value={structureBasePrice}
            onChange={(e) => setStructureBasePrice(e.target.value)}
            required
          />
        </div>
        <div className="flex items-center">
          <Checkbox
            id="isActive"
            checked={isActive}
            onCheckedChange={(checked) => setIsActive(Boolean(checked))}
            className="h-4 w-4"
          />
          <label htmlFor="isActive" className="ml-2">
            Product is Active
          </label>
        </div>
        {/* Inscription Settings */}
        <div className="space-y-4 p-4 border border-border rounded-medium">
          <h3 className="text-lg font-medium font-heading text-primary">
            Coustome Text on Top Settings
          </h3>
          <div className="flex items-center gap-3">
            <Checkbox
              id="inscriptionAvailable"
              checked={inscriptionAvailable}
              onCheckedChange={(checked) =>
                setInscriptionAvailable(Boolean(checked))
              }
            />
            <label htmlFor="inscriptionAvailable" className="font-medium">
              Enable Coustome Text on Top for this product?
            </label>
          </div>
          {inscriptionAvailable && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="inscriptionPrice"
                  className="block text-sm font-medium"
                >
                  Price
                </label>
                <Input
                  id="inscriptionPrice"
                  type="number"
                  value={inscriptionPrice}
                  onChange={(e) => setInscriptionPrice(e.target.value)}
                  placeholder="e.g., 5"
                />
              </div>
              <div>
                <label
                  htmlFor="inscriptionMaxLength"
                  className="block text-sm font-medium"
                >
                  Max Length
                </label>
                <Input
                  id="inscriptionMaxLength"
                  type="number"
                  value={inscriptionMaxLength}
                  onChange={(e) => setInscriptionMaxLength(e.target.value)}
                  placeholder="e.g., 20"
                />
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-heading">Available Flavors</h3>
        <div>
          <FlavorSelector
            mode="multiple"
            flavors={flavors}
            selectedIds={availableFlavorIds}
            onToggleId={(flavorId) =>
              handleMultiSelectChange(flavorId, setAvailableFlavorIds)
            }
          />
        </div>
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-heading">Allergens</h3>
        <div className="p-4 border rounded-md grid grid-cols-2 md:grid-cols-3 gap-4">
          {allergens.map((allergen) => (
            <ChipCheckbox
              key={allergen._id.toString()}
              checked={allergenIds.includes(allergen._id.toString())}
              onCheckedChange={() =>
                handleMultiSelectChange(allergen._id.toString(), setAllergenIds)
              }
            >
              {allergen.name}
            </ChipCheckbox>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-medium font-heading text-primary">
          Collections / Tags
        </h3>
        <div className="p-4 border border-border rounded-medium grid grid-cols-2 md:grid-cols-3 gap-4">
          {collections.map((collection) => (
            <div key={collection._id.toString()} className="flex items-center">
              <Checkbox
                id={`collection-${collection._id.toString()}`}
                checked={collectionIds.includes(collection._id.toString())}
                onCheckedChange={() =>
                  handleMultiSelectChange(
                    collection._id.toString(),
                    setCollectionIds
                  )
                }
              />
              <label
                htmlFor={`collection-${collection._id.toString()}`}
                className="ml-2 text-sm font-medium"
              >
                {collection.name}
              </label>
            </div>
          ))}
        </div>
      </div>
      {/* --- Available Diameters & Price Multipliers --- */}
      <div className="space-y-sm">
        <h3 className="font-heading text-h3 text-primary">Diameters</h3>

        <div className="grid grid-cols-1 gap-md md:grid-cols-2">
          <div className="space-y-xs rounded-medium border border-border p-sm">
            <h4 className="px-sm font-body text-body font-bold text-primary/80">
              Available to Add
            </h4>
            {unassignedDiameters.map((diameter) => {
              const Icon = diameter.illustration
                ? iconMap[diameter.illustration]
                : null;
              return (
                <div
                  key={diameter._id}
                  className="flex items-center justify-between rounded-medium p-sm hover:bg-background"
                >
                  <div className="flex items-center gap-sm">
                    {Icon && <Icon className={iconSizeClass} />}
                    <span className="font-body text-body">{diameter.name}</span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => addDiameter(diameter._id)}
                  >
                    Add +
                  </Button>
                </div>
              );
            })}
            {unassignedDiameters.length === 0 && (
              <p className="p-sm text-center text-primary/60 font-body text-sm">
                All diameters have been assigned.
              </p>
            )}
          </div>

          {/* --- Right Column: ASSIGNED DIAMETERS --- */}
          <div className="space-y-xs rounded-medium border border-border p-sm">
            <h4 className="px-sm font-body text-body font-bold text-primary/80">
              Assigned to Product
            </h4>
            {assignedDiameters.map((diameter) => {
              const Icon = diameter.illustration
                ? iconMap[diameter.illustration]
                : null;
              return (
                <div
                  key={diameter.diameterId}
                  className="grid grid-cols-10 items-center gap-sm rounded-medium p-sm hover:bg-background"
                >
                  <div className="col-span-5 flex items-center gap-sm">
                    {Icon && <Icon className={iconSizeClass} />}
                    <span className="font-body text-body">{diameter.name}</span>
                  </div>
                  <div className="col-span-4">
                    <Input
                      type="number"
                      placeholder="e.g., 1.5"
                      step="0.1"
                      value={diameter.multiplier}
                      onChange={(e) =>
                        handleDiameterConfigChange(
                          diameter.diameterId,
                          e.target.value
                        )
                      }
                    />
                  </div>
                  <div className="col-span-1 flex justify-end items-center">
                    <button
                      type="button"
                      onClick={() => removeDiameter(diameter.diameterId)}
                      className="p-2 rounded-full text-primary/40 transition-colors hover:bg-error/10 hover:text-error"
                      aria-label="Remove diameter"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              );
            })}
            {assignedDiameters.length === 0 && (
              <p className="p-sm text-center text-primary/60 font-body text-sm">
                No diameters assigned yet.
              </p>
            )}
          </div>
        </div>
      </div>

      {error && <p className="text-red-500">Error: {error}</p>}

      <Button type="submit" className="w-full">
        {isEditMode ? "Save Edited Product" : "Create Product"}
      </Button>
    </form>
  );
};

export default ProductForm;
