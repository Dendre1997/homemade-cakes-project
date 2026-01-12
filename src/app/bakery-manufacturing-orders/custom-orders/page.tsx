
import clientPromise from "@/lib/db";
import { MessageCircle } from "lucide-react";
import { CustomOrder } from "@/types";
import { CustomOrderCard } from "@/components/admin/custom-orders/CustomOrderCard";

// Revalidate every 60 seconds to keep list fresh, or 0 for dynamic
export const revalidate = 0; 

export default async function CustomOrdersListPage() {
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB_NAME);

  const customOrders = (await db
    .collection("custom_orders")
    .find({})
    .sort({ eventDate: 1 }) // Upcoming first
    .toArray()) as unknown as CustomOrder[];

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold font-heading text-primary">Custom Order Requests</h1>
          <p className="text-gray-500 mt-1">Manage incoming leads and convert them to production orders.</p>
        </div>
        
        <div className="bg-white px-4 py-2 rounded-lg shadow-sm border text-sm">
            <span className="font-bold text-lg">{customOrders.filter(o => o.status === 'new').length}</span> New Requests
        </div>
      </div>

      <div className="space-y-4">
        {customOrders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-12 text-center text-gray-500 flex flex-col items-center">
            <MessageCircle className="w-12 h-12 mb-4 opacity-20" />
            <h3 className="text-lg font-medium">No Request Yet</h3>
            <p>Wait for customers to submit the "Dream Cake" form.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {customOrders.map((order) => (
               <CustomOrderCard key={order._id} order={order} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
