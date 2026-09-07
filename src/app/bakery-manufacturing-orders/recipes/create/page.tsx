"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import RecipeForm from "@/components/admin/recipes/RecipeForm";
import {
  sanitizeRecipeFormValues,
  type RecipeFormValues,
} from "@/lib/validation/recipe";
import type { Diameter, Flavor, IShape, ProductCategory } from "@/types";
import { Button } from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/Spinner";
import { useAlert } from "@/contexts/AlertContext";

export default function CreateRecipePage() {
  const router = useRouter();
  const { showAlert } = useAlert();

  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [flavors, setFlavors] = useState<Flavor[]>([]);
  const [diameters, setDiameters] = useState<Diameter[]>([]);
  const [shapes, setShapes] = useState<IShape[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchFormData = async () => {
      try {
        const [categoriesRes, flavorsRes, diametersRes, shapesRes] =
          await Promise.all([
            fetch("/api/admin/categories"),
            fetch("/api/admin/flavors"),
            fetch("/api/admin/diameters"),
            fetch("/api/admin/shapes"),
          ]);

        if (
          !categoriesRes.ok ||
          !flavorsRes.ok ||
          !diametersRes.ok ||
          !shapesRes.ok
        ) {
          throw new Error("Failed to load form options");
        }

        setCategories(await categoriesRes.json());
        setFlavors(await flavorsRes.json());
        setDiameters(await diametersRes.json());
        setShapes(await shapesRes.json());
      } catch (error) {
        console.error(error);
        showAlert("Failed to load form data", "error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchFormData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = useCallback(
    async (values: RecipeFormValues) => {
      setIsSubmitting(true);
      try {
        const response = await fetch("/api/admin/recipes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sanitizeRecipeFormValues(values)),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to create recipe");
        }

        showAlert("Recipe created successfully", "success");
        router.push("/bakery-manufacturing-orders/recipes");
      } catch (error) {
        console.error(error);
        showAlert(
          error instanceof Error ? error.message : "Failed to create recipe",
          "error"
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [router, showAlert]
  );

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/bakery-manufacturing-orders/recipes">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Recipes
          </Button>
        </Link>
        <h1 className="text-3xl font-heading font-bold text-primary">
          Create New Recipe
        </h1>
      </div>

      <RecipeForm
        onSubmit={handleCreate}
        isSubmitting={isSubmitting}
        submitLabel="Create Recipe"
        categories={categories}
        flavors={flavors}
        diameters={diameters}
        shapes={shapes}
      />
    </div>
  );
}
