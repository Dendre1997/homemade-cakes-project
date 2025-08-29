"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Product,
  ProductCategory,
  Flavor,
  Diameter,
  Allergen,
  ProductFormData,
} from "@/types";
import ProductForm from "@/components/admin/ProductForm";
import LoadingSpinner from "@/components/Spinner";

const EditProductPage = () => {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [allergens, setAllergens] = useState<Allergen[]>([]);

  // State for the DYNAMICALLY filtered lists
  const [flavors, setFlavors] = useState<Flavor[]>([]);
  const [diameters, setDiameters] = useState<Diameter[]>([]);

  // This state will now drive the fetching of flavors and diameters
  const [productCategoryId, setProductCategoryId] = useState<string>("");

  const [isLoading, setIsLoading] = useState(true);
  const [isDependentLoading, setIsDependentLoading] = useState(false); // For flavors/diameters
  const [error, setError] = useState<string | null>(null);

  // --- STEP 1: Fetch the main product and static data ---
  useEffect(() => {
    if (id) {
      const fetchPrimaryData = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const [productRes, categoriesRes, allergensRes] = await Promise.all([
            fetch(`/api/products/${id}`),
            fetch("/api/categories"),
            fetch("/api/allergens"),
          ]);

          if (!productRes.ok || !categoriesRes.ok || !allergensRes.ok) {
            throw new Error("Failed to fetch primary product data.");
          }

          const productData = await productRes.json();
          setProduct(productData);
          setCategories(await categoriesRes.json());
          setAllergens(await allergensRes.json());

          // Set the initial category ID, which will trigger the next useEffect
          setProductCategoryId(productData.category._id.toString());
        } catch (err: unknown) {
          if (err instanceof Error) setError(err.message);
          setIsLoading(false); // Stop loading if primary fetch fails
        }
      };
      fetchPrimaryData();
    }
  }, [id]);

  // --- STEP 2: Fetch dependent data (flavors/diameters) whenever the category changes ---
  useEffect(() => {
    if (!productCategoryId) return; // Don't fetch if no category is selected

    const fetchDependentData = async () => {
      setIsDependentLoading(true);
      setError(null); // Clear previous errors
      try {
        // Your API must support filtering via query parameters
        const [flavorsRes, diametersRes] = await Promise.all([
          fetch(`/api/flavors?categoryId=${productCategoryId}`),
          fetch(`/api/diameters?categoryId=${productCategoryId}`),
        ]);

        if (!flavorsRes.ok || !diametersRes.ok) {
          throw new Error(
            "Failed to fetch flavors or diameters for the selected category."
          );
        }

        setFlavors(await flavorsRes.json());
        setDiameters(await diametersRes.json());
      } catch (err: unknown) {
        if (err instanceof Error) setError(err.message);
      } finally {
        setIsLoading(false); // All initial data is now loaded
        setIsDependentLoading(false);
      }
    };

    fetchDependentData();
  }, [productCategoryId]); // This effect re-runs every time the category ID changes

  const handleUpdateProduct = async (productData: ProductFormData) => {
    // This function remains the same, it correctly uses productCategoryId
    try {
      const response = await fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...productData, categoryId: productCategoryId }),
      });

      if (!response.ok) {
        throw new Error("Failed to update product");
      }

      alert("Product updated successfully!");
      router.push("/admin/products");
      router.refresh();
    } catch (err) {
      if (err instanceof Error) alert(`Error: ${err.message}`);
      console.error(err);
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <p className="text-red-500">Error: {error}</p>;

  return (
    <section>
      <h1 className="text-3xl font-heading mb-6">Edit Product: {product?.name}</h1>
      {product && (
        <ProductForm
          existingProduct={product}
          onFormSubmit={handleUpdateProduct}
          categories={categories}
          flavors={flavors} // Now passing the filtered list
          diameters={diameters} // Now passing the filtered list
          allergens={allergens}
          categoryId={productCategoryId}
          onCategoryChange={setProductCategoryId} // This now triggers a data refetch!
          isSubmitting={isDependentLoading} // Optionally disable form while new options load
        />
      )}
    </section>
  );
};

export default EditProductPage;
