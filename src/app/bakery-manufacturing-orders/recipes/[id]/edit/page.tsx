"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import RecipeForm from "@/components/admin/recipes/RecipeForm";
import {
  serializedRecipeToFormValues,
  sanitizeRecipeFormValues,
  type RecipeFormValues,
  type SerializedRecipe,
} from "@/lib/validation/recipe";
import type { Diameter, Flavor, IShape, ProductCategory } from "@/types";
import { Button } from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/Spinner";
import { useAlert } from "@/contexts/AlertContext";

export default function EditRecipePage() {
  const params = useParams();
  const router = useRouter();
  const { showAlert } = useAlert();
  const id = params.id as string;

  const [initialValues, setInitialValues] = useState<RecipeFormValues | null>(
    null
  );
  const [recipeName, setRecipeName] = useState("");
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [flavors, setFlavors] = useState<Flavor[]>([]);
  const [diameters, setDiameters] = useState<Diameter[]>([]);
  const [shapes, setShapes] = useState<IShape[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        const [recipeRes, categoriesRes, flavorsRes, diametersRes, shapesRes] =
          await Promise.all([
            fetch(`/api/admin/recipes/${id}`),
            fetch("/api/admin/categories"),
            fetch("/api/admin/flavors"),
            fetch("/api/admin/diameters"),
            fetch("/api/admin/shapes"),
          ]);

        if (
          !recipeRes.ok ||
          !categoriesRes.ok ||
          !flavorsRes.ok ||
          !diametersRes.ok ||
          !shapesRes.ok
        ) {
          throw new Error("Failed to load recipe data");
        }

        const recipe = (await recipeRes.json()) as SerializedRecipe;
        setRecipeName(recipe.name);
        setInitialValues(serializedRecipeToFormValues(recipe));
        setCategories(await categoriesRes.json());
        setFlavors(await flavorsRes.json());
        setDiameters(await diametersRes.json());
        setShapes(await shapesRes.json());
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Failed to load recipe");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleUpdate = useCallback(
    async (values: RecipeFormValues) => {
      setIsSubmitting(true);
      try {
        const response = await fetch(`/api/admin/recipes/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sanitizeRecipeFormValues(values)),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to update recipe");
        }

        showAlert("Recipe updated successfully", "success");
        router.push("/bakery-manufacturing-orders/recipes");
      } catch (err) {
        console.error(err);
        showAlert(
          err instanceof Error ? err.message : "Failed to update recipe",
          "error"
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [id, router, showAlert]
  );

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !initialValues) {
    return (
      <div className="space-y-4">
        <Link href="/bakery-manufacturing-orders/recipes">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Recipes
          </Button>
        </Link>
        <p className="text-error">{error ?? "Recipe not found."}</p>
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
          Edit Recipe: {recipeName}
        </h1>
      </div>

      <RecipeForm
        initialValues={initialValues}
        onSubmit={handleUpdate}
        isSubmitting={isSubmitting}
        submitLabel="Update Recipe"
        categories={categories}
        flavors={flavors}
        diameters={diameters}
        shapes={shapes}
      />
    </div>
  );
}
