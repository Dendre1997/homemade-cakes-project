import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/adminApp";
import clientPromise from "@/lib/db";
import { Order, OrderStatus, CartItem } from "@/types";
import { ObjectId } from "mongodb";
import { Resend } from "resend";
import { NewOrderEmail } from "@/emails/NewOrderEmail";
import OrderConfirmationEmail from "@/emails/OrderConfirmationEmail";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { customerInfo, deliveryInfo, items, totalAmount }: Partial<Order> =
      await request.json();

    if (!customerInfo || !items || items.length === 0) {
      return NextResponse.json(
        { error: "Missing required information." },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const sessionCookie = cookies().get("session")?.value;
    let customerId: ObjectId | undefined = undefined;
    if (sessionCookie) {
      const decodedToken = await adminAuth
        .verifySessionCookie(sessionCookie, true)
        .catch(() => null);
      if (decodedToken) {
        const user = await db
          .collection("users")
          .findOne({ firebaseUid: decodedToken.uid });
        if (user) customerId = user._id;
      }
    }

    const itemsForDb = items.map((item: CartItem) => ({
      ...item,
      productId: new ObjectId(item.productId),
      categoryId: new ObjectId(item.categoryId),
      diameterId: new ObjectId(item.diameterId),
    }));

    const newOrder = {
      customerId,
      customerInfo,
      deliveryInfo: deliveryInfo
        ? {
            ...deliveryInfo,
            deliveryDates: deliveryInfo.deliveryDates.map((d) => ({
              ...d,
              date: new Date(d.date),
            })),
          }
        : ({
            method: "pickup",
            address: "",
            deliveryDates: [],
          } as Order["deliveryInfo"]),
      items: itemsForDb,
      totalAmount: totalAmount || 0,
      status: OrderStatus.NEW,
      createdAt: new Date(),
    };

    const result = await db.collection("orders").insertOne(newOrder);
const finalOrder: Order = {
  _id: result.insertedId.toString(),
  customerId: newOrder.customerId?.toString(),
  customerInfo: newOrder.customerInfo,
  deliveryInfo: newOrder.deliveryInfo,
  totalAmount: newOrder.totalAmount,
  status: newOrder.status,
  createdAt: newOrder.createdAt,
  items: newOrder.items.map((item) => ({
    ...item,
    productId: item.productId.toString(),
    categoryId: item.categoryId.toString(),
    diameterId: item.diameterId.toString(),
  })),
};
  
    try {
  await Promise.all([
    // For Admin
    resend.emails.send({
      from: "Homemade Cakes <onboarding@resend.dev>",
      to: "anastasiiadilna@gmail.com",
      subject: `New Order #${finalOrder._id.toString().slice(-6).toUpperCase()}`,
      react: NewOrderEmail({ order: finalOrder }),
    }),

    // For Client
    resend.emails.send({
      from: "Homemade Cakes <onboarding@resend.dev>",
      to: finalOrder.customerInfo.email,
      subject: `Your Order Confirmation #${finalOrder._id.toString().slice(-6).toUpperCase()}`,
      react: OrderConfirmationEmail({ order: finalOrder }),
    }),
  ]);
    } catch (emailError) {
      console.error("Error sending email:", emailError);
    }

    return NextResponse.json(
      { message: "Order created", orderId: result.insertedId },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}


export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    const orders = await db
      .collection("orders")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
