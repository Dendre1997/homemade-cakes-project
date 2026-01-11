import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/db";
import { AppSettings } from "@/types";
import { revalidatePath } from "next/cache";
import { getAppSettings } from "@/lib/api/settings";

export async function GET() {
  try {
    const settings = await getAppSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const filter = { _id: "global_settings" };
    
    const result = await db.collection<AppSettings>("app_settings").findOneAndUpdate(
      filter,
      { $set: body }, 
      { upsert: true, returnDocument: "after" }
    );

    revalidatePath("/checkout");

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to update settings:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
