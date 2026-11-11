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
  Collection,
  CatalogSet,
} from "@/types";
import ProductForm from "@/components/admin/ProductForm";
import LoadingSpinner from "@/components/ui/Spinner";
import { useConfirmation } from "@/contexts/ConfirmationContext";
import { useAlert } from "@/contexts/AlertContext";
import { Button } from "@/components/ui/Button";
import { ArrowLeft } from "lucide-react";
// Handles fetching all data for editing a product, including 
// dependent data (flavors, diameters etc..) that changes base on category

const EditProductPage = () => {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const showConfirmation = useConfirmation()
  const {showAlert } = useAlert()

  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [allergens, setAllergens] = useState<Allergen[]>([]);

  const [flavors, setFlavors] = useState<Flavor[]>([]);
  const [diameters, setDiameters] = useState<Diameter[]>([]);
  const [sets, setSets] = useState<CatalogSet[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);

  // This id acts as the trigger for the dependent data fetch(Step 2)
  const [productCategoryId, setProductCategoryId] = useState<string>("");

  const [isLoading, setIsLoading] = useState(true);
  const [isDependentLoading, setIsDependentLoading] = useState(false); //For category changes
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      const fetchPrimaryData = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const [productRes, categoriesRes, allergensRes, collectionsRes] =
            await Promise.all([
              fetch(`/api/admin/products/${id}`),
              fetch("/api/admin/categories"),
              fetch("/api/admin/allergens"),
              fetch("/api/admin/collections"),
            ]);

          if (!productRes.ok || !categoriesRes.ok || !allergensRes.ok) {
            throw new Error("Failed to fetch primary product data.");
          }

          const productData = await productRes.json();
          setProduct(productData);
          setCategories(await categoriesRes.json());
          setAllergens(await allergensRes.json());
          setCollections(await collectionsRes.json());

          // This state update trigger the *next* useEffect to fetch flavors/diameters
          setProductCategoryId(productData.category._id.toString());
        } catch (err: unknown) {
          if (err instanceof Error) setError(err.message);
          setIsLoading(false); // Stop loading if primary fetch fails
        }
      };
      fetchPrimaryData();
    }
  }, [id]);

  useEffect(() => {
    if (!productCategoryId) return;

    const fetchDependentData = async () => {
      setIsDependentLoading(true);
      setError(null);
      try {
        const [flavorsRes, diametersRes, setsRes] = await Promise.all([
          fetch(`/api/admin/flavors?categoryId=${productCategoryId}`),
          fetch(`/api/admin/diameters?categoryId=${productCategoryId}`),
          fetch(`/api/admin/sets?categoryId=${productCategoryId}`),
        ]);

        if (!flavorsRes.ok || !diametersRes.ok || !setsRes.ok) {
          throw new Error(
            "Failed to fetch flavors, diameters, or sets for the selected category."
          );
        }

        setFlavors(await flavorsRes.json());
        setDiameters(await diametersRes.json());
        setSets(await setsRes.json());
      } catch (err: unknown) {
        if (err instanceof Error) setError(err.message);
      } finally {
        setIsLoading(false);
        setIsDependentLoading(false);
      }
    };

    fetchDependentData();
  }, [productCategoryId]);

  const handleUpdateProduct = async (productData: ProductFormData) => {
    const confirmed = await showConfirmation({
      title: "Update Product?",
      body: "Are you sure you want to save these changes?",
      confirmText: "Update",
      variant: "primary",
    });

    if (!confirmed) {
      return;
    }
    try {
      const response = await fetch(`/api/admin/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...productData, categoryId: productCategoryId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to update product");
      }

      // Alert handled by ProductForm
      router.push("/bakery-manufacturing-orders/products");
      router.refresh();
    } catch (err) {
      console.error(err);
      throw err; // Propagate to ProductForm
    }
  };

// Render Guards 
  if (isLoading) return <LoadingSpinner />;
  if (error) return <p className="text-red-500">Error: {error}</p>;

  return (
    <section>
      <div className="mb-6">
                <Button 
                  variant="ghost" 
                  className="mb-3 h-11 gap-2 rounded-xl px-2 text-sm text-primary/65 shadow-none hover:text-primary sm:h-10" 
                  onClick={() => router.push('/bakery-manufacturing-orders/products')}
                >
                   <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden /> Back to Products
        </Button>
      <h1 className="min-w-0 truncate font-heading text-2xl font-bold tracking-tight text-primary text-balance sm:text-3xl">
        Edit Product: {product?.name}
      </h1>
        </div>
      {product && (
        <ProductForm
          existingProduct={product}
          onFormSubmit={handleUpdateProduct}
          categories={categories}
          flavors={flavors}
          diameters={diameters}
          sets={sets}
          allergens={allergens}
          categoryId={productCategoryId}
          onCategoryChange={setProductCategoryId}
          isSubmitting={isDependentLoading}
          collections={collections}
        />
      )}
    </section>
  );
};

export default EditProductPage;
