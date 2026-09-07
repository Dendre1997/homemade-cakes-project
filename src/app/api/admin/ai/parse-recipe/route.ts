import {
  createTextStreamResponse,
  Output,
  streamText,
  toTextStream,
} from "ai";
import { NextResponse } from "next/server";
import { verifyAdminAPI } from "@/lib/auth/adminOnly";
import {
  getCopilotModel,
  MissingAiCredentialsError,
} from "@/lib/ai/provider";
import {
  parseRecipeInputSchema,
  recipeParseSchema,
  type RecipeParseResult,
} from "@/lib/ai/schemas/recipeParse";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SYSTEM_PROMPT = [
  "You are parsing a bakery tech card. Tech cards are divided into distinct components (e.g., 'Ванільний бісквіт', 'Ванільно-заварний крем', 'Збірка').",
  "Extract each section into the `components` array. Put the relevant ingredients AND preparation instructions into their respective component block.",
  "Convert cm to inches for the pan diameter.",
  "",
  "Additional rules:",
  "- Standardize units (e.g., 'г' to 'g', 'мл' to 'ml', 'ч.л' to 'tsp').",
  "- Guess `isScalable`: false for salt, baking powder, vanilla extract; true for flour, sugar, eggs, milk.",
  "- Populate `yield.sizeLabel` with a concise label for the base batch.",
  "- If the recipe states a finished total weight in grams, set `yield.targetWeightGrams`.",
  "- Put general recipe intro in `description`; cross-cutting kitchen notes in `notes`.",
  "- Do not invent category or flavor catalog IDs.",
  "- Return every required schema field with realistic positive quantities.",
].join("\n");

/**
 * Inline form helper for the admin recipe editor.
 * Streams a structured tech-card draft via `useObject` on the client.
 */
export async function POST(request: Request) {
  const session = await verifyAdminAPI();
  if (!("user" in session)) {
    return NextResponse.json(
      { error: session.error },
      { status: session.status }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = parseRecipeInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Request body must include non-empty rawText." },
      { status: 400 }
    );
  }

  let model;
  try {
    model = getCopilotModel();
  } catch (error) {
    if (error instanceof MissingAiCredentialsError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    throw error;
  }

  try {
    const result = streamText({
      model,
      system: SYSTEM_PROMPT,
      prompt: [
        "Parse the following bakery tech card text into the structured schema.",
        "",
        parsed.data.rawText.trim(),
      ].join("\n"),
      output: Output.object({ schema: recipeParseSchema }),
    });

    return createTextStreamResponse({
      stream: toTextStream({ stream: result.stream }),
    });
  } catch (error) {
    console.error("Error parsing recipe text:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export type { RecipeParseResult };
export { recipeParseSchema };
