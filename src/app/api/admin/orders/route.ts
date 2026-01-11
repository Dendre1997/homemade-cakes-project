import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/adminApp";
import clientPromise from "@/lib/db";
import { OrderStatus,  User } from "@/types";
import { ObjectId } from "mongodb";


export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session")?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decodedToken = await adminAuth
       .verifySessionCookie(sessionCookie, true)
       .catch(() => null);

    if (!decodedToken) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    
    // Verify Admin Role
    const adminUser = await db.collection<User>("users").findOne({ firebaseUid: decodedToken.uid });
    if (!adminUser || adminUser.role !== 'admin') {
         return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const query: any = {};

    if (startDate && endDate) {
        query["deliveryInfo.deliveryDates.date"] = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
    }

    const orders = await db.collection("orders")
        .find(query)
        .sort({ "deliveryInfo.deliveryDates.0.date": 1 })
        .toArray();

    return NextResponse.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session")?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decodedToken = await adminAuth
       .verifySessionCookie(sessionCookie, true)
       .catch(() => null);

    if (!decodedToken) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    const adminUser = await db.collection<User>("users").findOne({ firebaseUid: decodedToken.uid });
    if (!adminUser || adminUser.role !== 'admin') {
         return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { 
        customerInfo, 
        items, 
        deliveryInfo, 
        source = 'other', 
        isPaid = false,
        paymentDetails
    } = body;

    if (!customerInfo || !customerInfo.phone || !items || items.length === 0) {
        return NextResponse.json({ error: "Missing required fields: Customer Phone and Items are mandatory." }, { status: 400 });
    }

    let userId: ObjectId | undefined = undefined;
    const existingUser = await db.collection<User>("users").findOne({
        $or: [
            { phone: customerInfo.phone },
            { email: customerInfo.email }
        ]
    });

    if (existingUser) {
        userId = new ObjectId(existingUser._id);
      }
      
    let calculatedTotal = 0;
    
    const itemsForDb = items.map((item: any) => {
        const lineTotal = Number(item.price) * Number(item.quantity);
        calculatedTotal += lineTotal;

        return {
            ...item,
            productId: item.productId ? new ObjectId(String(item.productId)) : undefined,
            categoryId: item.categoryId ? new ObjectId(String(item.categoryId)) : undefined,
            diameterId: item.diameterId ? new ObjectId(String(item.diameterId)) : undefined,
            
            // Explicitly cast numbers
            price: Number(item.price),
            quantity: Number(item.quantity),
            rowTotal: lineTotal,
            isCustom: !!item.isCustom,
            
            // Safety: Ensure name is present
            name: item.name || "Custom Item"
        };
    });

    const newOrder = {
        customerId: userId,
        customerInfo,
        deliveryInfo: {
            ...deliveryInfo,
            // Ensure date is a Date object
            deliveryDates: deliveryInfo.deliveryDates?.map((d: any) => ({
                ...d,
                date: new Date(d.date)
            })) || []
        },
        items: itemsForDb,
        totalAmount: calculatedTotal,
        status: isPaid ? OrderStatus.PAID : OrderStatus.NEW, // If marked as paid, set to PAID 
        isPaid: !!isPaid, // Explicit Flag
        source, // 'web', 'instagram', etc.
        paymentDetails: paymentDetails || (isPaid ? { method: 'manual', status: 'completed' } : undefined),
        createdAt: new Date(),
    };

    if (isPaid) {
        newOrder.status = OrderStatus.NEW; 
    } else {
        newOrder.status = OrderStatus.NEW;
    }

    const result = await db.collection("orders").insertOne(newOrder);

    return NextResponse.json({ 
        message: "Manual order created successfully", 
        orderId: result.insertedId 
    }, { status: 201 });

  } catch (error) {
    console.error("Error creating manual order:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
