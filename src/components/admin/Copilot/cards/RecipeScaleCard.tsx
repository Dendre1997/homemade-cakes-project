"use client";

import { ChefHat } from "lucide-react";
import type { ScaleRecipeToolResult } from "@/lib/ai/uiMessage";
import { formatScaleFactor, formatScaledQuantity } from "@/lib/recipes/scale";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

interface RecipeScaleCardProps {
  result: ScaleRecipeToolResult;
  className?: string;
}

export function RecipeScaleCard({ result, className }: RecipeScaleCardProps) {
  if (!result.found) {
    return (
      <div
        className={cn(
          "rounded-large border border-dashed border-border bg-card-background p-md font-body text-small text-primary/60",
          className
        )}
      >
        No recipe matched &quot;{result.recipeQuery}&quot;. Try a different name
        or slug.
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-large border border-border bg-card-background shadow-sm",
        className
      )}
    >
      <div className="border-b border-border bg-subtleBackground px-md py-sm">
        <p className="inline-flex items-center gap-sm font-heading text-h5 text-primary">
          <ChefHat className="h-4 w-4 text-accent" />
          {result.recipeName}
        </p>
        <p className="mt-xs font-body text-small text-primary/60">
          Scaled by {formatScaleFactor(result.scaleFactor)} multiplier ·{" "}
          {result.sourcePanDiameterInches}&quot; → {result.targetPanDiameterInches}
          &quot;
          {result.targetCount > 1 ? ` · ${result.targetCount} batches` : ""}
        </p>
      </div>

      <div className="space-y-md p-md">
        {result.scaledComponents.map((component) => (
          <div key={component.name} className="space-y-sm">
            <h4 className="font-body text-small font-semibold uppercase tracking-wide text-primary/70">
              {component.name}
            </h4>
            <ul className="divide-y divide-border rounded-medium border border-border bg-background">
              {component.ingredients.map((ingredient) => (
                <li
                  key={`${component.name}-${ingredient.name}-${ingredient.unit}`}
                  className="flex items-center justify-between gap-sm px-sm py-2 font-body text-small"
                >
                  <span className="min-w-0 flex-1 text-primary">
                    <span className="font-mono font-semibold text-accent">
                      {formatScaledQuantity(ingredient.quantity, ingredient.unit)}
                    </span>{" "}
                    <span className="text-primary/70">{ingredient.unit}</span>{" "}
                    {ingredient.name}
                  </span>
                  {!ingredient.isScalable && (
                    <Badge
                      variant="secondary"
                      className="shrink-0 text-[10px] uppercase tracking-wide"
                    >
                      Fixed
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RecipeScaleCard;
