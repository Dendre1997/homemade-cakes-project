import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/db";
import { mongoUnavailableResponse } from "@/lib/db/mongoHttp";
import { verifyAdminAPI } from "@/lib/auth/adminOnly";
import {
  buildRecipeUpdateDocument,
  serializeRecipe,
  type RecipeDocument,
} from "@/lib/db/recipes";
import {
  formatRecipeValidationError,
  isDuplicateKeyError,
  updateRecipeSchema,
} from "@/lib/validation/recipe";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function invalidIdResponse() {
  return NextResponse.json({ error: "Invalid recipe id." }, { status: 400 });
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const session = await verifyAdminAPI();
  if (!("user" in session)) {
    return NextResponse.json(
      { error: session.error },
      { status: session.status }
    );
  }

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return invalidIdResponse();
  }

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const recipe = await db
      .collection<RecipeDocument>("recipes")
      .findOne({ _id: new ObjectId(id) });

    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
    }

    return NextResponse.json(serializeRecipe({ ...recipe, _id: recipe._id! }));
  } catch (error) {
    console.error("Error fetching recipe:", error);
    return (
      mongoUnavailableResponse(error) ??
      NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const session = await verifyAdminAPI();
  if (!("user" in session)) {
    return NextResponse.json(
      { error: session.error },
      { status: session.status }
    );
  }

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return invalidIdResponse();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateRecipeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: formatRecipeValidationError(parsed.error) },
      { status: 400 }
    );
  }

  const recipeId = new ObjectId(id);
  const updatedAt = new Date();
  const updateDoc = buildRecipeUpdateDocument(parsed.data, updatedAt);

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    const collection = db.collection<RecipeDocument>("recipes");

    const slugConflict = await collection.findOne({
      slug: updateDoc.slug,
      _id: { $ne: recipeId },
    });
    if (slugConflict) {
      return NextResponse.json(
        { error: `Recipe slug "${updateDoc.slug}" is already in use.` },
        { status: 409 }
      );
    }

    const result = await collection.findOneAndUpdate(
      { _id: recipeId },
      {
        $set: updateDoc,
        $unset: {
          ...(updateDoc.categoryId ? {} : { categoryId: "" }),
          ...(updateDoc.flavorId ? {} : { flavorId: "" }),
          ...(updateDoc.description ? {} : { description: "" }),
          ingredients: "",
          steps: "",
          ...(updateDoc.activeTimeMinutes !== undefined
            ? {}
            : { activeTimeMinutes: "" }),
          ...(updateDoc.bakeTimeMinutes !== undefined
            ? {}
            : { bakeTimeMinutes: "" }),
          ...(updateDoc.notes ? {} : { notes: "" }),
        },
      },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
    }

    return NextResponse.json(
      serializeRecipe({ ...result, _id: result._id! })
    );
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return NextResponse.json(
        { error: `Recipe slug "${updateDoc.slug}" is already in use.` },
        { status: 409 }
      );
    }

    console.error("Error updating recipe:", error);
    return (
      mongoUnavailableResponse(error) ??
      NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const session = await verifyAdminAPI();
  if (!("user" in session)) {
    return NextResponse.json(
      { error: session.error },
      { status: session.status }
    );
  }

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return invalidIdResponse();
  }

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const result = await db
      .collection("recipes")
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting recipe:", error);
    return (
      mongoUnavailableResponse(error) ??
      NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    );
  }
}
