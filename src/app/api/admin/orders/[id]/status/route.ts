import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/adminApp";
import clientPromise from "@/lib/db";
import { ObjectId } from "mongodb";
import { OrderStatus, User, Order } from "@/types";

export async function PATCH(
    request: NextRequest, 
    { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    // Validate Status
    if (!Object.values(OrderStatus).includes(status as OrderStatus)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Auth Check
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session")?.value;
    if (!sessionCookie) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true).catch(() => null);
    if (!decodedToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    
    // Verify Admin
    const adminUser = await db.collection<User>("users").findOne({ firebaseUid: decodedToken.uid });
    if (!adminUser || adminUser.role !== 'admin') {
         return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Update
    const result = await db.collection("orders").updateOne(
        { _id: new ObjectId(id) },
        { $set: { status: status } }
    );

    if (result.matchedCount === 0) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // --- TRIGGER: UPDATE USER HISTORY ---
    if (status === OrderStatus.DELIVERED) {
        const order = await db.collection<Order>("orders").findOne({ _id: new ObjectId(id) } as any);
        
        if (order && order.customerId) {
            const productIds = new Set<string>();
            if (order.items && Array.isArray(order.items)) {
                order.items.forEach((item) => {
                    if (item.productId) productIds.add(item.productId);
                });
            }

            if (productIds.size > 0) {
                await db.collection("users").updateOne(
                    { _id: new ObjectId(order.customerId) },
                    { 
                        $addToSet: { 
                            purchasedProductIds: { $each: Array.from(productIds) } 
                        } 
                    }
                );
            }
        }
    }

    return NextResponse.json({ message: "Status updated successfully" });

  } catch (error) {
    console.error("Error updating order status:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
