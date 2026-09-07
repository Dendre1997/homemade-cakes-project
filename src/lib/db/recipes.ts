import { ObjectId } from "mongodb";
import { generateSlug } from "@/lib/utils";
import type {
  CreateRecipeInput,
  RecipeComponent,
  RecipeIngredient,
  SerializedRecipe,
  UpdateRecipeInput,
} from "@/lib/validation/recipe";

/** Ingredient row as stored in MongoDB (allergenIds are ObjectIds). */
export type StoredRecipeIngredient = Omit<RecipeIngredient, "allergenIds"> & {
  allergenIds?: ObjectId[];
};

export interface StoredRecipeComponent {
  name: string;
  ingredients: StoredRecipeIngredient[];
  instructions?: string;
}

export interface RecipeDocument {
  _id?: ObjectId;
  name: string;
  slug: string;
  isActive: boolean;
  categoryId?: ObjectId;
  flavorId?: ObjectId;
  description?: string;
  yield: CreateRecipeInput["yield"];
  components: StoredRecipeComponent[];
  activeTimeMinutes?: number;
  bakeTimeMinutes?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

function resolveSlug(input: CreateRecipeInput | UpdateRecipeInput): string {
  return generateSlug(input.slug?.trim() || input.name);
}

function mapIngredients(
  ingredients: RecipeIngredient[]
): StoredRecipeIngredient[] {
  return ingredients.map((ingredient) => {
    const { allergenIds, ...rest } = ingredient;
    return {
      ...rest,
      ...(allergenIds?.length
        ? { allergenIds: allergenIds.map((id) => new ObjectId(id)) }
        : {}),
    };
  });
}

function mapComponents(
  components: RecipeComponent[]
): StoredRecipeComponent[] {
  return components.map((component) => ({
    name: component.name.trim(),
    ingredients: mapIngredients(component.ingredients),
    ...(component.instructions?.trim()
      ? { instructions: component.instructions.trim() }
      : {}),
  }));
}

export function buildRecipeDocument(
  input: CreateRecipeInput,
  timestamps: { createdAt: Date; updatedAt: Date }
): RecipeDocument {
  return {
    name: input.name.trim(),
    slug: resolveSlug(input),
    isActive: input.isActive,
    ...(input.categoryId ? { categoryId: new ObjectId(input.categoryId) } : {}),
    ...(input.flavorId ? { flavorId: new ObjectId(input.flavorId) } : {}),
    ...(input.description?.trim()
      ? { description: input.description.trim() }
      : {}),
    yield: input.yield,
    components: mapComponents(input.components),
    ...(input.activeTimeMinutes !== undefined
      ? { activeTimeMinutes: input.activeTimeMinutes }
      : {}),
    ...(input.bakeTimeMinutes !== undefined
      ? { bakeTimeMinutes: input.bakeTimeMinutes }
      : {}),
    ...(input.notes?.trim() ? { notes: input.notes.trim() } : {}),
    createdAt: timestamps.createdAt,
    updatedAt: timestamps.updatedAt,
  };
}

export function buildRecipeUpdateDocument(
  input: UpdateRecipeInput,
  updatedAt: Date
): Omit<RecipeDocument, "_id" | "createdAt"> {
  const doc = buildRecipeDocument(input, {
    createdAt: updatedAt,
    updatedAt,
  });

  return {
    name: doc.name,
    slug: doc.slug,
    isActive: doc.isActive,
    ...(doc.categoryId ? { categoryId: doc.categoryId } : {}),
    ...(doc.flavorId ? { flavorId: doc.flavorId } : {}),
    ...(doc.description ? { description: doc.description } : {}),
    yield: doc.yield,
    components: doc.components,
    ...(doc.activeTimeMinutes !== undefined
      ? { activeTimeMinutes: doc.activeTimeMinutes }
      : {}),
    ...(doc.bakeTimeMinutes !== undefined
      ? { bakeTimeMinutes: doc.bakeTimeMinutes }
      : {}),
    ...(doc.notes ? { notes: doc.notes } : {}),
    updatedAt,
  };
}

export function serializeRecipe(
  doc: RecipeDocument & { _id: ObjectId }
): SerializedRecipe {
  return {
    _id: doc._id.toString(),
    name: doc.name,
    slug: doc.slug,
    isActive: doc.isActive,
    categoryId: doc.categoryId?.toString(),
    flavorId: doc.flavorId?.toString(),
    description: doc.description,
    yield: doc.yield,
    components: doc.components.map((component) => ({
      name: component.name,
      instructions: component.instructions,
      ingredients: component.ingredients.map((ingredient) => ({
        ...ingredient,
        allergenIds: ingredient.allergenIds?.map((id) => id.toString()),
      })),
    })),
    activeTimeMinutes: doc.activeTimeMinutes,
    bakeTimeMinutes: doc.bakeTimeMinutes,
    notes: doc.notes,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}
