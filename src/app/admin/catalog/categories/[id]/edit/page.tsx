"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProductCategory } from "@/types";
import CategoryForm from "@/components/admin/CategoryForm";
import Spinner from "@/components/ui/Spinner";

const EditCategoryPage = () => {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [category, setCategory] = useState<ProductCategory | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      fetch(`/api/admin/categories/${id}`)
        .then((res) => res.json())
        .then((data) => setCategory(data));
    }
  }, [id]);

  const handleUpdate = async (formData: any) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Failed to update category");
      
      router.push("/admin/categories");
    } catch (err) {
        console.error(err);
        alert("Failed to update category");
    } finally {
        setIsSubmitting(false);
    }
  };

  if (!category) return <Spinner />;

  return (
    <section>
      <CategoryForm
        existingCategory={category}
        onSubmit={handleUpdate}
        isSubmitting={isSubmitting}
      />
    </section>
  );
};
export default EditCategoryPage;
