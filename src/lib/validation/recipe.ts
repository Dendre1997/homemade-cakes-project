import { z } from "zod";

/** Ingredient units supported by the recipe scaler (Rule #8). */
export const recipeUnitSchema = z.enum([
  "g",
  "kg",
  "ml",
  "l",
  "tsp",
  "tbsp",
  "pcs",
]);

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

const objectIdString = z
  .string()
  .regex(OBJECT_ID_REGEX, "Invalid ObjectId");

export const recipeIngredientSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(200),
  quantity: z.number().finite().nonnegative(),
  unit: recipeUnitSchema,
  isScalable: z.boolean(),
  allergenIds: z.array(objectIdString).optional(),
  costPerUnit: z.number().finite().nonnegative().optional(),
  note: z.string().max(500).optional(),
});

/** Tech-card sub-component (Sponge, Custard, Assembly, etc.). */
export const recipeComponentSchema = z.object({
  name: z.string().min(1).max(200),
  ingredients: z.array(recipeIngredientSchema).min(1),
  instructions: z.string().max(8000).optional(),
});

/**
 * Yield block for the recipe scaler. `panDiameterInches` is required numeric
 * input for round-pan area math — diameters.name alone is not reliable.
 */
export const recipeYieldSchema = z.object({
  sizeLabel: z.string().min(1).max(120),
  diameterId: objectIdString.optional(),
  shapeId: objectIdString.optional(),
  panDiameterInches: z.number().finite().positive(),
  panSideInches: z.number().finite().positive().optional(),
  panHeightInches: z.number().finite().positive().optional(),
  layers: z.number().int().positive().optional(),
  servings: z.number().int().positive().optional(),
  unitCount: z.number().int().positive().optional(),
  /** Finished batch target weight in grams when stated on the source recipe. */
  targetWeightGrams: z.number().finite().positive().optional(),
});

/** Payload for creating a recipe (no server-managed fields). */
export const createRecipeSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).optional(),
  isActive: z.boolean().default(true),
  categoryId: objectIdString.optional(),
  flavorId: objectIdString.optional(),
  description: z.string().max(5000).optional(),
  yield: recipeYieldSchema,
  components: z.array(recipeComponentSchema).min(1),
  activeTimeMinutes: z.number().int().min(0).optional(),
  bakeTimeMinutes: z.number().int().min(0).optional(),
  notes: z.string().max(5000).optional(),
});

/** Full replace on PUT — same required shape as create. */
export const updateRecipeSchema = createRecipeSchema;

export const RECIPE_UNITS = recipeUnitSchema.options;

export type RecipeUnit = z.infer<typeof recipeUnitSchema>;
export type RecipeIngredient = z.infer<typeof recipeIngredientSchema>;
export type RecipeComponent = z.infer<typeof recipeComponentSchema>;
export type RecipeYield = z.infer<typeof recipeYieldSchema>;
export type CreateRecipeInput = z.infer<typeof createRecipeSchema>;
export type UpdateRecipeInput = z.infer<typeof updateRecipeSchema>;
export type RecipeFormValues = z.input<typeof createRecipeSchema>;

/** JSON-safe admin API shape returned by recipe CRUD routes. */
export interface SerializedRecipe {
  _id: string;
  name: string;
  slug: string;
  isActive: boolean;
  categoryId?: string;
  flavorId?: string;
  description?: string;
  yield: RecipeYield;
  components: Array<
    RecipeComponent & {
      ingredients: Array<
        RecipeIngredient & {
          allergenIds?: string[];
        }
      >;
    }
  >;
  activeTimeMinutes?: number;
  bakeTimeMinutes?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export function createEmptyIngredient(): RecipeIngredient {
  return {
    id:
      typeof crypto !== "undefined"
        ? crypto.randomUUID()
        : `ingredient-${Date.now()}`,
    name: "",
    quantity: 0,
    unit: "g",
    isScalable: true,
  };
}

export function createEmptyComponent(): RecipeComponent {
  return {
    name: "",
    ingredients: [createEmptyIngredient()],
    instructions: "",
  };
}

export function getDefaultRecipeFormValues(): RecipeFormValues {
  return {
    name: "",
    isActive: true,
    yield: {
      sizeLabel: "",
      panDiameterInches: 6,
    },
    components: [createEmptyComponent()],
  };
}

export function countSerializedRecipeIngredients(
  recipe: Pick<SerializedRecipe, "components">
): number {
  return recipe.components.reduce(
    (total, component) => total + component.ingredients.length,
    0
  );
}

export function serializedRecipeToFormValues(
  recipe: SerializedRecipe
): RecipeFormValues {
  return {
    name: recipe.name,
    slug: recipe.slug,
    isActive: recipe.isActive,
    categoryId: recipe.categoryId,
    flavorId: recipe.flavorId,
    description: recipe.description,
    yield: recipe.yield,
    components: recipe.components.map((component) => ({
      name: component.name,
      instructions: component.instructions,
      ingredients: component.ingredients.map((ingredient) => ({
        id: ingredient.id,
        name: ingredient.name,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        isScalable: ingredient.isScalable,
        allergenIds: ingredient.allergenIds,
        costPerUnit: ingredient.costPerUnit,
        note: ingredient.note,
      })),
    })),
    activeTimeMinutes: recipe.activeTimeMinutes,
    bakeTimeMinutes: recipe.bakeTimeMinutes,
    notes: recipe.notes,
  };
}

export function sanitizeRecipeFormValues(
  values: RecipeFormValues
): CreateRecipeInput {
  const optionalNumber = (value: number | undefined) =>
    value === undefined || Number.isNaN(value) ? undefined : value;

  const payload = {
    name: values.name.trim(),
    slug: values.slug?.trim() || undefined,
    isActive: values.isActive ?? true,
    categoryId: values.categoryId || undefined,
    flavorId: values.flavorId || undefined,
    description: values.description?.trim() || undefined,
    yield: {
      ...values.yield,
      panSideInches: optionalNumber(values.yield.panSideInches),
      panHeightInches: optionalNumber(values.yield.panHeightInches),
      layers: optionalNumber(values.yield.layers),
      servings: optionalNumber(values.yield.servings),
      unitCount: optionalNumber(values.yield.unitCount),
      targetWeightGrams: optionalNumber(values.yield.targetWeightGrams),
    },
    components: values.components.map((component) => ({
      name: component.name.trim(),
      instructions: component.instructions?.trim() || undefined,
      ingredients: component.ingredients.map((ingredient) => ({
        ...ingredient,
        name: ingredient.name.trim(),
      })),
    })),
    activeTimeMinutes: optionalNumber(values.activeTimeMinutes),
    bakeTimeMinutes: optionalNumber(values.bakeTimeMinutes),
    notes: values.notes?.trim() || undefined,
  };

  return createRecipeSchema.parse(payload);
}

export function formatRecipeValidationError(error: z.ZodError): string {
  return error.issues.map((issue) => issue.message).join("; ");
}

export function isDuplicateKeyError(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  );
}
