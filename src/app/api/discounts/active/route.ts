import { NextResponse } from "next/server";
import { getActiveDiscounts } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const discounts = await getActiveDiscounts();
  return NextResponse.json(discounts);
}
