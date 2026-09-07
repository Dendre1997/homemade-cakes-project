"use client";

import { useMemo, useState } from "react";
import { useObject } from "@ai-sdk/react";
import type { DeepPartial } from "ai";
import { Loader2, Sparkles, Square, TriangleAlert } from "lucide-react";
import {
  mapRecipeParseToFormApply,
  recipeParseSchema,
  type RecipeParseFormApply,
  type RecipeParseResult,
} from "@/lib/ai/schemas/recipeParse";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { cn } from "@/lib/utils";

function isCompleteParse(
  object: DeepPartial<RecipeParseResult> | undefined
): object is RecipeParseResult {
  if (!object) return false;

  return (
    typeof object.name === "string" &&
    object.name.trim().length > 0 &&
    typeof object.yield?.sizeLabel === "string" &&
    object.yield.sizeLabel.trim().length > 0 &&
    typeof object.yield.panDiameterInches === "number" &&
    object.yield.panDiameterInches > 0 &&
    Array.isArray(object.components) &&
    object.components.length > 0 &&
    object.components.every(
      (component) =>
        component &&
        typeof component.name === "string" &&
        component.name.trim().length > 0 &&
        Array.isArray(component.ingredients) &&
        component.ingredients.length > 0 &&
        component.ingredients.every(
          (ingredient) =>
            ingredient &&
            typeof ingredient.name === "string" &&
            ingredient.name.trim().length > 0 &&
            typeof ingredient.quantity === "number" &&
            typeof ingredient.unit === "string" &&
            typeof ingredient.isScalable === "boolean"
        )
    )
  );
}

function countParsedComponents(
  object: DeepPartial<RecipeParseResult> | undefined
): number {
  if (!Array.isArray(object?.components)) return 0;
  return object.components.filter(
    (component) => component && typeof component.name === "string"
  ).length;
}

function countParsedIngredients(
  object: DeepPartial<RecipeParseResult> | undefined
): number {
  if (!Array.isArray(object?.components)) return 0;
  return object.components.reduce((total, component) => {
    if (!component || !Array.isArray(component.ingredients)) return total;
    return (
      total +
      component.ingredients.filter(
        (ingredient) => ingredient && typeof ingredient.name === "string"
      ).length
    );
  }, 0);
}

interface AiRecipeParserProps {
  onApply: (values: RecipeParseFormApply) => void;
  className?: string;
}

export default function AiRecipeParser({
  onApply,
  className,
}: AiRecipeParserProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [rawText, setRawText] = useState("");

  const { object, submit, isLoading, error, stop, clear } = useObject({
    api: "/api/admin/ai/parse-recipe",
    schema: recipeParseSchema,
  });

  const canParse = rawText.trim().length > 0;
  const canApply = useMemo(
    () => !isLoading && isCompleteParse(object),
    [isLoading, object]
  );

  const componentCount = countParsedComponents(object);
  const ingredientCount = countParsedIngredients(object);

  const hasPreview =
    Boolean(object?.name) ||
    componentCount > 0 ||
    Boolean(object?.yield?.sizeLabel) ||
    typeof object?.yield?.targetWeightGrams === "number";

  const handleParse = () => {
    if (!canParse) return;
    clear();
    submit({ rawText: rawText.trim() });
  };

  const handleApply = () => {
    if (!isCompleteParse(object)) return;
    onApply(mapRecipeParseToFormApply(object));
  };

  return (
    <CollapsibleSection
      title="Parse Recipe with AI"
      isOpen={isOpen}
      onToggle={() => setIsOpen((open) => !open)}
      className={cn("mb-6", className)}
    >
      <div className="space-y-4">
        <p className="font-body text-small text-primary/60">
          Paste a bakery tech card (PDF copy, WhatsApp export, or handwritten
          notes). The AI splits it into components — each with its own
          ingredients and preparation instructions.
        </p>

        <Textarea
          value={rawText}
          onChange={(event) => setRawText(event.target.value)}
          rows={10}
          placeholder="Paste tech card text here…"
          className="font-mono text-sm"
        />

        <div className="flex flex-wrap items-center gap-sm">
          {isLoading ? (
            <Button type="button" variant="secondary" size="sm" onClick={() => stop()}>
              <Square className="mr-sm h-3.5 w-3.5" />
              Stop
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              disabled={!canParse}
              onClick={handleParse}
            >
              <Sparkles className="mr-sm h-3.5 w-3.5" />
              Parse Recipe with AI
            </Button>
          )}
        </div>

        {isLoading && !hasPreview && (
          <div className="inline-flex items-center gap-sm font-body text-small text-primary/60">
            <Loader2 className="h-4 w-4 animate-spin text-accent" />
            Structuring tech card…
          </div>
        )}

        {error && (
          <div className="rounded-medium border border-error/40 bg-error/10 px-md py-sm font-body text-small text-error">
            <p className="inline-flex items-center gap-sm">
              <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
              {error.message || "Could not parse recipe text."}
            </p>
          </div>
        )}

        {hasPreview && (
          <div className="rounded-large border border-accent/30 bg-subtleBackground/40 p-md space-y-sm">
            <div className="flex flex-wrap items-start justify-between gap-sm">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="font-body text-[11px] uppercase tracking-wide text-primary/60">
                  Parsed tech card
                </p>
                <p className="font-heading text-h5 text-primary">
                  {object?.name || <span className="text-primary/40">…</span>}
                </p>
                <p className="font-body text-small text-primary/70">
                  {componentCount > 0 ? (
                    <>
                      {componentCount} component
                      {componentCount === 1 ? "" : "s"}
                      {ingredientCount > 0 && (
                        <>
                          {" "}
                          · {ingredientCount} ingredient
                          {ingredientCount === 1 ? "" : "s"}
                        </>
                      )}
                    </>
                  ) : (
                    <span className="text-primary/40">
                      Extracting components…
                    </span>
                  )}
                </p>
                {object?.yield?.sizeLabel && (
                  <p className="font-body text-small text-primary/60">
                    Yield: {object.yield.sizeLabel}
                    {typeof object.yield.panDiameterInches === "number" && (
                      <> · {object.yield.panDiameterInches}&quot; pan</>
                    )}
                    {typeof object.yield.targetWeightGrams === "number" && (
                      <> · {object.yield.targetWeightGrams} g target</>
                    )}
                  </p>
                )}
              </div>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={!canApply}
                onClick={handleApply}
              >
                Apply to Form
              </Button>
            </div>

            {isLoading && (
              <p className="font-body text-small text-primary/40">
                Still parsing…
              </p>
            )}
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
}
