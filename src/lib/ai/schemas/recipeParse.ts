import { z } from "zod";
import { recipeUnitSchema } from "@/lib/validation/recipe";
import type { RecipeComponent } from "@/lib/validation/recipe";

export const parseRecipeInputSchema = z.object({
  rawText: z.string().min(1).max(50000),
});

export const recipeParseIngredientSchema = z.object({
  name: z.string().min(1).max(200),
  quantity: z.number().finite().nonnegative(),
  unit: recipeUnitSchema,
  isScalable: z.boolean(),
});

export const recipeParseComponentSchema = z.object({
  name: z.string().min(1).max(200),
  ingredients: z.array(recipeParseIngredientSchema).min(1),
  instructions: z.string().max(8000).nullable(),
});

export const recipeParseYieldSchema = z.object({
  sizeLabel: z.string().min(1).max(120),
  panDiameterInches: z.number().finite().positive(),
  targetWeightGrams: z.number().finite().positive().nullable(),
  panSideInches: z.number().finite().positive().nullable(),
  panHeightInches: z.number().finite().positive().nullable(),
  layers: z.number().int().positive().nullable(),
  servings: z.number().int().positive().nullable(),
  unitCount: z.number().int().positive().nullable(),
});

/**
 * Structured tech-card draft from pasted text — omits categoryId/flavorId
 * because the model cannot resolve catalog ObjectIds.
 *
 * Nullable fields (not optional) satisfy OpenAI Structured Outputs strict mode,
 * which requires every property key in `required`.
 */
export const recipeParseSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(5000).nullable(),
  yield: recipeParseYieldSchema,
  components: z.array(recipeParseComponentSchema).min(1),
  activeTimeMinutes: z.number().int().min(0).nullable(),
  bakeTimeMinutes: z.number().int().min(0).nullable(),
  notes: z.string().max(5000).nullable(),
});

export type ParseRecipeInput = z.infer<typeof parseRecipeInputSchema>;
export type RecipeParseIngredient = z.infer<typeof recipeParseIngredientSchema>;
export type RecipeParseComponent = z.infer<typeof recipeParseComponentSchema>;
export type RecipeParseYield = z.infer<typeof recipeParseYieldSchema>;
export type RecipeParseResult = z.infer<typeof recipeParseSchema>;

function nullToUndefined<T>(value: T | null | undefined): T | undefined {
  return value === null ? undefined : value;
}

/** Maps AI parse output to react-hook-form-safe values (null → undefined / ""). */
export function mapRecipeParseToFormApply(parsed: RecipeParseResult) {
  return {
    name: parsed.name,
    description: parsed.description ?? "",
    notes: parsed.notes ?? "",
    activeTimeMinutes: nullToUndefined(parsed.activeTimeMinutes),
    bakeTimeMinutes: nullToUndefined(parsed.bakeTimeMinutes),
    yield: {
      sizeLabel: parsed.yield.sizeLabel,
      panDiameterInches: parsed.yield.panDiameterInches,
      targetWeightGrams: nullToUndefined(parsed.yield.targetWeightGrams),
      panSideInches: nullToUndefined(parsed.yield.panSideInches),
      panHeightInches: nullToUndefined(parsed.yield.panHeightInches),
      layers: nullToUndefined(parsed.yield.layers),
      servings: nullToUndefined(parsed.yield.servings),
      unitCount: nullToUndefined(parsed.yield.unitCount),
    },
    components: parsed.components.map(
      (component): RecipeComponent => ({
        name: component.name,
        instructions: component.instructions ?? "",
        ingredients: component.ingredients.map((ingredient) => ({
          id:
            typeof crypto !== "undefined"
              ? crypto.randomUUID()
              : `ingredient-${Date.now()}`,
          name: ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          isScalable: ingredient.isScalable,
        })),
      })
    ),
  };
}

export type RecipeParseFormApply = ReturnType<typeof mapRecipeParseToFormApply>;
