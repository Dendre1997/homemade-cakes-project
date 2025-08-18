"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import { useRouter } from "next/navigation";
import { Order } from "@/types";
import Link from "next/link";
import LoadingSpinner from "@/components/Spinner";

const ProfilePage = () => {
  const { user, isLoading: isAuthLoading } = useAuthStore();
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push("/login");
    }
  }, [user, isAuthLoading, router]);

  useEffect(() => {
    if (user) {
      const fetchOrders = async () => {
        try {
          const res = await fetch("/api/profile/orders");
          if (!res.ok) throw new Error("Failed to fetch orders");
          setOrders(await res.json());
        } catch (error) {
          console.error(error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchOrders();
    }
  }, [user]);

  if (isAuthLoading || isLoading) {
    return <LoadingSpinner />
  }

  if (!user) {
    return null;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Your Profile</h1>
        <p className="mb-8 text-gray-600">Welcome, {user.email}</p>

        <h2 className="text-2xl font-semibold mb-4">Your Order History</h2>
        {orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order._id.toString()}
                className="bg-white p-6 rounded-lg shadow-sm border"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">
                      Order #{order._id.toString().slice(-6).toUpperCase()}
                    </p>
                    <p className="text-sm text-gray-500">
                      Date: {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="px-3 py-1 text-xs font-semibold leading-5 rounded-full bg-blue-100 text-blue-800 capitalize">
                    {order.status}
                  </span>
                </div>
                <div className="mt-4 border-t pt-4">
                  <p>
                    <strong>Total:</strong> ${order.totalAmount.toFixed(2)}
                  </p>
                  {/* TODO: Add a link to the full order details page */}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>You have not placed any orders yet.</p>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
