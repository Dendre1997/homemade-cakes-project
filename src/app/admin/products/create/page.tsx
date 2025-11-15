"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import ProductForm from "@/components/admin/ProductForm";
import {
  Flavor,
  Diameter,
  Allergen,
  ProductCategory,
  Product,
  ProductFormData,
  Collection
} from "@/types";
import LoadingSpinner from "@/components/ui/Spinner";
import {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/Select";


/**
 * Page for creating a new product.
 * It enforces a two-step process:
 * 1. User must select a category.
 * 2. The form is then displayed with flavors/diameters filtered for that category.
 */
const CreateProductPage = () => {
  const router = useRouter();
  // Static data, loaded once
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [allAllergens, setAllergens] = useState<Allergen[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  // State to manage the two-step form process
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [filteredFlavors, setFilteredFlavors] = useState<Flavor[]>([]);
  const [filteredDiameters, setFilteredDiameters] = useState<Diameter[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDependentsLoading, setIsDependentsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Effect to fetch static data (categories, allergens) on initial load
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const [categoriesRes, allergensRes, collectionsRes] = await Promise.all(
          [
            fetch("/api/admin/categories"),
            fetch("/api/admin/allergens"),
            fetch("/api/admin/collections"),
          ]
        );

        if (!categoriesRes.ok || !allergensRes || !allergensRes.ok) {
          throw new Error("Failed to fetch initial data for the form");
        }
        setCategories(await categoriesRes.json());
        setAllergens(await allergensRes.json());
        setCollections(await collectionsRes.json());
      } catch (err) {
        if (err instanceof Error) setError(err.message);
        else setError("An unknown error occurred");
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  // This effect runs whenever the selected category changes.
  // It fetches the flavors and diameters that are *dependent* on that category.
  useEffect(() => {
    // If the category is de-selected, clear the dependent data
    if (!selectedCategoryId) {
      setFilteredFlavors([]);
      setFilteredDiameters([]);
      return;
    }
    const fetchDependentData = async () => {
      setIsDependentsLoading(true);
      try {
        const [flavorsRes, diametersRes] = await Promise.all([
          fetch(`/api/admin/flavors?categoryId=${selectedCategoryId}`),
          fetch(`/api/admin/diameters?categoryId=${selectedCategoryId}`),
        ]);
        if (!flavorsRes.ok || !diametersRes.ok)
          throw new Error("Failed to fetch dependent data");
        setFilteredFlavors(await flavorsRes.json());
        setFilteredDiameters(await diametersRes.json());
      } catch (error) {
        console.error(error);
      } finally {
        setIsDependentsLoading(false);
      }
    };
    fetchDependentData();
  }, [selectedCategoryId]); // Re-runs when the category ID changes

  const handleCreateProduct = useCallback(
    async (productData: ProductFormData) => {
      try {
        const response = await fetch("/api/admin/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(productData),
        });

        if (!response.ok) {
          throw new Error("Failed to create product");
        }

        alert("Product created successfully!");
        router.push("/admin/products");
      } catch (error) {
        console.error("Error creating product:", error);
        alert("Something went wrong!");
      }
    },
    [router] // Dependency for router.push
  );
  if (isLoading) return <LoadingSpinner />;

  
  return (
    <section>
      <h1 className="text-3xl font-heading mb-6">Create New Product</h1>

      {/* chose category */}
      <div className="mb-8 p-4 border rounded-md">
        <label
          htmlFor="category-select"
          className="block text-lg font-medium mb-2"
        >
          Step 1: Choose a Product Category
        </label>
        <Select
          value={selectedCategoryId}
          onValueChange={setSelectedCategoryId}
        >
          <SelectTrigger className="w-full h-12 rounded-lg border border-gray-300 px-4 text-base">
            <SelectValue placeholder="-- Select Category --" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem
                key={cat._id.toString()}
                value={cat._id.toString()}
                className="py-3 text-base"
              >
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* show form if category was choosen */}
      {selectedCategoryId &&
        (isDependentsLoading ? (
          <p>Loading options for this category...</p>
        ) : (
          <ProductForm
            onFormSubmit={handleCreateProduct}
            categories={categories}
            categoryId={selectedCategoryId}
            onCategoryChange={setSelectedCategoryId}
            flavors={filteredFlavors}
            diameters={filteredDiameters}
            allergens={allAllergens}
            collections={collections}
          />
        ))}
    </section>
  );
};

export default CreateProductPage;
