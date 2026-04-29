"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface CategoryLinkProps {
  href: string;
  children: string;
}

const CategoryLink = ({ href, children }: CategoryLinkProps) => {
  const pathname = usePathname();
  const currentPath = pathname.replace(/\/$/, "");
  const targetPath = href.replace(/\/$/, "");

  let isActive = false;

  if (targetPath === "/products") {
    isActive = currentPath === "/products";
  } else {
    isActive =
      currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);
  }

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
    "relative group font-body font-semibold transition-all duration-200 py-md",
    "px-4 py-2 rounded-lg bg-muted text-primary text-base",
    "active:scale-95",
    "sm:bg-transparent sm:text-body",
    "hover:text-accent py-md"
  )}
    >
      <span>{children}</span>
      <span
        className={cn(
          "absolute bottom-0 left-0 block h-[3px] w-full bg-accent transition-transform duration-300 transform-gpu origin-center",
          isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
        )}
      />
    </Link>
  );
};

interface CategoryNavProps {
  categories: { name: string; href: string }[];
}

const CategoryNav = ({ categories }: CategoryNavProps) => {
  return (
    <nav className="w-full overflow-x-auto border-t border-border py-5 custom-scrollbar">
      <ul className="flex items-center gap-6 md:gap-xl px-4 sm:px-6  pb-4 md:pb-0 lg:pb-0 min-w-max md:justify-center">
        <li key={"/products"} className="shrink-0">
          <CategoryLink href={"/products"}>Full Menu</CategoryLink>
        </li>
        {categories.map((cat) => (
          <li key={cat.href} className="shrink-0">
            <CategoryLink href={cat.href}>{cat.name}</CategoryLink>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default CategoryNav;
