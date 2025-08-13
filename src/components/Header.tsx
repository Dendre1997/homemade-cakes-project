"use client";

import Link from "next/link";
import { useCartStore } from "@/lib/store/cartStore";
import { ShoppingBasket } from "lucide-react";

const Header = () => {
  const items = useCartStore((state) => state.items);
  const itemCount = items.length;

  return (
    <header className="bg-white shadow-sm sticky top-0 z-10">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="text-xl font-bold text-gray-900">
            Homemade Cakes
          </Link>
          <div className="flex items-center">
            <Link
              href="/products"
              className="text-sm font-medium text-gray-700 hover:text-gray-900 mr-8"
            >
              Catalog
            </Link>
            {/* Cart Icon */}
            <div className="flow-root">
              <Link
                href="/cart"
                className="group -m-2 flex items-center p-2 relative"
              >
                <ShoppingBasket
                  className="h-6 w-6 flex-shrink-0 text-blue-400 group-hover:text-gray-500"
                  aria-hidden="true"
                />
                <span className="absolute -top-1 left-5 bg-indigo-600 text-white text-xs font-bold rounded-full px-1.5 leading-tight shadow-md">
                  {itemCount}
                </span>
                <span className="sr-only">items in cart, view bag</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;