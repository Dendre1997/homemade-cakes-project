import clientPromise from "@/lib/db";
import { withMongoRetry } from "@/lib/db/withMongoRetry";
import { SeasonalEvent } from "@/types";

/**
 * Fetches all currently active seasonal events, sorted by endDate ascending.
 * Returns the same BSON-serialized shape as GET /api/seasonals.
 */
export async function getActiveSeasonals(): Promise<SeasonalEvent[]> {
  return withMongoRetry(async () => {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const now = new Date();

    const activeSeasonals = await db
      .collection("seasonals")
      .find({
        isActive: true,
        startDate: { $lte: now },
        endDate: { $gte: now },
      })
      .sort({ endDate: 1 })
      .toArray();

    return JSON.parse(JSON.stringify(activeSeasonals)) as SeasonalEvent[];
  });
}
