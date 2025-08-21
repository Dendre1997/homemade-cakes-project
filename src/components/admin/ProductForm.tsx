'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Allergen,
  Diameter,
  Flavor,
  Product,
  ProductCategory,
  AvailableDiameterConfig,
  ProductFormData
} from '@/types';

interface ProductFormProps {
  existingProduct?: Product | null;
  onFormSubmit: (productData: ProductFormData) => void;
  flavors: Flavor[];
  diameters: Diameter[];
  allergens: Allergen[];
  categories: ProductCategory[];
  categoryId?: string;
  onCategoryChange: (newCategoryId: string) => void;
  isSubmitting?: boolean;
}

const ProductForm = ({
  existingProduct,
  flavors,
  diameters,
  allergens,
  categoryId,
  onFormSubmit,
  onCategoryChange,
  categories,
}: ProductFormProps) => {
  const isEditMode = !!existingProduct;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [structureBasePrice, setStructureBasePrice] = useState('');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [availableFlavorIds, setAvailableFlavorIds] = useState<string[]>([]);
  const [allergenIds, setAllergenIds] = useState<string[]>([]);
  const [availableDiameterConfigs, setAvailableDiameterConfigs] = useState<
    AvailableDiameterConfig[]
  >([]);
  // const [categoryIds, setCategoryIds] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

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
      if (multiplier === '' || isNaN(numericMultiplier)) {
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
      setName(existingProduct.name || '');
      setDescription(existingProduct.description || '');
      setStructureBasePrice(
        existingProduct.structureBasePrice?.toString() || ''
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
    }
  }, [existingProduct]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // TODO: Add another state isUploading to prevent blocking of whole form
    setIsLoading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "homemade_cakes_preset");

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) throw new Error("Image upload failed");

      const data = await response.json();

      // Додаємо новий URL до нашого існуючого масиву
      setImageUrls((prevUrls) => [...prevUrls, data.secure_url]);
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      else setError("An image upload error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // setIsLoading(true);
    if (!categoryId) {
      alert("Please select a category before submitting.");
      return;
    }
    const productData: ProductFormData = {
      name,
      description,
      categoryId,
      structureBasePrice: parseFloat(structureBasePrice),
      isActive,
      availableFlavorIds,
      allergenIds,
      availableDiameterConfigs,
      imageUrls: imageUrls,
    };

    onFormSubmit(productData);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-8 p-8 bg-white rounded-lg shadow-md"
    >
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Basic Information</h2>
        <div>
          <label
            htmlFor="category"
            className="block text-sm font-medium text-gray-700"
          >
            Product Category
          </label>
          <select
            id="category"
            value={categoryId}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="mt-1 block w-full p-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            required
          >
            <option value="">-- Select a Category --</option>
            {categories.map((cat) => (
              <option key={cat._id.toString()} value={cat._id.toString()}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="name">Product Name</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="description">Description</label>
          <textarea
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
          {/* Відображаємо прев'ю завантажених зображень */}
          <div className="mt-2 flex flex-wrap gap-4">
            {imageUrls.map((url) => (
              <div key={url} className="relative w-24 h-24">
                <Image
                  src={url}
                  alt="Uploaded image"
                  layout="fill"
                  className="object-cover rounded-md"
                />
                {/* TODO: Add a delete button for each image */}
              </div>
            ))}
          </div>
          {/* Поле для завантаження */}
          <div className="mt-2">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={isLoading}
              className="text-sm"
            />
          </div>
        </div>
        <div>
          <label htmlFor="price">Base Price</label>
          <input
            type="number"
            id="price"
            value={structureBasePrice}
            onChange={(e) => setStructureBasePrice(e.target.value)}
            required
          />
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="isActive"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4"
          />
          <label htmlFor="isActive" className="ml-2">
            Product is Active
          </label>
        </div>
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Available Flavors</h3>
        <div className="p-4 border rounded-md grid grid-cols-2 md:grid-cols-3 gap-4">
          {flavors.map((flavor) => (
            <div key={flavor._id.toString()} className="flex items-center">
              <input
                type="checkbox"
                id={`flavor-${flavor._id.toString()}`}
                checked={availableFlavorIds.includes(flavor._id.toString())}
                onChange={() =>
                  handleMultiSelectChange(
                    flavor._id.toString(),
                    setAvailableFlavorIds
                  )
                }
              />
              <label
                htmlFor={`flavor-${flavor._id.toString()}`}
                className="ml-2"
              >
                {flavor.name}
              </label>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Allergens</h3>
        <div className="p-4 border rounded-md grid grid-cols-2 md:grid-cols-3 gap-4">
          {allergens.map((allergen) => (
            <div key={allergen._id.toString()} className="flex items-center">
              <input
                type="checkbox"
                id={`allergen-${allergen._id.toString()}`}
                checked={allergenIds.includes(allergen._id.toString())}
                onChange={() =>
                  handleMultiSelectChange(
                    allergen._id.toString(),
                    setAllergenIds
                  )
                }
              />
              <label
                htmlFor={`allergen-${allergen._id.toString()}`}
                className="ml-2"
              >
                {allergen.name}
              </label>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-medium">
          Available Diameters & Price Multipliers
        </h3>
        <div className="p-4 border rounded-md space-y-4">
          {diameters.map((diameter) => {
            const currentMultiplier =
              availableDiameterConfigs.find(
                (c) => c.diameterId === diameter._id.toString()
              )?.multiplier || "";
            return (
              <div
                key={diameter._id.toString()}
                className="grid grid-cols-2 gap-4 items-center"
              >
                <label htmlFor={`diameter-${diameter._id.toString()}`}>
                  {diameter.name} {diameter.sizeValue}
                </label>
                <input
                  type="number"
                  id={`diameter-${diameter._id.toString()}`}
                  value={currentMultiplier}
                  onChange={(e) =>
                    handleDiameterConfigChange(
                      diameter._id.toString(),
                      e.target.value
                    )
                  }
                  placeholder="e.g., 1.5"
                  step="0.1"
                />
              </div>
            );
          })}
        </div>
      </div>

      {error && <p className="text-red-500">Error: {error}</p>}

      <button type="submit" disabled={isLoading} className="...">
        {isLoading ? "Creating Product..." : "Create Product"}
      </button>
    </form>
  );
};

export default ProductForm;
