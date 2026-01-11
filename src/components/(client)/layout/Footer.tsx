import React from "react";
import Link from "next/link";
import { Instagram } from "lucide-react";
import HeaderLogo from "@/components/ui/HeaderLogo"

const Footer: React.FC = () => {
  return (
    <footer className="bg-primary text-background">
      <div className="mx-auto max-w-7xl px-lg py-xxl">
        <div className="grid grid-cols-1 gap-x-md gap-y-lg sm:grid-cols-2 md:grid-cols-3">
          <div className="space-y-md">
            <Link
              href="/"
              className="flex flex-col items-start group select-none"
            >
              <span className="font-heading text-2xl md:text-3xl font-bold tracking-wide text-accent">
                DILNA
              </span>
              <span className="font-body text-[10px] md:text-xs tracking-[0.3em] text-accent uppercase ">
                CAKES
              </span>
            </Link>
            <p className="font-body text-body max-w-xs">
              Handcrafted cakes for your sweetest moments.
            </p>
            <div className="flex items-center gap-md">
              <a
                href="https://www.instagram.com/h0memade_cakes.yyc/?igsh=bGZseHJvd3phdjZt&utm_source=qr&fbclid=IwY2xjawPP5_tleHRuA2FlbQIxMABicmlkETF1TkNaME5Qd25scEo5MFhLc3J0YwZhcHBfaWQQMjIyMDM5MTc4ODIwMDg5MgABHj0IBUcaBSqpoqo2I4WHYO6o48q9OzgxNLtWQXDG9um0f-W9y2ubTkkCxLiW_aem_1e5qLsfl-ffuVS85i_qdrw"
                aria-label="Instagram"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-accent"
              >
                <Instagram className="h-6 w-6" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="mb-md font-body text-lg font-bold">Navigation</h4>
            <ul className="space-y-sm font-body">
              <li>
                <Link
                  href="/products"
                  className="transition-colors hover:text-accent"
                >
                  Catalog
                </Link>
              </li>
              <li>
                <Link
                  href="/blog"
                  className="transition-colors hover:text-accent"
                >
                  Blog
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="transition-colors hover:text-accent"
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  href="/custom-order"
                  className="transition-colors hover:text-accent"
                >
                  Custom Orders
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-md font-body text-lg font-bold">Information</h4>
            <ul className="space-y-sm font-body">
              <li>
                <Link
                  href="/faq"
                  className="transition-colors hover:text-accent"
                >
                  FAQ
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="transition-colors hover:text-accent"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="transition-colors hover:text-accent"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-xl border-t border-background/20 pt-lg text-center">
          <p className="font-body text-small">
            © 2025 Homemade Cakes. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
