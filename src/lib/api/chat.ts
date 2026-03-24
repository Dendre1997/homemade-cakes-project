import clientPromise from "@/lib/db";
import { IChat } from "@/types";

/**
 * Retrieves the chats collection with proper typing
 */
export async function getChatCollection() {
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB_NAME);
  return db.collection<IChat>("chats");
}

/**
 * Factory for creating a new default chat.
 * Guarantees that all required fields are correctly populated.
 */
export function createInitialChat(userId: string): Omit<IChat, '_id'> {
  return {
    userId,
    status: 'bot_active', // Always starts with the bot
    hasUnread: false,
    messages: [], // Empty array on start
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
