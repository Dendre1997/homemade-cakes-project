import clientPromise from "@/lib/db";
import { AppSettings } from "@/types";

// Reliable default settings
const DEFAULT_SETTINGS: AppSettings = {
  _id: "global_settings",
  store: {
    isAcceptingOrders: true,
    vacationMessage: "",
  },
  checkout: {
    isDeliveryEnabled: true,
    disabledMessage: "",
    deliveryFee: 0,
    minOrderForDelivery: 0,
    deliveryInstructions: "",
    isPickupEnabled: true,
    pickupAddress: "",
    pickupInstructions: "",
  },
  support: {
    isLiveChatEnabled: true,
    botGreetingMessage: "Hi! I’m your bakery assistant. How can I help you today?",
  },
  eTransferEmail: "",
};

export async function getAppSettings(): Promise<AppSettings> {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const settings = await db.collection<AppSettings>("app_settings").findOne({ _id: "global_settings" });

    // Merge database settings with defaults to ensure all nested objects exist
    return {
      ...DEFAULT_SETTINGS,
      ...settings,
      store: settings?.store 
        ? { ...DEFAULT_SETTINGS.store!, ...settings.store } 
        : DEFAULT_SETTINGS.store,
      checkout: settings?.checkout 
        ? { ...DEFAULT_SETTINGS.checkout, ...settings.checkout } 
        : DEFAULT_SETTINGS.checkout,
      support: settings?.support 
        ? { ...DEFAULT_SETTINGS.support!, ...settings.support } 
        : DEFAULT_SETTINGS.support,
    };
  } catch (error) {
    console.error("Failed to fetch app settings from DB, returning defaults:", error);
    return DEFAULT_SETTINGS;
  }
}
