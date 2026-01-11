import clientPromise from "@/lib/db";
import { Order } from "@/types";
import { ObjectId } from "mongodb";

export async function getUserOrders(userId: string): Promise<Order[]> {
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB_NAME);

  console.log(`[getUserOrders] Fetching orders for userId: ${userId} (Type: ${typeof userId})`);

  // Try querying with ObjectId first (Standard for MongoDB Relations)
  let query = {};
  try {
      query = { customerId: new ObjectId(userId) };
  } catch (e) {
      console.warn(`[getUserOrders] Failed to create ObjectId from ${userId}, falling back to string.`);
      query = { customerId: userId };
  }

  // Debug: Check count before fetching
  const count = await db.collection("orders").countDocuments(query);
  console.log(`[getUserOrders] Found ${count} orders with query:`, JSON.stringify(query));

  if (count === 0) {
      // Fallback: Try finding by string if ObjectId failed or just to be sure
      console.log(`[getUserOrders] trying fallback string query...`);
      const fallbackQuery = { customerId: userId };
      const fallbackCount = await db.collection("orders").countDocuments(fallbackQuery);
      console.log(`[getUserOrders] Fallback string query found ${fallbackCount} orders.`);
      
      if (fallbackCount > 0) {
          query = fallbackQuery;
      }
  }

  const orders = await db
    .collection<Order>("orders")
    .find(query)
    .sort({ createdAt: -1 }) 
    .toArray();

  console.log(`[getUserOrders] Returning ${orders.length} orders.`);

  return JSON.parse(JSON.stringify(orders));
}
