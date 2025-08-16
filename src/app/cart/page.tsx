"use client";

import { useCartStore } from "@/lib/store/cartStore";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import LoadingSpinner from "@/components/Spinner";

const CartPage = () => {
  const { items, removeItem, clearCart } = useCartStore();

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const subtotal = items.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  if (!isMounted) {
    return <LoadingSpinner />;
  }

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-2xl px-4 pt-16 pb-24 sm:px-6 lg:max-w-7xl lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          Shopping Cart
        </h1>

        {items.length === 0 ? (
          <div className="mt-12">
            <p>Your cart is empty.</p>
            <Link
              href="/products"
              className="text-indigo-600 hover:text-indigo-500 font-medium"
            >
              Continue Shopping &rarr;
            </Link>
          </div>
        ) : (
          <form className="mt-12 lg:grid lg:grid-cols-12 lg:items-start lg:gap-x-12 xl:gap-x-16">
            <section aria-labelledby="cart-heading" className="lg:col-span-7">
              <h2 id="cart-heading" className="sr-only">
                Items in your shopping cart
              </h2>
              <ul
                role="list"
                className="divide-y divide-gray-200 border-b border-t border-gray-200"
              >
                {items.map((item) => (
                  <li key={item.id} className="flex py-6 sm:py-10">
                    <div className="flex-shrink-0">
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        width={100}
                        height={100}
                        className="h-24 w-24 rounded-md object-cover object-center sm:h-48 sm:w-48"
                      />
                    </div>
                    <div className="ml-4 flex flex-1 flex-col justify-between sm:ml-6">
                      <div>
                        <h3 className="text-base font-medium text-gray-900">
                          {item.name}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                          {item.flavor}
                        </p>
                        {/* TODO: Add display for size here */}
                      </div>
                      <div className="flex flex-1 items-end justify-between text-sm">
                        <p className="text-gray-900 font-medium">
                          ${item.price.toFixed(2)}
                        </p>
                        <div className="flex">
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="font-medium text-indigo-600 hover:text-indigo-500"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            {/* Order summary */}
            <section
              aria-labelledby="summary-heading"
              className="mt-16 rounded-lg bg-gray-50 px-4 py-6 sm:p-6 lg:col-span-5 lg:mt-0 lg:p-8"
            >
              <h2
                id="summary-heading"
                className="text-lg font-medium text-gray-900"
              >
                Order summary
              </h2>
              <dl className="mt-6 space-y-4">
                <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                  <dt className="text-base font-medium text-gray-900">
                    Order total
                  </dt>
                  <dd className="text-base font-medium text-gray-900">
                    ${subtotal.toFixed(2)}
                  </dd>
                </div>
              </dl>
              <div className="mt-6">
                <Link
                  href="/checkout"
                  className="w-full rounded-md border border-transparent bg-indigo-600 px-4 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-700"
                >
                  Checkout
                </Link>
              </div>
            </section>
          </form>
        )}
      </div>
    </div>
  );
};

export default CartPage;
