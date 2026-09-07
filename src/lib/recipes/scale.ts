import type { RecipeUnit } from "@/lib/validation/recipe";

export interface ScaleRecipeInput {
  name: string;
  yield: {
    panDiameterInches: number;
  };
  components: Array<{
    name: string;
    ingredients: Array<{
      name: string;
      quantity: number;
      unit: RecipeUnit;
      isScalable?: boolean;
    }>;
  }>;
}

export interface ScaleRecipeTargetOptions {
  targetPanDiameterInches: number;
  /** Batch count at target size. Defaults to 1. */
  targetCount?: number;
  /** Batch count in the source recipe. Defaults to 1. */
  sourceCount?: number;
}

export interface ScaledIngredient {
  name: string;
  quantity: number;
  unit: RecipeUnit;
  isScalable: boolean;
  originalQuantity: number;
}

export interface ScaledComponent {
  name: string;
  ingredients: ScaledIngredient[];
}

/**
 * Area-based scale factor for round pans:
 * (targetDiameter² × targetCount) / (sourceDiameter² × sourceCount)
 */
export function calculateScaleFactor(
  sourceDiameter: number,
  targetDiameter: number,
  sourceCount = 1,
  targetCount = 1
): number {
  if (sourceDiameter <= 0 || targetDiameter <= 0) {
    throw new Error("Pan diameters must be positive numbers.");
  }
  if (sourceCount <= 0 || targetCount <= 0) {
    throw new Error("Batch counts must be positive numbers.");
  }

  return (
    (Math.pow(targetDiameter, 2) * targetCount) /
    (Math.pow(sourceDiameter, 2) * sourceCount)
  );
}

function roundScaledQuantity(quantity: number, unit: RecipeUnit): number {
  if (unit === "tsp" || unit === "tbsp") {
    return Math.round(quantity * 4) / 4;
  }
  if (unit === "g" || unit === "kg" || unit === "ml" || unit === "l") {
    return Math.round(quantity);
  }
  return Math.round(quantity);
}

/**
 * Scales every component's ingredients by pan area. Non-scalable ingredients
 * (`isScalable !== true`) pass through unchanged — undefined defaults to false.
 */
export function scaleRecipe(
  recipe: ScaleRecipeInput,
  targetOptions: ScaleRecipeTargetOptions
): ScaledComponent[] {
  const sourceCount = targetOptions.sourceCount ?? 1;
  const targetCount = targetOptions.targetCount ?? 1;

  const factor = calculateScaleFactor(
    recipe.yield.panDiameterInches,
    targetOptions.targetPanDiameterInches,
    sourceCount,
    targetCount
  );

  return recipe.components.map((component) => ({
    name: component.name,
    ingredients: component.ingredients.map((ingredient) => {
      const isScalable = ingredient.isScalable === true;
      const scaledQuantity = isScalable
        ? roundScaledQuantity(ingredient.quantity * factor, ingredient.unit)
        : ingredient.quantity;

      return {
        name: ingredient.name,
        quantity: scaledQuantity,
        unit: ingredient.unit,
        isScalable,
        originalQuantity: ingredient.quantity,
      };
    }),
  }));
}

export function formatScaleFactor(factor: number): string {
  if (!Number.isFinite(factor)) return "—";
  const rounded = Math.round(factor * 100) / 100;
  return `${rounded}×`;
}

export function formatScaledQuantity(quantity: number, unit: RecipeUnit): string {
  if (unit === "tsp" || unit === "tbsp") {
    const rounded = Math.round(quantity * 4) / 4;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
  }
  return String(Math.round(quantity));
}
