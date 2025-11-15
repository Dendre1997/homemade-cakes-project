import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/adminApp";
import clientPromise from "@/lib/db";
import { Order, OrderStatus, CartItem, OrderItem } from "@/types";
import { ObjectId } from "mongodb";
import { Resend } from "resend";
import { NewOrderEmail } from "@/emails/NewOrderEmail";
import OrderConfirmationEmail from "@/emails/OrderConfirmationEmail";
import PendingOrderAdminEmail  from "@/emails/PendingOrderAdminEmail";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const orderData = await request.json();

    if (orderData.status === OrderStatus.PENDING_CONFIRMATION) {
      console.log("Processing order requiring confirmation...");

      const {
        customerInfo,
        deliveryInfo,
        items,
        totalAmount,
      }: {
        customerInfo: Order["customerInfo"];
        deliveryInfo: {
          method: "pickup" | "delivery";
          address?: string;
          deliveryDates: { date: Date; itemIds: string[]; timeSlot: string }[];
        };
        items: CartItem[];
        totalAmount: number;
      } = orderData;


      if (!customerInfo || !items || items.length === 0 || !totalAmount) {
        return NextResponse.json(
          { error: "Missing required info for pending order." },
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

      const itemsForDb = items.map(
        (item: CartItem): OrderItem => ({
          ...item,
          quantity: Number(item.quantity),
          productId: new ObjectId(item.productId),
          categoryId: new ObjectId(item.categoryId),
          diameterId: new ObjectId(item.diameterId),
        })
      );

      const pendingOrder = {
        customerId,
        customerInfo,
        deliveryInfo: {
          method: deliveryInfo.method,
          address: deliveryInfo.address,
          deliveryDates: [],
        },
        items: itemsForDb,
        totalAmount: totalAmount || 0,
        status: OrderStatus.PENDING_CONFIRMATION,
        createdAt: new Date(),
      };

      const result = await db.collection("orders").insertOne(pendingOrder);
      const orderId = result.insertedId;
      console.log(`Order ${orderId} saved with status 'pending_confirmation'.`);

      const finalPendingOrder: Order = {
        _id: orderId.toString(),
        customerId: pendingOrder.customerId?.toString(),
        customerInfo: pendingOrder.customerInfo,
        deliveryInfo: pendingOrder.deliveryInfo,
        totalAmount: pendingOrder.totalAmount,
        status: pendingOrder.status,
        createdAt: pendingOrder.createdAt,
        items: pendingOrder.items.map((item) => ({
          ...item,
          productId: item.productId.toString(),
          categoryId: item.categoryId.toString(),
          diameterId: item.diameterId.toString(),
        })),
      };

      try {
        await resend.emails.send({
          from: "Homemade Cakes <onboarding@resend.dev>",
          to: "anastasiiadilna@gmail.com",
          subject: `ACTION REQUIRED: Order #${finalPendingOrder._id.toString().slice(-6).toUpperCase()} Needs Confirmation`,
          react: PendingOrderAdminEmail({ order: finalPendingOrder }),
          // react: NewOrderEmail({ order: finalPendingOrder, needsConfirmation: true }),
        });
        console.log(`Admin notification sent for pending order ${orderId}.`);
      } catch (emailError) {
        console.error("Error sending admin notification email:", emailError);
      }

      return NextResponse.json(
        {
          message: "Order submitted for confirmation",
          orderId: orderId,
          status: OrderStatus.PENDING_CONFIRMATION,
        },
        { status: 201 }
      );
    } else {
      console.log("Processing standard order..."); // Log entry
      const {
        customerInfo,
        deliveryInfo,
        items,
        totalAmount,
      }: {
        customerInfo: Order["customerInfo"];
        deliveryInfo: {
          method: "pickup" | "delivery";
          address?: string;
          deliveryDates: {
            date: Date | string;
            itemIds: string[];
            timeSlot: string;
          }[];
        };
        items: CartItem[];
        totalAmount: number;
      } = orderData;

      if (
        !customerInfo ||
        !deliveryInfo ||
        !deliveryInfo.deliveryDates ||
        deliveryInfo.deliveryDates.length === 0 ||
        !items ||
        items.length === 0 ||
        !totalAmount
      ) {
        return NextResponse.json(
          { error: "Missing required order information." },
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

      const itemsForDb = items.map(
        (item: CartItem): OrderItem => ({
          ...item,
          quantity: Number(item.quantity),
          productId: new ObjectId(item.productId),
          categoryId: new ObjectId(item.categoryId),
          diameterId: new ObjectId(item.diameterId),
        })
      );

      const newOrder = {
        customerId,
        customerInfo,
        deliveryInfo: {
          method: deliveryInfo.method,
          address: deliveryInfo.address,
          deliveryDates: deliveryInfo.deliveryDates.map((d) => ({
            ...d,
            date: new Date(d.date),
          })),
        },
        items: itemsForDb,
        totalAmount: totalAmount || 0,
        status: OrderStatus.NEW,
        createdAt: new Date(),
      };

      const result = await db.collection("orders").insertOne(newOrder);
      const orderId = result.insertedId;
      console.log(`Standard order ${orderId} created with status 'new'.`);

      const finalOrder: Order = {
        _id: orderId.toString(),
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
          resend.emails.send({
            from: "Homemade Cakes <onboarding@resend.dev>",
            to: "anastasiiadilna@gmail.com",
            subject: `New Order #${finalOrder._id.toString().slice(-6).toUpperCase()}`,
            react: NewOrderEmail({ order: finalOrder }),
          }),
          resend.emails.send({
            from: "Homemade Cakes <onboarding@resend.dev>",
            to: finalOrder.customerInfo.email,
            subject: `Your Order Confirmation #${finalOrder._id.toString().slice(-6).toUpperCase()}`,
            react: OrderConfirmationEmail({ order: finalOrder }),
          }),
        ]);
        console.log(`Confirmation emails sent for order ${orderId}.`);
      } catch (emailError) {
        console.error("Error sending confirmation emails:", emailError);
      }
      return NextResponse.json(
        { message: "Order created", orderId: orderId },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error("Error creating order:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Internal Server Error", details: errorMessage },
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
