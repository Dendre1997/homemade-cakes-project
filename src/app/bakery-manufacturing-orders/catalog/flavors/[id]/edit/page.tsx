"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Flavor, ProductCategory } from "@/types";
import FlavorForm from "@/components/admin/FlavorForm";
import LoadingSpinner from "@/components/ui/Spinner";

const EditFlavorPage = () => {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [flavor, setFlavor] = useState<Flavor | null>(null);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      const fetchInitialData = async () => {
        try {
          const [flavorRes, categoriesRes] = await Promise.all([
            fetch(`/api/admin/flavors/${id}`),
            fetch("/api/admin/categories"),
          ]);

          if (!flavorRes.ok || !categoriesRes.ok) {
            throw new Error("Failed to fetch initial data");
          }

          const flavorData = await flavorRes.json();
          const categoriesData = await categoriesRes.json();

          setFlavor(flavorData);
          setCategories(categoriesData);
        } catch (err: unknown) {
          if (err instanceof Error) setError(err.message);
        } finally {
          setIsLoading(false);
        }
      };
      fetchInitialData();
    }
  }, [id]);

  const handleUpdate = async (formData: any) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/flavors/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Failed to update flavor");
      
      router.push("/admin/flavors");
    } catch (err) {
        console.error(err);
        alert("Failed to update flavor");
    } finally {
        setIsSubmitting(false);
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <p className="text-red-500">Error: {error}</p>;

  return (
    <section>
      <h1 className="text-3xl font-heading mb-6">
        Edit Flavor: {flavor?.name}
      </h1>
      <FlavorForm
        existingFlavor={flavor}
        onSubmit={handleUpdate}
        isSubmitting={isSubmitting}
        categories={categories}
      />
    </section>
  );
};
export default EditFlavorPage;
