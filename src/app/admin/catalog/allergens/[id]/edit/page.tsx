"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Allergen } from "@/types";
import AllergenForm from "@/components/admin/AllergenForm";
import Spinner from "@/components/ui/Spinner";

const EditAllergenPage = () => {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [allergen, setAllergen] = useState<Allergen | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      fetch(`/api/admin/allergens/${id}`)
        .then((res) => res.json())
        .then((data) => setAllergen(data));
    }
  }, [id]);

  const handleUpdate = async (formData: { name: string }) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/allergens/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        router.push("/admin/catalog/allergens");
      } else {
        alert("Failed to update allergen");
      }
    } catch (error) {
      console.error(error);
      alert("Error updating allergen");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!allergen) return <Spinner />;

  return (
    <section>
      <AllergenForm
        existingAllergen={allergen}
        onSubmit={handleUpdate}
        isSubmitting={isSubmitting}
      />
    </section>
  );
};
export default EditAllergenPage;
