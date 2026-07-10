import { NextResponse } from "next/server";
import { getActiveSeasonals } from "@/lib/db/seasonals";

export async function GET() {
  try {
    const activeSeasonals = await getActiveSeasonals();
    return NextResponse.json(activeSeasonals);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
