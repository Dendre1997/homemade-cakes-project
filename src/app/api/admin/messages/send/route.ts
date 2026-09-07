import { NextResponse } from "next/server";
import { verifyAdminAPI } from "@/lib/auth/adminOnly";
import { mongoUnavailableResponse } from "@/lib/db/mongoHttp";
import {
  SendCustomerMessageError,
  sendCustomerMessage,
} from "@/lib/db/messages";
import {
  formatMessageValidationError,
  sendMessageSchema,
} from "@/lib/validation/message";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Send a one-off branded message to the customer attached to an order.
 *
 * This route is the ONLY sanctioned path for ad-hoc outbound email (§1c). All
 * recipient validation, delivery and audit logging live in
 * `sendCustomerMessage()` so the Copilot tool executes the identical code path
 * rather than an internal HTTP hop.
 */
export async function POST(request: Request) {
  const session = await verifyAdminAPI();
  if (!("user" in session) || !session.user) {
    return NextResponse.json(
      { error: "error" in session ? session.error : "Unauthorized" },
      { status: "status" in session ? session.status : 401 }
    );
  }

  const adminUid = session.user.firebaseUid || "unknown-admin";

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = sendMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: formatMessageValidationError(parsed.error) },
      { status: 400 }
    );
  }

  try {
    const result = await sendCustomerMessage({
      ...parsed.data,
      adminUid,
      tool: "adminDashboard",
    });

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    });
  } catch (error) {
    if (error instanceof SendCustomerMessageError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    console.error("[POST /api/admin/messages/send]", error);
    return (
      mongoUnavailableResponse(error) ??
      NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    );
  }
}
