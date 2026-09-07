"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Edit, Plus, Trash2 } from "lucide-react";
import {
  countSerializedRecipeIngredients,
  type SerializedRecipe,
} from "@/lib/validation/recipe";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import LoadingSpinner from "@/components/ui/Spinner";
import { useAlert } from "@/contexts/AlertContext";
import { useConfirmation } from "@/contexts/ConfirmationContext";

export default function AdminRecipesPage() {
  const { showAlert } = useAlert();
  const showConfirmation = useConfirmation();

  const [recipes, setRecipes] = useState<SerializedRecipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchRecipes = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/recipes");
      if (!response.ok) {
        throw new Error("Failed to fetch recipes");
      }
      setRecipes(await response.json());
    } catch (error) {
      console.error(error);
      showAlert("Failed to load recipes", "error");
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  const filteredRecipes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return recipes;
    return recipes.filter(
      (recipe) =>
        recipe.name.toLowerCase().includes(query) ||
        recipe.slug.toLowerCase().includes(query) ||
        recipe.yield.sizeLabel.toLowerCase().includes(query)
    );
  }, [recipes, searchQuery]);

  const handleDelete = async (recipe: SerializedRecipe) => {
    const confirmed = await showConfirmation({
      title: "Delete Recipe?",
      body: (
        <p>
          Are you sure you want to delete{" "}
          <strong>&quot;{recipe.name}&quot;</strong>? This cannot be undone.
        </p>
      ),
      confirmText: "Delete",
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/admin/recipes/${recipe._id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete recipe");
      }

      setRecipes((prev) => prev.filter((item) => item._id !== recipe._id));
      showAlert("Recipe deleted successfully", "success");
    } catch (error) {
      console.error(error);
      showAlert(
        error instanceof Error ? error.message : "Error deleting recipe",
        "error"
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-primary">
            Recipes
          </h1>
          <p className="text-muted-foreground">
            Base recipes for kitchen prep and AI scaling.
          </p>
        </div>
        <Link href="/bakery-manufacturing-orders/recipes/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create New Recipe
          </Button>
        </Link>
      </div>

      <div className="max-w-md">
        <Input
          placeholder="Search recipes..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-subtleBackground">
            <tr>
              <th className="p-4 font-medium text-muted-foreground">Name</th>
              <th className="p-4 font-medium text-muted-foreground">Yield</th>
              <th className="p-4 font-medium text-muted-foreground">
                Components
              </th>
              <th className="p-4 font-medium text-muted-foreground">Status</th>
              <th className="p-4 text-right font-medium text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredRecipes.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="p-8 text-center text-muted-foreground"
                >
                  {recipes.length === 0
                    ? "No recipes yet. Create your first one!"
                    : "No recipes match your search."}
                </td>
              </tr>
            ) : (
              filteredRecipes.map((recipe) => (
                <tr
                  key={recipe._id}
                  className="transition-colors hover:bg-subtleBackground/50"
                >
                  <td className="p-4">
                    <div className="font-medium text-primary">{recipe.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {recipe.slug}
                    </div>
                  </td>
                  <td className="p-4 text-muted-foreground">
                    <div>{recipe.yield.sizeLabel}</div>
                    <div className="text-xs">
                      {recipe.yield.panDiameterInches}&quot; pan
                    </div>
                  </td>
                  <td className="p-4 text-muted-foreground">
                    <div>{recipe.components.length} components</div>
                    <div className="text-xs">
                      {countSerializedRecipeIngredients(recipe)} ingredients
                    </div>
                  </td>
                  <td className="p-4">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-bold ${
                        recipe.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {recipe.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/bakery-manufacturing-orders/recipes/${recipe._id}/edit`}
                      >
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-8 w-8 p-0"
                          title="Edit recipe"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-error hover:text-error"
                        title="Delete recipe"
                        onClick={() => handleDelete(recipe)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
