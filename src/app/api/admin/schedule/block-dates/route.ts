import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAPI } from "@/lib/auth/adminOnly";
import {
  ModifyScheduleDatesError,
  modifyScheduleDates,
  type ScheduleBlockAction,
} from "@/lib/db/schedule-helpers";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  const session = await verifyAdminAPI();
  if (!("user" in session)) {
    return NextResponse.json(
      { error: session.error },
      { status: session.status }
    );
  }

  try {
    const body = (await request.json()) as {
      dates?: unknown;
      action?: unknown;
    };
    const { dates, action } = body;

    if (!Array.isArray(dates) || dates.length === 0) {
      return NextResponse.json(
        { error: "At least one date is required." },
        { status: 400 }
      );
    }

    if (action !== "block" && action !== "unblock") {
      return NextResponse.json(
        { error: 'action must be "block" or "unblock".' },
        { status: 400 }
      );
    }

    await modifyScheduleDates(
      dates.map((date) => String(date)),
      action as ScheduleBlockAction
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ModifyScheduleDatesError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    console.error("[PATCH /api/admin/schedule/block-dates]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
