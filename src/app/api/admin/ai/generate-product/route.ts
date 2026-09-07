import {
  createTextStreamResponse,
  Output,
  streamText,
  toTextStream,
} from "ai";
import { NextResponse } from "next/server";
import { ObjectId, type Db } from "mongodb";
import { verifyAdminAPI } from "@/lib/auth/adminOnly";
import { compact } from "@/lib/ai/serialize";
import {
  getCopilotModel,
  MissingAiCredentialsError,
} from "@/lib/ai/provider";
import {
  generateProductInputSchema,
  productSuggestionSchema,
  type GenerateProductInput,
  type ProductSuggestion,
} from "@/lib/ai/schemas/productSuggestion";
import { withMongoClient } from "@/lib/db";
import { mongoUnavailableResponse } from "@/lib/db/mongoHttp";
import {
  getHumanReadableLookupMaps,
  resolveName,
  type LookupMaps,
} from "@/lib/db/lookupMaps";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CATEGORY_PROJECTION = {
  name: 1,
  slug: 1,
  basePrice: 1,
  categoryType: 1,
} as const;

const FLAVOR_PROJECTION = {
  name: 1,
  price: 1,
  description: 1,
} as const;

const GALLERY_PRICE_PROJECTION = {
  title: 1,
  decorationPrice: 1,
  categories: 1,
} as const;

function parseGenerateProductInput(body: unknown): GenerateProductInput | null {
  const parsed = generateProductInputSchema.safeParse(body);
  if (!parsed.success) return null;

  const input = parsed.data;
  const hasPartialName = Boolean(input.partialName?.trim());
  const hasCategory = Boolean(input.categoryId?.trim());
  const hasFlavors = Boolean(input.flavorIds?.length);

  if (!hasPartialName && !hasCategory && !hasFlavors) {
    return null;
  }

  return compact({
    partialName: input.partialName?.trim(),
    categoryId: input.categoryId?.trim(),
    flavorIds: input.flavorIds?.filter(Boolean),
    isGalleryItem: input.isGalleryItem ?? false,
  }) as GenerateProductInput;
}

function resolveFlavorNames(
  flavorIds: string[] | undefined,
  maps: LookupMaps
): string[] | undefined {
  if (!flavorIds?.length) return undefined;

  const names = flavorIds
    .map((id) => resolveName(maps.flavors, id))
    .filter((name): name is string => Boolean(name));

  return names.length > 0 ? names : undefined;
}

async function fetchPriceAnchors(
  db: Db,
  input: GenerateProductInput,
  maps: LookupMaps
) {
  const categoryId = input.categoryId?.trim();
  const flavorObjectIds = (input.flavorIds ?? [])
    .filter(ObjectId.isValid)
    .map((id) => new ObjectId(id));

  const categoryPromise =
    categoryId && ObjectId.isValid(categoryId)
      ? db
          .collection("categories")
          .findOne(
            { _id: new ObjectId(categoryId) },
            { projection: CATEGORY_PROJECTION }
          )
      : Promise.resolve(null);

  const flavorsPromise =
    flavorObjectIds.length > 0
      ? db
          .collection("flavors")
          .find({ _id: { $in: flavorObjectIds } }, { projection: FLAVOR_PROJECTION })
          .toArray()
      : Promise.resolve([]);

  const galleryPromise = input.isGalleryItem
    ? db
        .collection("gallery_images")
        .find({ isActive: true, decorationPrice: { $gt: 0 } }, {
          projection: GALLERY_PRICE_PROJECTION,
        })
        .sort({ decorationPrice: -1 })
        .limit(8)
        .toArray()
    : Promise.resolve([]);

  const [categoryDoc, flavorDocs, gallerySamples] = await Promise.all([
    categoryPromise,
    flavorsPromise,
    galleryPromise,
  ]);

  const categoryName =
    (categoryDoc && typeof categoryDoc.name === "string"
      ? categoryDoc.name
      : undefined) ?? resolveName(maps.categories, categoryId);

  const flavorAnchors = flavorDocs.map((doc) =>
    compact({
      name: doc.name ?? resolveName(maps.flavors, doc._id),
      price: typeof doc.price === "number" ? doc.price : undefined,
    })
  );

  const galleryDecorationSamples = gallerySamples
    .map((doc) =>
      compact({
        title: doc.title,
        decorationPrice: doc.decorationPrice,
        categories: doc.categories,
      })
    )
    .filter((entry) => Object.keys(entry).length > 0);

  return compact({
    category: compact({
      name: categoryName,
      basePrice:
        categoryDoc && typeof categoryDoc.basePrice === "number"
          ? categoryDoc.basePrice
          : undefined,
      categoryType: categoryDoc?.categoryType,
      slug: categoryDoc?.slug,
    }),
    flavors: flavorAnchors.length > 0 ? flavorAnchors : undefined,
    galleryDecorationSamples:
      galleryDecorationSamples.length > 0 ? galleryDecorationSamples : undefined,
  });
}

function buildSystemPrompt(isGalleryItem: boolean): string {
  const mode = isGalleryItem
    ? [
        "You are writing copy for a GALLERY showcase entry (portfolio / inspiration photo), not a purchasable catalog SKU.",
        "- suggestedName is the gallery title (evocative, short).",
        "- suggestedPrice is a decor/design fee anchor — ground it in galleryDecorationSamples and category.basePrice when present.",
        "- suggestedTags are visual/style tags (e.g. wedding, minimalist, florals) suitable for gallery filtering.",
      ]
    : [
        "You are writing copy for a CATALOG PRODUCT listing in an online bakery shop.",
        "- suggestedName is the product name customers see in the menu.",
        "- suggestedPrice is the starting/catalog price — ground it in category.basePrice plus any premium flavor upcharges from the flavor anchors. Do not invent a price with no anchor.",
        "- suggestedTags are SEO / merchandising keywords (occasions, styles, flavors).",
      ];

  return [
    "You are an expert bakery copywriter and SEO specialist for D&K Creations, a premium homemade cake studio in Calgary.",
    "",
    ...mode,
    "",
    "RULES:",
    "- Write mouth-watering, professional, warm copy — never generic filler or AI clichés.",
    "- description: 2–4 sentences, sensory and specific to the flavors/category hinted in the input.",
    "- shortDescription: one sentence, under 160 characters, suitable for cards and meta previews.",
    "- seoSlug: lowercase, hyphen-separated, URL-safe, derived from suggestedName (no spaces, no special characters).",
    "- Never mention raw database IDs in the copy.",
    "- All prices are Canadian dollars (CAD). Round suggestedPrice to a whole dollar.",
    "- If price anchors are missing, pick a conservative round number and keep copy honest (do not claim a specific size price without an anchor).",
  ].join("\n");
}

function buildUserPrompt(
  input: GenerateProductInput,
  maps: LookupMaps,
  priceAnchors: Awaited<ReturnType<typeof fetchPriceAnchors>>
) {
  const context = compact({
    draft: compact({
      partialName: input.partialName,
      isGalleryItem: input.isGalleryItem ?? false,
      category: input.categoryId
        ? compact({
            id: input.categoryId,
            name: resolveName(maps.categories, input.categoryId),
          })
        : undefined,
      flavors: input.flavorIds?.length
        ? input.flavorIds.map((id) =>
            compact({
              id,
              name: resolveName(maps.flavors, id),
            })
          )
        : undefined,
      flavorNames: resolveFlavorNames(input.flavorIds, maps),
    }),
    priceAnchors,
  });

  return [
    "Generate complete product/gallery copy from the partial draft below.",
    "Ground suggestedPrice in priceAnchors. Return every field in the schema.",
    "",
    JSON.stringify(context, null, 2),
  ].join("\n");
}

/**
 * Inline form helper for the admin product / gallery creation screens.
 *
 * Streams structured copy via `useObject` on the client. Uses `streamText` +
 * `Output.object()` per Baker AI constitution §5.
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

  const input = parseGenerateProductInput(body);
  if (!input) {
    return NextResponse.json(
      {
        error:
          'Request body must include at least one of "partialName", "categoryId", or "flavorIds".',
      },
      { status: 400 }
    );
  }

  if (input.categoryId && !ObjectId.isValid(input.categoryId)) {
    return NextResponse.json({ error: "Invalid categoryId." }, { status: 400 });
  }

  const invalidFlavorId = (input.flavorIds ?? []).find(
    (id) => !ObjectId.isValid(id)
  );
  if (invalidFlavorId) {
    return NextResponse.json(
      { error: `Invalid flavorId: ${invalidFlavorId}` },
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
    const maps = await getHumanReadableLookupMaps();
    const priceAnchors = await withMongoClient(async (client) =>
      fetchPriceAnchors(
        client.db(process.env.MONGODB_DB_NAME),
        input,
        maps
      )
    );

    const result = streamText({
      model,
      system: buildSystemPrompt(Boolean(input.isGalleryItem)),
      prompt: buildUserPrompt(input, maps, priceAnchors),
      output: Output.object({ schema: productSuggestionSchema }),
    });

    return createTextStreamResponse({
      stream: toTextStream({ stream: result.stream }),
    });
  } catch (error) {
    console.error("Error generating product suggestion:", error);
    return (
      mongoUnavailableResponse(error) ??
      NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    );
  }
}

export type { ProductSuggestion };
export { productSuggestionSchema };
