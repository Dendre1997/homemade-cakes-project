import { verifyAdminAPI } from "@/lib/auth/adminOnly";
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/db";
import { AppSettings } from "@/types";
import { revalidatePath } from "next/cache";
import { getAppSettings } from "@/lib/api/settings";

/**
 * Flattens a nested object into MongoDB dot-notation keys for partial $set updates.
 * Arrays are kept intact (not flattened) so list fields replace atomically.
 */
function flattenForMongoSet(
  obj: Record<string, unknown>,
  prefix = ""
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (key === "_id") continue;
    if (value === undefined) continue;

    const path = prefix ? `${prefix}.${key}` : key;

    if (Array.isArray(value)) {
      result[path] = value;
      continue;
    }

    if (
      value !== null &&
      typeof value === "object" &&
      !(value instanceof Date)
    ) {
      Object.assign(
        result,
        flattenForMongoSet(value as Record<string, unknown>, path)
      );
      continue;
    }

    result[path] = value;
  }

  return result;
}

export async function GET() {
  const auth = await verifyAdminAPI();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const settings = await getAppSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await verifyAdminAPI();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = await req.json();
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const filter = { _id: "global_settings" };

    const { _id, ...updateData } = body as Record<string, unknown>;
    const flattenedUpdate = flattenForMongoSet(updateData);

    if (Object.keys(flattenedUpdate).length === 0) {
      return NextResponse.json(
        { error: "No valid settings fields to update" },
        { status: 400 }
      );
    }

    const result = await db.collection<AppSettings>("app_settings").findOneAndUpdate(
      filter,
      { $set: flattenedUpdate },
      { upsert: true, returnDocument: "after" }
    );

    revalidatePath("/checkout");

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to update settings:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
