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
      className="relative group py-md font-body text-body font-semibold text-primary transition-colors hover:text-accent"
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
    <nav className="hidden md:flex justify-center border-t border-border bg-white py-5">
      <ul className="flex items-center gap-xl">
        <li key={'/products'}>
            <CategoryLink href={"/products"}>All</CategoryLink>
          </li>
        {categories.map((cat) => (
          <li key={cat.href}>
            <CategoryLink href={cat.href}>{cat.name}</CategoryLink>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default CategoryNav;
