import React from "react";
import Link from "next/link";
import { Instagram, Facebook, Youtube } from "lucide-react";
import Image from "next/image";// Social media icons

const Footer: React.FC = () => {
  return (
    <footer className="bg-primary text-background">
      <div className="mx-auto max-w-7xl px-lg py-xxl">
        <div className="grid grid-cols-1 gap-x-md gap-y-lg sm:grid-cols-2 md:grid-cols-3">
          <div className="space-y-md">
            <h3 className="font-heading text-h3">Homemade Cakes</h3>
            <p className="font-body text-body max-w-xs">
              Handcrafted cakes for your sweetest moments.
            </p>
            <div className="flex items-center gap-md">
              <a
                href="https://www.instagram.com"
                aria-label="Instagram"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-accent"
              >
                <Instagram className="h-6 w-6" />
              </a>
              <a
                href="#"
                aria-label="Facebook"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-accent"
              >
                <Facebook className="h-6 w-6" />
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
                  href="/about"
                  className="transition-colors hover:text-accent"
                >
                  About Me
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
            © {new Date().getFullYear()} Homemade Cakes. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
