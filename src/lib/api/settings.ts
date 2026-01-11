import clientPromise from "@/lib/db";
import { AppSettings } from "@/types";

export async function getAppSettings(): Promise<AppSettings> {
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB_NAME);

  const settings = await db.collection<AppSettings>("app_settings").findOne({ _id: "global_settings" });

  if (!settings) {
    return {
      _id: "global_settings",
      checkout: {
        isDeliveryEnabled: true,
      },
    };
  }

  return settings;
}
