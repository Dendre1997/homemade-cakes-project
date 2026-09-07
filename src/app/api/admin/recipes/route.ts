import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/db";
import { mongoUnavailableResponse } from "@/lib/db/mongoHttp";
import { verifyAdminAPI } from "@/lib/auth/adminOnly";
import {
  buildRecipeDocument,
  buildRecipeUpdateDocument,
  serializeRecipe,
  type RecipeDocument,
} from "@/lib/db/recipes";
import {
  createRecipeSchema,
  formatRecipeValidationError,
  isDuplicateKeyError,
} from "@/lib/validation/recipe";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await verifyAdminAPI();
  if (!("user" in session)) {
    return NextResponse.json(
      { error: session.error },
      { status: session.status }
    );
  }

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const recipes = await db
      .collection<RecipeDocument>("recipes")
      .find({})
      .sort({ name: 1 })
      .toArray();

    return NextResponse.json(
      recipes.map((doc) => serializeRecipe({ ...doc, _id: doc._id! }))
    );
  } catch (error) {
    console.error("Error fetching recipes:", error);
    return (
      mongoUnavailableResponse(error) ??
      NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    );
  }
}

export async function POST(request: NextRequest) {
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

  const parsed = createRecipeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: formatRecipeValidationError(parsed.error) },
      { status: 400 }
    );
  }

  const now = new Date();
  const document = buildRecipeDocument(parsed.data, {
    createdAt: now,
    updatedAt: now,
  });

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    const collection = db.collection<RecipeDocument>("recipes");

    const slugTaken = await collection.findOne({ slug: document.slug });
    if (slugTaken) {
      return NextResponse.json(
        { error: `Recipe slug "${document.slug}" is already in use.` },
        { status: 409 }
      );
    }

    const result = await collection.insertOne(document);
    const inserted = { ...document, _id: result.insertedId };

    return NextResponse.json(serializeRecipe(inserted), { status: 201 });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return NextResponse.json(
        { error: `Recipe slug "${document.slug}" is already in use.` },
        { status: 409 }
      );
    }

    console.error("Error creating recipe:", error);
    return (
      mongoUnavailableResponse(error) ??
      NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    );
  }
}
