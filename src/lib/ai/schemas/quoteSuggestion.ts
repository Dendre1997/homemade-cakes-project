import { z } from "zod";

/**
 * Shared Zod schema for the custom-order quote inline helper.
 *
 * Imported by both the suggest-quote API route and the client `useObject`
 * hook — keeps validation identical without pulling server code into the bundle.
 */

export const quoteSuggestionSchema = z.object({
  items: z.array(
    z.object({
      itemId: z.string(),
      suggestedBasePrice: z.number().min(0),
      suggestedDesignQuote: z.number().min(0),
      reasoning: z.string(),
      confidence: z.enum(["high", "medium", "low"]),
    })
  ),
  totalSuggested: z.number().min(0),
  risks: z.array(z.string()),
});

export type QuoteSuggestion = z.infer<typeof quoteSuggestionSchema>;
