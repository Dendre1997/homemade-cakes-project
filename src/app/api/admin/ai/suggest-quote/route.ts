import {
  createTextStreamResponse,
  Output,
  streamText,
  toTextStream,
} from "ai";
import { NextResponse } from "next/server";
import { ObjectId, type Db } from "mongodb";
import { verifyAdminAPI } from "@/lib/auth/adminOnly";
import {
  quoteSuggestionSchema,
  type QuoteSuggestion,
} from "@/lib/ai/schemas/quoteSuggestion";
import {
  compact,
  shapeCustomOrderItem,
  shortId,
} from "@/lib/ai/serialize";
import {
  getCopilotModel,
  MissingAiCredentialsError,
} from "@/lib/ai/provider";
import { withMongoClient } from "@/lib/db";
import { mongoUnavailableResponse } from "@/lib/db/mongoHttp";
import {
  getHumanReadableLookupMaps,
  resolveName,
  type LookupMaps,
} from "@/lib/db/lookupMaps";
import { normalizeCustomOrder } from "@/lib/normalizeCustomOrder";
import type { CustomOrder, CustomOrderItem } from "@/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Matches the daily-brief projection — no reference images or priceBreakdown blobs. */
const CUSTOM_ORDER_PROJECTION = {
  "items.referenceImages": 0,
  "items.priceBreakdown": 0,
  referenceImages: 0,
  referenceImageUrls: 0,
  adminSelectedImage: 0,
} as const;

function parseCustomOrderId(body: unknown): string | null {
  if (typeof body === "string" && body.trim()) {
    return body.trim();
  }
  if (body && typeof body === "object" && "customOrderId" in body) {
    const value = (body as { customOrderId?: unknown }).customOrderId;
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function shapeItemForPrompt(item: CustomOrderItem, maps: LookupMaps) {
  return compact({
    itemId: item.id,
    ...shapeCustomOrderItem(item, maps),
    priceBreakdown: item.priceBreakdown
      ? compact({
          baseCakePrice: item.priceBreakdown.baseCakePrice,
          flavorUpcharge: item.priceBreakdown.flavorUpcharge,
          addonsCost: item.priceBreakdown.addonsCost,
          grandTotal: item.priceBreakdown.grandTotal,
        })
      : undefined,
    referenceImageCount: item.referenceImages?.length ?? 0,
  });
}

function shapeHistoricalQuote(
  doc: Record<string, unknown>,
  maps: LookupMaps,
  matchCategoryIds: Set<string>,
  matchCategories: Set<string>
) {
  const normalized = normalizeCustomOrder(doc);

  const matchedItems = normalized.items
    .filter((item) => {
      const catId = item.categoryId ? String(item.categoryId) : "";
      if (catId && matchCategoryIds.has(catId)) return true;
      if (item.category && matchCategories.has(item.category)) return true;
      return false;
    })
    .filter(
      (item) =>
        typeof item.agreedPrice === "number" && item.agreedPrice > 0
    )
    .map((item) =>
      compact({
        category:
          item.category || resolveName(maps.categories, item.categoryId),
        size: item.details?.size,
        agreedPrice: item.agreedPrice,
        designQuote: item.designQuote,
        basePrice:
          typeof item.agreedPrice === "number" &&
          typeof item.designQuote === "number"
            ? Math.max(0, item.agreedPrice - item.designQuote)
            : undefined,
      })
    );

  if (matchedItems.length === 0) return null;

  return compact({
    shortId: shortId(String(normalized._id)),
    agreedPriceTotal: normalized.agreedPriceTotal,
    items: matchedItems,
  });
}

async function fetchPriceAnchors(
  db: Db,
  order: CustomOrder,
  maps: LookupMaps
) {
  const categoryIds = new Set<string>();
  const categoryNames = new Set<string>();
  const diameterIds = new Set<string>();
  const referenceUrls = new Set<string>();

  for (const item of order.items) {
    if (item.categoryId) categoryIds.add(String(item.categoryId));
    if (item.category) categoryNames.add(item.category);
    if (item.details?.diameterId) {
      diameterIds.add(String(item.details.diameterId));
    }
    for (const url of item.referenceImages ?? []) {
      if (url) referenceUrls.add(url);
    }
  }

  const categoryObjectIds = [...categoryIds]
    .filter(ObjectId.isValid)
    .map((id) => new ObjectId(id));
  const diameterObjectIds = [...diameterIds]
    .filter(ObjectId.isValid)
    .map((id) => new ObjectId(id));

  const historicalFilter =
    categoryObjectIds.length > 0
      ? {
          status: "converted" as const,
          _id: { $ne: new ObjectId(order._id) },
          $or: [
            { "items.categoryId": { $in: categoryObjectIds } },
            ...(categoryNames.size > 0
              ? [{ "items.category": { $in: [...categoryNames] } }]
              : []),
          ],
        }
      : null;

  const [categories, diameters, galleryMatches, historicalDocs] =
    await Promise.all([
      categoryObjectIds.length > 0
        ? db
            .collection("categories")
            .find(
              { _id: { $in: categoryObjectIds } },
              { projection: { name: 1, basePrice: 1 } }
            )
            .toArray()
        : Promise.resolve([]),
      diameterObjectIds.length > 0
        ? db
            .collection("diameters")
            .find(
              { _id: { $in: diameterObjectIds } },
              { projection: { name: 1, sizeValue: 1, basePrice: 1 } }
            )
            .toArray()
        : Promise.resolve([]),
      referenceUrls.size > 0
        ? db
            .collection("gallery_images")
            .find(
              {
                imageUrl: { $in: [...referenceUrls] },
                isActive: true,
              },
              {
                projection: {
                  title: 1,
                  decorationPrice: 1,
                  categories: 1,
                },
              }
            )
            .toArray()
        : Promise.resolve([]),
      historicalFilter
        ? db
            .collection("custom_orders")
            .find(historicalFilter, {
              projection: {
                "items.category": 1,
                "items.categoryId": 1,
                "items.agreedPrice": 1,
                "items.designQuote": 1,
                "items.details.size": 1,
                agreedPriceTotal: 1,
                updatedAt: 1,
              },
            })
            .sort({ updatedAt: -1 })
            .limit(12)
            .toArray()
        : Promise.resolve([]),
    ]);

  const historicalQuotes = historicalDocs
    .map((doc) =>
      shapeHistoricalQuote(
        doc as Record<string, unknown>,
        maps,
        categoryIds,
        categoryNames
      )
    )
    .filter(Boolean)
    .slice(0, 6);

  return compact({
    categories: categories.map((doc) =>
      compact({
        id: doc._id.toString(),
        name: doc.name,
        basePrice: doc.basePrice,
      })
    ),
    diameters: diameters.map((doc) =>
      compact({
        id: doc._id.toString(),
        name: doc.name,
        sizeValue: doc.sizeValue,
        basePrice: doc.basePrice,
      })
    ),
    galleryDesigns: galleryMatches.map((doc) =>
      compact({
        title: doc.title,
        decorationPrice: doc.decorationPrice,
        categories: doc.categories,
      })
    ),
    historicalQuotes,
  });
}

type PriceAnchors = Awaited<ReturnType<typeof fetchPriceAnchors>>;

function buildQuoteSystemPrompt(): string {
  return [
    "You are the D&K Creations quoting assistant helping Anastasiia price a custom order request.",
    "",
    "RULES:",
    "- Every dollar amount MUST be grounded in the provided price anchors (catalog basePrice, diameter basePrice, gallery decorationPrice, historical agreedPrice, client priceBreakdown). Never invent a price with no anchor.",
    "- suggestedBasePrice covers the cake itself: size, flavor upcharge, and addons — mirroring priceBreakdown.baseCakePrice + flavorUpcharge + addonsCost when present.",
    "- suggestedDesignQuote covers custom decoration / design labor. Use gallery decorationPrice and design complexity (designNotes, tiers, referenceImageCount) as anchors.",
    "- Return exactly one `items[]` entry per input item, using the same itemId.",
    "- totalSuggested MUST equal the sum of (suggestedBasePrice + suggestedDesignQuote) across all items.",
    "- confidence: high when anchors align cleanly; medium when extrapolating; low when key anchors are missing.",
    "- risks: flag allergies, tight timelines, missing size/flavor, complex multi-tier designs, or weak anchor data.",
    "- All amounts are CAD. Round to whole dollars.",
    "- Do not mention raw MongoDB ObjectIds.",
  ].join("\n");
}

function buildQuoteUserPrompt(
  order: CustomOrder,
  maps: LookupMaps,
  anchors: PriceAnchors
) {
  const context = compact({
    request: compact({
      shortId: shortId(String(order._id)),
      status: order.status,
      eventDate: order.date,
      timeSlot: order.timeSlot,
      deliveryMethod: order.deliveryMethod,
      allergies: order.allergies,
      paymentPreference: order.paymentPreference,
      approximatePriceTotal: order.approximatePriceTotal,
      contact: compact({
        name: order.contact?.name,
      }),
    }),
    items: order.items.map((item) => shapeItemForPrompt(item, maps)),
    priceAnchors: anchors,
  });

  return [
    "Suggest a quote for this custom order request.",
    "Use the JSON context below — especially priceAnchors — to ground every number.",
    "",
    JSON.stringify(context, null, 2),
  ].join("\n");
}

/**
 * Inline form helper for the custom-order quote screen.
 *
 * Streams a structured quote suggestion via `useObject` on the client. Uses
 * `streamText` + `Output.object()` per Baker AI constitution §5 — not
 * `generateObject`.
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

  const customOrderId = parseCustomOrderId(body);
  if (!customOrderId) {
    return NextResponse.json(
      { error: 'Request body must include a "customOrderId" string.' },
      { status: 400 }
    );
  }

  if (!ObjectId.isValid(customOrderId)) {
    return NextResponse.json(
      { error: "Invalid customOrderId." },
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
    const [maps, orderDoc] = await Promise.all([
      getHumanReadableLookupMaps(),
      withMongoClient(async (client) => {
        const db = client.db(process.env.MONGODB_DB_NAME);
        return db.collection("custom_orders").findOne(
          { _id: new ObjectId(customOrderId) },
          { projection: CUSTOM_ORDER_PROJECTION }
        );
      }),
    ]);

    if (!orderDoc) {
      return NextResponse.json(
        { error: "Custom order not found." },
        { status: 404 }
      );
    }

    const order = normalizeCustomOrder(orderDoc);

    const anchors = await withMongoClient(async (client) =>
      fetchPriceAnchors(
        client.db(process.env.MONGODB_DB_NAME),
        order,
        maps
      )
    );

    const result = streamText({
      model,
      system: buildQuoteSystemPrompt(),
      prompt: buildQuoteUserPrompt(order, maps, anchors),
      output: Output.object({ schema: quoteSuggestionSchema }),
    });

    return createTextStreamResponse({
      stream: toTextStream({ stream: result.stream }),
    });
  } catch (error) {
    console.error("Error generating quote suggestion:", error);
    return (
      mongoUnavailableResponse(error) ??
      NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    );
  }
}

export type { QuoteSuggestion };
export { quoteSuggestionSchema };
