import { NextResponse } from "next/server";
import type { AnyBulkWriteOperation, Document } from "mongodb";
import { verifyAdminAPI } from "@/lib/auth/adminOnly";
import { mongoUnavailableResponse } from "@/lib/db/mongoHttp";
import { withMongoClient } from "@/lib/db";
import { normalizePhoneDigits } from "@/lib/crm/normalize";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BATCH_SIZE = 500;

const MISSING_PHONE_DIGITS = (path: string) => ({
  $or: [{ [path]: { $exists: false } }, { [path]: null }],
});

async function backfillCollection(
  docs: Document[],
  digitsPath: string,
  sourcePhone: (doc: Document) => string | null | undefined,
  write: (ops: AnyBulkWriteOperation[]) => Promise<number>
): Promise<number> {
  let updated = 0;

  for (let offset = 0; offset < docs.length; offset += BATCH_SIZE) {
    const ops: AnyBulkWriteOperation[] = docs
      .slice(offset, offset + BATCH_SIZE)
      .map((doc) => ({
        updateOne: {
          filter: { _id: doc._id },
          update: {
            $set: { [digitsPath]: normalizePhoneDigits(sourcePhone(doc)) },
          },
        },
      }));

    if (ops.length === 0) continue;
    updated += await write(ops);
  }

  return updated;
}

/**
 * One-shot denormalization of `phoneDigits` onto existing orders and custom
 * requests (§3). Safe to re-run: only documents still missing the field match.
 */
export async function POST() {
  const session = await verifyAdminAPI();
  if (!("user" in session) || !session.user) {
    return NextResponse.json(
      { error: "error" in session ? session.error : "Unauthorized" },
      { status: "status" in session ? session.status : 401 }
    );
  }

  try {
    const counts = await withMongoClient(async (client) => {
      const db = client.db(process.env.MONGODB_DB_NAME);
      const orders = db.collection("orders");
      const customOrders = db.collection("custom_orders");

      const [orderDocs, customDocs] = await Promise.all([
        orders
          .find(MISSING_PHONE_DIGITS("customerInfo.phoneDigits"), {
            projection: { "customerInfo.phone": 1 },
          })
          .toArray(),
        customOrders
          .find(MISSING_PHONE_DIGITS("contact.phoneDigits"), {
            projection: { "contact.phone": 1 },
          })
          .toArray(),
      ]);

      const updatedOrdersCount = await backfillCollection(
        orderDocs,
        "customerInfo.phoneDigits",
        (doc) => doc.customerInfo?.phone,
        async (ops) => {
          const result = await orders.bulkWrite(ops, { ordered: false });
          return result.modifiedCount;
        }
      );

      const updatedCustomOrdersCount = await backfillCollection(
        customDocs,
        "contact.phoneDigits",
        (doc) => doc.contact?.phone,
        async (ops) => {
          const result = await customOrders.bulkWrite(ops, { ordered: false });
          return result.modifiedCount;
        }
      );

      return { updatedOrdersCount, updatedCustomOrdersCount };
    });

    return NextResponse.json({ success: true, ...counts });
  } catch (error) {
    console.error("CRM phone backfill failed:", error);
    return (
      mongoUnavailableResponse(error) ??
      NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    );
  }
}
