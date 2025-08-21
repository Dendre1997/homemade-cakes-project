"use client";

import { useRouter } from "next/navigation";
import { useCartStore } from "@/lib/store/cartStore";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import LoadingSpinner from "@/components/Spinner";

const CheckoutPage = () => {
  const router = useRouter()
  const { items, clearCart } = useCartStore();

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);


  const subtotal = items.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsProcessing(true);
    setError(null);
    const orderData = {
      customerInfo: { name, email, phone },
      deliveryInfo: { method: "delivery", address },
      items,
      totalAmount: subtotal,
    };
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        throw new Error("Something went wrong while placing the order.");
      }

      alert("Thank you for your order!");
      clearCart();
      router.push("/products");
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      else setError("An unknown error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isMounted) {
    return <LoadingSpinner />; 
  }

  return (
    <div className="bg-gray-50">
      <main className="mx-auto max-w-7xl px-4 pt-16 pb-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:max-w-none">
          <h1 className="sr-only">Checkout</h1>

          {items.length === 0 ? (
            <div>
              <h2 className="text-2xl font-bold">Your cart is empty</h2>
              <Link
                href="/products"
                className="text-indigo-600 hover:text-indigo-500 font-medium"
              >
                Continue Shopping &rarr;
              </Link>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="lg:grid lg:grid-cols-2 lg:gap-x-12 xl:gap-x-16"
            >
              {/* Contact Information Form */}
              <div className="mt-10 border-t border-gray-200 pt-10">
                <h2 className="text-lg font-medium text-gray-900">
                  Contact information
                </h2>
                <div className="mt-4 grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-4">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Name
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="block w-full rounded-md border-gray-300 shadow-sm"
                      />
                    </div>
                  </div>
                  {/* ... More fields can be added here if needed */}
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Email address
                    </label>
                    <div className="mt-1">
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="block w-full rounded-md border-gray-300 shadow-sm"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="phone"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Phone
                    </label>
                    <div className="mt-1">
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        className="block w-full rounded-md border-gray-300 shadow-sm"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="address"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Address
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        id="address"
                        name="address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        required
                        className="block w-full rounded-md border-gray-300 shadow-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Summary */}
              <div className="mt-10 lg:mt-0">
                <h2 className="text-lg font-medium text-gray-900">
                  Order summary
                </h2>
                <div className="mt-4 rounded-lg border border-gray-200 bg-white shadow-sm">
                  <ul role="list" className="divide-y divide-gray-200">
                    {items.map((item) => (
                      <li key={item.id} className="flex py-6 px-4 sm:px-6">
                        <div className="flex-shrink-0">
                          <Image
                            src={item.imageUrl}
                            alt={item.name}
                            width={80}
                            height={80}
                            className="w-20 rounded-md"
                          />
                        </div>
                        <div className="ml-6 flex flex-1 flex-col">
                          <div className="flex">
                            <div className="min-w-0 flex-1">
                              <h4 className="text-sm font-medium text-gray-700">
                                {item.name}
                              </h4>
                              <p className="mt-1 text-sm text-gray-500">
                                {item.flavor}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-1 items-end justify-between pt-2">
                            <p className="mt-1 text-sm font-medium text-gray-900">
                              ${item.price.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <dl className="space-y-6 border-t border-gray-200 py-6 px-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <dt className="text-sm">Subtotal</dt>
                      <dd className="text-sm font-medium text-gray-900">
                        ${subtotal.toFixed(2)}
                      </dd>
                    </div>
                    {/* Add shipping, taxes etc. later */}
                    <div className="flex items-center justify-between border-t border-gray-200 pt-6">
                      <dt className="text-base font-medium">Total</dt>
                      <dd className="text-base font-medium text-gray-900">
                        ${subtotal.toFixed(2)}
                      </dd>
                    </div>
                  </dl>
                  <div className="border-t border-gray-200 py-6 px-4 sm:px-6">
                    <button
                      type="submit"
                      disabled={isProcessing}
                      className="w-full rounded-md border border-transparent bg-indigo-600 px-4 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-700"
                    >
                      Place Order
                    </button>
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
};
export default CheckoutPage;
