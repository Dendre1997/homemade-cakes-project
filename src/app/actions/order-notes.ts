"use server";

import clientPromise from "@/lib/db";
import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";

export async function addOrderNote(orderId: string, content: string) {
  if (!content || !content.trim()) {
      return { success: false, error: "Note content cannot be empty" };
  }

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const newNote = {
      id: new ObjectId().toString(),
      content: content.trim(),
      createdAt: new Date(),
      author: "Admin", // For now hardcoded, can be replaced with actual user if auth is available
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

    revalidatePath(`/admin/orders/${orderId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to add order note:", error);
    return { success: false, error: "Failed to add note" };
  }
}

export async function deleteOrderNote(orderId: string, noteId: string) {
  try {
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
    
    revalidatePath(`/admin/orders/${orderId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to delete order note:", error);
    return { success: false, error: "Failed to delete note" };
  }
}

export async function updateOrderNote(orderId: string, noteId: string, newContent: string) {
    if (!newContent || !newContent.trim()) {
        return { success: false, error: "Note content cannot be empty" };
    }

    try {
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
  
      revalidatePath(`/admin/orders/${orderId}`);
      return { success: true };
    } catch (error) {
      console.error("Failed to update order note:", error);
      return { success: false, error: "Failed to update note" };
    }
}
