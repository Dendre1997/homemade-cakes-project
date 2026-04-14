import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/db";
import CustomOrderDetailClient from "@/components/admin/custom-orders/CustomOrderDetailClient";

interface PageProps {
  params: { id: string };
}

// Revalidate every 0 seconds (always fresh for admin)
export const revalidate = 0;

export default async function CustomOrderPage({ params }: PageProps) {
  const { id } = await params;

  if (!ObjectId.isValid(id)) {
    return notFound();
  }

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
}
