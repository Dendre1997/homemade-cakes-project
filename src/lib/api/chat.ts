import { getMongoClient } from "@/lib/db";
import { IChat } from "@/types";

/**
 * Retrieves the chats collection with proper typing.
 * Acquire is deadline-bounded; callers should wrap multi-step query work
 * in withMongoClient / withMongoDeadline when the full path must fail fast.
 */
export async function getChatCollection() {
  const client = await getMongoClient();
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
