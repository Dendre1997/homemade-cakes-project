"use client";

import { useCallback, useEffect } from "react";
import {
  useForm,
  useFieldArray,
  Controller,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, Loader2 } from "lucide-react";
import AiRecipeParser from "@/components/admin/recipes/AiRecipeParser";
import type { RecipeParseFormApply } from "@/lib/ai/schemas/recipeParse";
import {
  createEmptyComponent,
  createEmptyIngredient,
  createRecipeSchema,
  getDefaultRecipeFormValues,
  RECIPE_UNITS,
  type RecipeFormValues,
} from "@/lib/validation/recipe";
import type { Diameter, Flavor, IShape, ProductCategory } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Label } from "@/components/ui/Label";
import { Checkbox } from "@/components/ui/Checkbox";
import { Switch } from "@/components/ui/Switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";

interface RecipeFormProps {
  initialValues?: RecipeFormValues;
  onSubmit: (values: RecipeFormValues) => Promise<void>;
  isSubmitting?: boolean;
  submitLabel?: string;
  categories: ProductCategory[];
  flavors: Flavor[];
  diameters: Diameter[];
  shapes: IShape[];
}

const NONE_SELECT_VALUE = "__none__";

interface ComponentFieldsProps {
  componentIndex: number;
  control: Control<RecipeFormValues>;
  register: UseFormRegister<RecipeFormValues>;
  errors: FieldErrors<RecipeFormValues>;
  onRemoveComponent: () => void;
  canRemoveComponent: boolean;
}

function ComponentFields({
  componentIndex,
  control,
  register,
  errors,
  onRemoveComponent,
  canRemoveComponent,
}: ComponentFieldsProps) {
  const {
    fields: ingredientFields,
    append: appendIngredient,
    remove: removeIngredient,
  } = useFieldArray({
    control,
    name: `components.${componentIndex}.ingredients`,
  });

  const componentErrors = errors.components?.[componentIndex];

  return (
    <div className="rounded-lg border border-accent/20 bg-subtleBackground/40 p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <Label htmlFor={`components.${componentIndex}.name`}>
            Component Name *
          </Label>
          <Input
            id={`components.${componentIndex}.name`}
            {...register(`components.${componentIndex}.name`)}
            placeholder="Sponge, Custard, Assembly…"
            className="border-accent/30 bg-background"
          />
          {componentErrors?.name && (
            <p className="text-sm text-error">{componentErrors.name.message}</p>
          )}
        </div>
        {canRemoveComponent && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-error hover:text-error mt-7"
            onClick={onRemoveComponent}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`components.${componentIndex}.instructions`}>
          Preparation Instructions
        </Label>
        <Textarea
          id={`components.${componentIndex}.instructions`}
          rows={4}
          {...register(`components.${componentIndex}.instructions`)}
          placeholder="Mix, bake, chill, or assemble steps for this component…"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-muted-foreground">Ingredients</p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => appendIngredient(createEmptyIngredient())}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Ingredient
          </Button>
        </div>

        {componentErrors?.ingredients?.message && (
          <p className="text-sm text-error">
            {componentErrors.ingredients.message}
          </p>
        )}

        {ingredientFields.map((ingredientField, ingredientIndex) => (
          <div
            key={ingredientField.id}
            className="rounded-lg border border-border bg-background p-3 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                Ingredient {ingredientIndex + 1}
              </span>
              {ingredientFields.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-error hover:text-error h-7 px-2"
                  onClick={() => removeIngredient(ingredientIndex)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            <input
              type="hidden"
              {...register(
                `components.${componentIndex}.ingredients.${ingredientIndex}.id`
              )}
            />

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2 md:col-span-2">
                <Label
                  htmlFor={`components.${componentIndex}.ingredients.${ingredientIndex}.name`}
                >
                  Name *
                </Label>
                <Input
                  id={`components.${componentIndex}.ingredients.${ingredientIndex}.name`}
                  {...register(
                    `components.${componentIndex}.ingredients.${ingredientIndex}.name`
                  )}
                  placeholder="All-purpose flour"
                />
                {componentErrors?.ingredients?.[ingredientIndex]?.name && (
                  <p className="text-sm text-error">
                    {
                      componentErrors.ingredients[ingredientIndex]?.name
                        ?.message
                    }
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor={`components.${componentIndex}.ingredients.${ingredientIndex}.quantity`}
                >
                  Quantity *
                </Label>
                <Input
                  id={`components.${componentIndex}.ingredients.${ingredientIndex}.quantity`}
                  type="number"
                  step="any"
                  min="0"
                  {...register(
                    `components.${componentIndex}.ingredients.${ingredientIndex}.quantity`,
                    { valueAsNumber: true }
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Unit *</Label>
                <Controller
                  name={`components.${componentIndex}.ingredients.${ingredientIndex}.unit`}
                  control={control}
                  render={({ field: unitField }) => (
                    <Select
                      value={unitField.value}
                      onValueChange={unitField.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RECIPE_UNITS.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Controller
                name={`components.${componentIndex}.ingredients.${ingredientIndex}.isScalable`}
                control={control}
                render={({ field: scalableField }) => (
                  <Checkbox
                    id={`components.${componentIndex}.ingredients.${ingredientIndex}.isScalable`}
                    checked={scalableField.value}
                    onCheckedChange={(checked) =>
                      scalableField.onChange(checked === true)
                    }
                  />
                )}
              />
              <Label
                htmlFor={`components.${componentIndex}.ingredients.${ingredientIndex}.isScalable`}
              >
                Scales with pan size
              </Label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RecipeForm({
  initialValues,
  onSubmit,
  isSubmitting = false,
  submitLabel = "Save Recipe",
  categories,
  flavors,
  diameters,
  shapes,
}: RecipeFormProps) {
  const form = useForm<RecipeFormValues>({
    resolver: zodResolver(createRecipeSchema),
    defaultValues: initialValues ?? getDefaultRecipeFormValues(),
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = form;

  const {
    fields: componentFields,
    append: appendComponent,
    remove: removeComponent,
    replace: replaceComponents,
  } = useFieldArray({
    control,
    name: "components",
  });

  const handleApplyParsed = useCallback(
    (parsed: RecipeParseFormApply) => {
      setValue("name", parsed.name);
      setValue("description", parsed.description);
      setValue("yield.sizeLabel", parsed.yield.sizeLabel);
      setValue("yield.panDiameterInches", parsed.yield.panDiameterInches);

      if (parsed.yield.targetWeightGrams !== undefined) {
        setValue("yield.targetWeightGrams", parsed.yield.targetWeightGrams);
      }
      if (parsed.yield.panSideInches !== undefined) {
        setValue("yield.panSideInches", parsed.yield.panSideInches);
      }
      if (parsed.yield.panHeightInches !== undefined) {
        setValue("yield.panHeightInches", parsed.yield.panHeightInches);
      }
      if (parsed.yield.layers !== undefined) {
        setValue("yield.layers", parsed.yield.layers);
      }
      if (parsed.yield.servings !== undefined) {
        setValue("yield.servings", parsed.yield.servings);
      }
      if (parsed.yield.unitCount !== undefined) {
        setValue("yield.unitCount", parsed.yield.unitCount);
      }

      replaceComponents(parsed.components);

      if (parsed.activeTimeMinutes !== undefined) {
        setValue("activeTimeMinutes", parsed.activeTimeMinutes);
      }
      if (parsed.bakeTimeMinutes !== undefined) {
        setValue("bakeTimeMinutes", parsed.bakeTimeMinutes);
      }
      if (parsed.notes) {
        setValue("notes", parsed.notes);
      }
    },
    [replaceComponents, setValue]
  );

  useEffect(() => {
    if (initialValues) {
      reset(initialValues);
    }
  }, [initialValues, reset]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-4xl">
      <AiRecipeParser onApply={handleApplyParsed} />

      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Name and metadata used in the admin catalog and recipe scaler.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Recipe Name *</Label>
              <Input id="name" {...register("name")} placeholder="Vanilla cake" />
              {errors.name && (
                <p className="text-sm text-error">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug (optional)</Label>
              <Input
                id="slug"
                {...register("slug")}
                placeholder="Auto-generated from name"
              />
              {errors.slug && (
                <p className="text-sm text-error">{errors.slug.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <Switch
                  id="isActive"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <Label htmlFor="isActive">Active recipe</Label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Category (optional)</Label>
              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? NONE_SELECT_VALUE}
                    onValueChange={(value) =>
                      field.onChange(
                        value === NONE_SELECT_VALUE ? undefined : value
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_SELECT_VALUE}>None</SelectItem>
                      {categories.map((category) => (
                        <SelectItem
                          key={category._id.toString()}
                          value={category._id.toString()}
                        >
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Flavor (optional)</Label>
              <Controller
                name="flavorId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? NONE_SELECT_VALUE}
                    onValueChange={(value) =>
                      field.onChange(
                        value === NONE_SELECT_VALUE ? undefined : value
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select flavor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_SELECT_VALUE}>None</SelectItem>
                      {flavors.map((flavor) => (
                        <SelectItem
                          key={flavor._id.toString()}
                          value={flavor._id.toString()}
                        >
                          {flavor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              rows={3}
              {...register("description")}
              placeholder="Brief notes about this tech card…"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Yield & Pan Size</CardTitle>
          <CardDescription>
            Pan diameter in inches is required for area-based scaling math.
            Target weight captures the finished batch weight when the source
            recipe states one (e.g. 2.5 kg total).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="yield.sizeLabel">Size Label *</Label>
              <Input
                id="yield.sizeLabel"
                {...register("yield.sizeLabel")}
                placeholder='e.g. 8" round, 2 layers'
              />
              {errors.yield?.sizeLabel && (
                <p className="text-sm text-error">
                  {errors.yield.sizeLabel.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="yield.panDiameterInches">
                Pan Diameter (inches) *
              </Label>
              <Input
                id="yield.panDiameterInches"
                type="number"
                step="0.25"
                min="0"
                {...register("yield.panDiameterInches", { valueAsNumber: true })}
              />
              {errors.yield?.panDiameterInches && (
                <p className="text-sm text-error">
                  {errors.yield.panDiameterInches.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="yield.targetWeightGrams">
                Target Weight (grams)
              </Label>
              <Input
                id="yield.targetWeightGrams"
                type="number"
                step="1"
                min="0"
                {...register("yield.targetWeightGrams", { valueAsNumber: true })}
                placeholder="e.g. 2500"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="yield.panSideInches">Pan Side (inches)</Label>
              <Input
                id="yield.panSideInches"
                type="number"
                step="0.25"
                min="0"
                {...register("yield.panSideInches", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="yield.panHeightInches">Pan Height (inches)</Label>
              <Input
                id="yield.panHeightInches"
                type="number"
                step="0.25"
                min="0"
                {...register("yield.panHeightInches", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="yield.layers">Layers</Label>
              <Input
                id="yield.layers"
                type="number"
                min="1"
                step="1"
                {...register("yield.layers", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="yield.servings">Servings</Label>
              <Input
                id="yield.servings"
                type="number"
                min="1"
                step="1"
                {...register("yield.servings", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="yield.unitCount">Unit Count</Label>
              <Input
                id="yield.unitCount"
                type="number"
                min="1"
                step="1"
                {...register("yield.unitCount", { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Catalog Diameter (optional)</Label>
              <Controller
                name="yield.diameterId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? NONE_SELECT_VALUE}
                    onValueChange={(value) =>
                      field.onChange(
                        value === NONE_SELECT_VALUE ? undefined : value
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Link to diameter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_SELECT_VALUE}>None</SelectItem>
                      {diameters.map((diameter) => (
                        <SelectItem
                          key={diameter._id.toString()}
                          value={diameter._id.toString()}
                        >
                          {diameter.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Catalog Shape (optional)</Label>
              <Controller
                name="yield.shapeId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? NONE_SELECT_VALUE}
                    onValueChange={(value) =>
                      field.onChange(
                        value === NONE_SELECT_VALUE ? undefined : value
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Link to shape" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_SELECT_VALUE}>None</SelectItem>
                      {shapes.map((shape) => (
                        <SelectItem
                          key={shape._id.toString()}
                          value={shape._id.toString()}
                        >
                          {shape.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Tech Card Components</CardTitle>
            <CardDescription>
              Each component is a sub-recipe with its own ingredients and
              preparation instructions (Sponge, Custard, Assembly, etc.).
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => appendComponent(createEmptyComponent())}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Component
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {errors.components?.message && (
            <p className="text-sm text-error">{errors.components.message}</p>
          )}

          {componentFields.map((componentField, componentIndex) => (
            <ComponentFields
              key={componentField.id}
              componentIndex={componentIndex}
              control={control}
              register={register}
              errors={errors}
              onRemoveComponent={() => removeComponent(componentIndex)}
              canRemoveComponent={componentFields.length > 1}
            />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Timing & Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="activeTimeMinutes">Active Time (minutes)</Label>
              <Input
                id="activeTimeMinutes"
                type="number"
                min="0"
                step="1"
                {...register("activeTimeMinutes", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bakeTimeMinutes">Bake Time (minutes)</Label>
              <Input
                id="bakeTimeMinutes"
                type="number"
                min="0"
                step="1"
                {...register("bakeTimeMinutes", { valueAsNumber: true })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Kitchen Notes (optional)</Label>
            <Textarea
              id="notes"
              rows={3}
              {...register("notes")}
              placeholder="Cross-cutting tips, storage, service notes…"
            />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          submitLabel
        )}
      </Button>
    </form>
  );
}
