
import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/db";
import CustomOrderDesigner from "@/components/admin/custom-orders/CustomOrderDesigner";

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

  //Fetch the Custom Order
  const customOrder = await db
    .collection("custom_orders")
    .findOne({ _id: new ObjectId(id) });

  if (!customOrder) {
    return notFound();
  }

  //Fetch Options (Flavors & Diameters)
  const [flavors, diameters] = await Promise.all([
    db.collection("flavors").find({}).sort({ name: 1 }).toArray(),
    db.collection("diameters").find({}).sort({ sizeValue: 1 }).toArray(),
  ]);

  // Serialize MongoDB objects (convert _id to string for Client Component)
  const serializedOrder: any = {
    ...customOrder,
    _id: customOrder._id.toString(),
    createdAt: customOrder.createdAt ? new Date(customOrder.createdAt).toISOString() : undefined,
    eventDate: customOrder.eventDate ? new Date(customOrder.eventDate).toISOString() : undefined,
    updatedAt: customOrder.updatedAt ? new Date(customOrder.updatedAt).toISOString() : undefined,
  };

  const serializedFlavors = flavors.map(f => ({ ...f, _id: f._id.toString() }));
  const serializedDiameters = diameters.map(d => ({ ...d, _id: d._id.toString() }));

  return (
    <CustomOrderDesigner 
      customOrder={serializedOrder} 
      flavors={serializedFlavors as any[]} 
      diameters={serializedDiameters as any[]} 
    />
  );
}
