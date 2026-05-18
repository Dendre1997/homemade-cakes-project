import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/db";
import CustomOrderDetailClient from "@/components/admin/custom-orders/CustomOrderDetailClient";

interface PageProps {
  params: { id: string };
}

// Ensure Next.js does not statically cache this page
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CustomOrderPage({ params }: PageProps) {
  const { id } = await params;

  if (!ObjectId.isValid(id)) {
    return notFound();
  }

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);

    // Fetch the Custom Order
    const customOrder = await db
      .collection("custom_orders")
      .findOne({ _id: new ObjectId(id) });

    if (!customOrder) {
      return notFound();
    }

    // Serialize MongoDB objects (convert dates and IDs for Client Component)
    const serializedOrder: any = {
      ...customOrder,
      _id: customOrder._id.toString(),
      date: customOrder.date ? new Date(customOrder.date).toISOString() : undefined,
      eventDate: customOrder.eventDate ? new Date(customOrder.eventDate).toISOString() : undefined,
      createdAt: customOrder.createdAt ? new Date(customOrder.createdAt).toISOString() : undefined,
      updatedAt: customOrder.updatedAt ? new Date(customOrder.updatedAt).toISOString() : undefined,
    };

    return (
      <CustomOrderDetailClient 
        initialOrder={serializedOrder} 
      />
    );
  } catch (error) {
    console.error(`Failed to fetch custom order ${id}:`, error);
    return (
      <div className="p-8 text-center min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="p-6 max-w-md rounded-xl border border-destructive/20 bg-destructive/10 text-destructive">
          <h2 className="text-xl font-bold mb-2">⚠️ Database Connection Issue</h2>
          <p className="text-sm">We timed out trying to connect to the database. This frequently occurs during cold starts. Please reload the page to try again.</p>
        </div>
      </div>
    );
  }
}
