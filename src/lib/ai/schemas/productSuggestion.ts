import { z } from "zod";

/**
 * Shared Zod schema for the product / gallery creation inline helper.
 *
 * Used by `POST /api/admin/ai/generate-product` and the client `useObject`
 * hook so structured output stays identical on both sides.
 */

export const productSuggestionSchema = z.object({
  suggestedName: z.string(),
  description: z.string(),
  shortDescription: z.string(),
  suggestedPrice: z.number().min(0),
  seoSlug: z.string(),
  suggestedTags: z.array(z.string()),
});

export type ProductSuggestion = z.infer<typeof productSuggestionSchema>;

/** Body shape the admin product / gallery forms send to the generator. */
export interface GenerateProductInput {
  partialName?: string;
  categoryId?: string;
  flavorIds?: string[];
  isGalleryItem?: boolean;
}

export const generateProductInputSchema = z.object({
  partialName: z.string().trim().optional(),
  categoryId: z.string().trim().optional(),
  flavorIds: z.array(z.string().trim()).optional(),
  isGalleryItem: z.boolean().optional(),
});
