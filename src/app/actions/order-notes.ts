"use server";

import clientPromise from "@/lib/db";
import { verifyAdminAPI } from "@/lib/auth/adminOnly";
import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";

class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

/**
 * Server Actions are publicly callable POST endpoints, so the admin session
 * must be re-verified here — the edge proxy guard on /bakery-manufacturing-orders
 * does not cover the action endpoint itself.
 */
async function requireAdmin(): Promise<void> {
  const session = await verifyAdminAPI();
  if (!("user" in session)) {
    throw new UnauthorizedError();
  }
}

function unauthorizedResult(error: unknown) {
  return error instanceof UnauthorizedError
    ? { success: false as const, error: "Unauthorized" }
    : null;
}

export async function addOrderNote(orderId: string, content: string) {
  if (!content || !content.trim()) {
      return { success: false, error: "Note content cannot be empty" };
  }

  try {
    await requireAdmin();

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const newNote = {
      id: new ObjectId().toString(),
      content: content.trim(),
      createdAt: new Date(),
      author: "Admin",
    };

    let query;
    let result;
    let isObjectId = false;

    try {
        const objId = new ObjectId(orderId);
        query = { _id: objId };
        isObjectId = true;
    } catch (e) {
        query = { _id: orderId };
    }

    result = await db.collection("orders").updateOne(
      query as any,
      { $push: { notesLog: newNote } } as any
    );

    if (result.matchedCount === 0 && isObjectId) {
        query = { _id: orderId }; // Use the raw string string
        result = await db.collection("orders").updateOne(
            query as any,
            { $push: { notesLog: newNote } } as any
        );
    }

    if (result.matchedCount === 0) {
        return { success: false, error: "Order not found" };
    }

    if (result.modifiedCount === 0) {
      return { success: false, error: "Note not added (document found but not modified)" };
    }

    revalidatePath(`/bakery-manufacturing-orders/orders/${orderId}`);
    return { success: true };
  } catch (error) {
    const denied = unauthorizedResult(error);
    if (denied) return denied;

    console.error("Failed to add order note:", error);
    return { success: false, error: "Failed to add note" };
  }
}

export async function deleteOrderNote(orderId: string, noteId: string) {
  try {
    await requireAdmin();

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    let query;
    let isObjectId = false;
    try {
        const objId = new ObjectId(orderId);
        query = { _id: objId };
        isObjectId = true;
    } catch (e) {
        query = { _id: orderId };
    }

    let result = await db.collection("orders").updateOne(
      query as any,
      { $pull: { notesLog: { id: noteId } } } as any
    );

    if (result.matchedCount === 0 && isObjectId) {
        query = { _id: orderId };
        result = await db.collection("orders").updateOne(
            query as any,
            { $pull: { notesLog: { id: noteId } } } as any
        );
    }

    if (result.matchedCount === 0) {
        return { success: false, error: "Order not found" };
    }
    
    revalidatePath(`/bakery-manufacturing-orders/orders/${orderId}`);
    return { success: true };
  } catch (error) {
    const denied = unauthorizedResult(error);
    if (denied) return denied;

    console.error("Failed to delete order note:", error);
    return { success: false, error: "Failed to delete note" };
  }
}

export async function updateOrderNote(orderId: string, noteId: string, newContent: string) {
    if (!newContent || !newContent.trim()) {
        return { success: false, error: "Note content cannot be empty" };
    }

    try {
      await requireAdmin();

      const client = await clientPromise;
      const db = client.db(process.env.MONGODB_DB_NAME);
  
      let query;
      let isObjectId = false;
      try {
          const objId = new ObjectId(orderId);
          query = { _id: objId, "notesLog.id": noteId };
          isObjectId = true;
      } catch (e) {
          query = { _id: orderId, "notesLog.id": noteId };
      }
  
      let result = await db.collection("orders").updateOne(
        query as any,
        { $set: { "notesLog.$.content": newContent.trim() } } as any
      );
  
      if (result.matchedCount === 0 && isObjectId) {
          query = { _id: orderId, "notesLog.id": noteId };
           result = await db.collection("orders").updateOne(
            query as any,
            { $set: { "notesLog.$.content": newContent.trim() } } as any
          );
      }
  
      if (result.matchedCount === 0) {
          return { success: false, error: "Order or Note not found" };
      }
  
      revalidatePath(`/bakery-manufacturing-orders/orders/${orderId}`);
      return { success: true };
    } catch (error) {
      const denied = unauthorizedResult(error);
      if (denied) return denied;

      console.error("Failed to update order note:", error);
      return { success: false, error: "Failed to update note" };
    }
}
