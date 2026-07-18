import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/adminApp";
import { withMongoClient } from "@/lib/db";
import { mongoUnavailableResponse } from "@/lib/db/mongoHttp";
import { OrderStatus, User } from "@/types";
import { ObjectId } from "mongodb";
import { resend, DEFAULT_FROM } from "@/lib/email";
import OrderConfirmationEmail from "@/emails/OrderConfirmationEmail";
import { render } from "@react-email/render";
import { getAppSettings } from "@/lib/api/settings";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("admin_session")?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decodedToken = await adminAuth
      .verifySessionCookie(sessionCookie, true)
      .catch(() => null);

    if (!decodedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const result = await withMongoClient(async (client) => {
      const db = client.db(process.env.MONGODB_DB_NAME);

      // Verify Admin Role
      const adminUser = await db
        .collection<User>("users")
        .findOne({ firebaseUid: decodedToken.uid });
      if (!adminUser || adminUser.role !== "admin") {
        return { forbidden: true as const };
      }

      const query: Record<string, unknown> = {};

      if (startDate && endDate) {
        query["deliveryInfo.deliveryDates.date"] = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }

      const orders = await db
        .collection("orders")
        .find(query)
        .sort({ "deliveryInfo.deliveryDates.0.date": 1 })
        .toArray();

      return { orders };
    });

    if ("forbidden" in result) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(result.orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    return (
      mongoUnavailableResponse(error) ??
      NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("admin_session")?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decodedToken = await adminAuth
      .verifySessionCookie(sessionCookie, true)
      .catch(() => null);

    if (!decodedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      customerInfo,
      items,
      deliveryInfo,
      source = "other",
      isPaid = false,
      paymentDetails,
    } = body;

    if (!customerInfo || !items || items.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: Items are mandatory." },
        { status: 400 }
      );
    }

    // Mongo write path: single atomic insertOne. Auth lookup + user lookup are reads.
    // Email side-effects run AFTER this block so a deadline/503 cannot fire after
    // the order document has already been persisted.
    const writeResult = await withMongoClient(async (client) => {
      const db = client.db(process.env.MONGODB_DB_NAME);
      const adminUser = await db
        .collection<User>("users")
        .findOne({ firebaseUid: decodedToken.uid });
      if (!adminUser || adminUser.role !== "admin") {
        return { forbidden: true as const };
      }

      let userId: ObjectId | undefined = undefined;
      const existingUser = await db.collection<User>("users").findOne({
        $or: [{ phone: customerInfo.phone }, { email: customerInfo.email }],
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
          productId: item.productId
            ? new ObjectId(String(item.productId))
            : undefined,
          categoryId: item.categoryId
            ? new ObjectId(String(item.categoryId))
            : undefined,
          diameterId: item.diameterId
            ? new ObjectId(String(item.diameterId))
            : undefined,
          shapeId:
            item.shapeId && ObjectId.isValid(String(item.shapeId))
              ? new ObjectId(String(item.shapeId))
              : undefined,

          price: Number(item.price),
          quantity: Number(item.quantity),
          rowTotal: lineTotal,
          isCustom: !!item.isCustom,

          name: item.name || "Custom Item",
        };
      });

      const newOrder = {
        customerId: userId,
        customerInfo,
        deliveryInfo: {
          ...deliveryInfo,
          deliveryDates:
            deliveryInfo.deliveryDates?.map((d: any) => ({
              ...d,
              date: new Date(d.date),
            })) || [],
        },
        items: itemsForDb,
        totalAmount: calculatedTotal,
        status: isPaid ? OrderStatus.PAID : OrderStatus.NEW,
        isPaid: !!isPaid,
        source,
        paymentDetails:
          paymentDetails ||
          (isPaid ? { method: "manual", paidAt: new Date() } : undefined),
        createdAt: new Date(),
      };

      const result = await db.collection("orders").insertOne(newOrder);

      return {
        insertedId: result.insertedId,
        newOrder,
      };
    });

    if ("forbidden" in writeResult) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const { insertedId, newOrder } = writeResult;

    // Side effect only — order is already committed. Failures here must not
    // surface as 503 / imply the write failed.
    if (
      newOrder.customerInfo?.email &&
      newOrder.customerInfo.email.trim() !== "" &&
      !newOrder.customerInfo.email.includes("@placeholder.com")
    ) {
      try {
        const finalOrder = {
          ...newOrder,
          _id: insertedId.toString(),
          customerId: newOrder.customerId?.toString(),
          items: newOrder.items.map((item: any) => ({
            ...item,
            productId: item.productId?.toString(),
            categoryId: item.categoryId?.toString(),
            diameterId: item.diameterId?.toString(),
            shapeId: item.shapeId?.toString(),
          })),
        };

        const maps = await withMongoClient(async (client) => {
          const db = client.db(process.env.MONGODB_DB_NAME);
          const [flavors, diameters, shapes] = await Promise.all([
            db.collection("flavors").find({}).toArray(),
            db.collection("diameters").find({}).toArray(),
            db.collection("shapes").find({}).toArray(),
          ]);
          return {
            flavorMap: flavors.reduce(
              (acc, flavor) => {
                acc[flavor._id.toString()] = flavor.name;
                return acc;
              },
              {} as Record<string, string>
            ),
            diameterMap: diameters.reduce(
              (acc, d) => {
                acc[d._id.toString()] = d.name || d.sizeValue?.toString() + '"';
                return acc;
              },
              {} as Record<string, string>
            ),
            shapeMap: shapes.reduce(
              (acc, s) => {
                acc[s._id.toString()] = s.name;
                return acc;
              },
              {} as Record<string, string>
            ),
          };
        });

        const settings = await getAppSettings();
        const pickupAddress = settings.checkout?.pickupAddress || "";

        const htmlContent = await render(
          OrderConfirmationEmail({
            order: finalOrder as any,
            flavorMap: maps.flavorMap,
            diameterMap: maps.diameterMap,
            shapeMap: maps.shapeMap,
            pickupAddress,
          } as any)
        );

        await resend.emails.send({
          from: DEFAULT_FROM,
          to: newOrder.customerInfo.email,
          subject: `Your Order Confirmation #${insertedId
            .toString()
            .slice(-6)
            .toUpperCase()}`,
          html: htmlContent,
        });
        console.log(
          `Confirmation email sent to ${newOrder.customerInfo.email} for order ${insertedId}`
        );
      } catch (emailError) {
        console.error("Error sending confirmation email:", emailError);
      }
    }

    return NextResponse.json(
      {
        message: "Manual order created successfully",
        orderId: insertedId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating manual order:", error);
    return (
      mongoUnavailableResponse(error) ??
      NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    );
  }
}
