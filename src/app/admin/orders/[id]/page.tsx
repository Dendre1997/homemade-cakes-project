"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Order, Diameter } from "@/types";
import Link from "next/link";
import Image from "next/image";
import LoadingSpinner from "@/components/Spinner";

const OrderDetailsPage = () => {
  const params = useParams();
  const id = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [diameters, setDiameters] = useState<Diameter[]>([]);

  const [newStatus, setNewStatus] = useState("");

  const fetchOrder = useCallback(async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      const res = await fetch(`/api/orders/${id}`);
      if (!res.ok) throw new Error("Failed to fetch order details");
      const data = await res.json();
      setOrder(data);
      setNewStatus(data.status); 
    } catch (err) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      const fetchAllData = async () => {
        try {
          setIsLoading(true);
          const [orderRes, diametersRes] = await Promise.all([
            fetch(`/api/orders/${id}`),
            fetch("/api/diameters"),
          ]);

          if (!orderRes.ok || !diametersRes.ok)
            throw new Error("Failed to fetch data");

          const orderData = await orderRes.json();
          setOrder(orderData);
          setNewStatus(orderData.status);
          setDiameters(await diametersRes.json());
        } catch (err) {
          if (err instanceof Error) setError(err.message);
        } finally {
          setIsLoading(false);
        }
      };
      fetchAllData();
    }
  }, [id]);

  const handleStatusUpdate = async () => {
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");

      alert("Status updated successfully!");
      fetchOrder();
    } catch (error) {
      console.error(error);
      alert("Error updating status");
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <p className="text-red-500">Error: {error}</p>;
  if (!order) return <p>Order not found.</p>;

  return (
    <section>
      <Link
        href="/admin/orders"
        className="text-indigo-600 hover:text-indigo-500 mb-6 inline-block"
      >
        &larr; Back to all orders
      </Link>
      <h1 className="text-3xl font-bold mb-6">
        Order #{order._id.toString().slice(-6)}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Items</h2>
            <ul className="divide-y divide-gray-200">
              {order.items.map((item) => {
                
                const diameter = diameters.find(
                  (d) => d._id.toString() === item.diameterId.toString()
                );

                return (
                  <li key={item.id} className="py-4 flex ">
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      width={64}
                      height={64}
                      className="h-16 w-16 rounded-md object-cover"
                    />
                    <div className="ml-4">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-500">{item.flavor}</p>
                      {diameter && (
                        <p className="text-sm text-gray-500">{diameter.name}</p>
                      )}
                    </div>
                    <p className="ml-auto font-medium">
                      ${item.price.toFixed(2)}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Customer & Status Info */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Customer Details</h2>
            <div className="text-sm space-y-2">
              <p>
                <strong>Name:</strong> {order.customerInfo.name}
              </p>
              <p>
                <strong>Email:</strong> {order.customerInfo.email}
              </p>
              <p>
                <strong>Phone:</strong> {order.customerInfo.phone}
              </p>
              <p>
                <strong>Address:</strong> {order.deliveryInfo.address}
              </p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Order Status</h2>
            <div className="space-y-4">
              <p>
                Current status:{" "}
                <span className="font-bold capitalize">{order.status}</span>
              </p>
              <div>
                <label
                  htmlFor="status-select"
                  className="block text-sm font-medium mb-1"
                >
                  Change status
                </label>
                <select
                  id="status-select"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option value="new">New</option>
                  <option value="paid">Paid</option>
                  <option value="in_progress">In Progress</option>
                  <option value="ready">Ready for Pickup/Delivery</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <button
                onClick={handleStatusUpdate}
                className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700"
              >
                Update Status
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OrderDetailsPage;
