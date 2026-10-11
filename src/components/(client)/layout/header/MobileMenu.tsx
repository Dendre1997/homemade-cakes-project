"use client";

import { useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  X,
  LogOut,
  UserCircle,
  MessageSquare,
  ShieldCheck,
  Menu,
  WandSparkles,
  GalleryHorizontalEnd,
  Crown,
  LayoutGrid,
} from "lucide-react";
import { User, Collection, SeasonalEvent } from "@/types";
import { cn, focusWithVisibleIndicator } from "@/lib/utils";
import SearchInput from "./SearchInput";
import HeaderLogo from "@/components/ui/HeaderLogo";
import { Sparkles } from "lucide-react";
import { MenuItem } from "./MenuItem";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  menuTriggerRef?: { readonly current: HTMLElement | null };
  categories: { name: string; href: string; imageUrl: string }[];
  secondaryLinks: { name: string; href: string; icon: React.ElementType }[];
  user: User | null;
  handleLogout: () => void;
  activeSeasonalEvent: SeasonalEvent | null;
  collections: Collection[];
}

const MobileMenu = ({
  isOpen,
  onClose,
  menuTriggerRef,
  categories,
  secondaryLinks,
  user,
  handleLogout,
  activeSeasonalEvent,
  collections,
}: MobileMenuProps) => {
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <Dialog.Root
      modal
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            "fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 md:hidden",
            "data-[state=open]:opacity-100 data-[state=closed]:opacity-0",
            "data-[state=closed]:pointer-events-none",
          )}
        />

        <Dialog.Content
          id="mobile-navigation-menu"
          aria-modal={true}
          aria-describedby={undefined}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            focusWithVisibleIndicator(closeButtonRef.current);
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            focusWithVisibleIndicator(menuTriggerRef?.current ?? null);
          }}
          className={cn(
            "fixed top-0 left-0 z-50 flex h-full w-full max-w-sm flex-col bg-background outline-none md:hidden",
            "transition-transform duration-300 ease-in-out",
            "data-[state=open]:translate-x-0 data-[state=closed]:-translate-x-full",
          )}
        >
          <Dialog.Title className="sr-only">Navigation menu</Dialog.Title>

          <div className="relative flex h-16 items-center justify-between border-b border-border p-md">
            <div className="z-10">
              <SearchInput
                onExpandChange={setIsSearchExpanded}
                onSelect={onClose}
                className={cn(
                  "flex",
                  isSearchExpanded
                    ? "w-[70vw] sm:w-80"
                    : "w-10 rounded-full bg-accent/10 p-2",
                )}
              />
            </div>

            <div
              className={cn(
                "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
                "transition-all duration-300 ease-in-out",
                "w-32 md:w-40",
                isSearchExpanded
                  ? "pointer-events-none scale-90 opacity-0"
                  : "scale-100 opacity-100",
              )}
              onClick={onClose}
            >
              <div className="flex flex-col items-center">
                <HeaderLogo size="80%" />
              </div>
            </div>

            <Dialog.Close asChild>
              <button
                ref={closeButtonRef}
                type="button"
                aria-label="Close menu"
                className="z-10 shrink-0 rounded-full bg-subtleBackground p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              >
                <X className="h-6 w-6 text-primary" aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>

          <nav className="flex-grow overflow-y-auto px-3 pb-6 pt-2">
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-1">
                <MenuItem
                  href="/products"
                  icon={Menu}
                  label="Full Menu"
                  onClick={onClose}
                  badge="All products"
                  prefetch={false}
                />
                <MenuItem
                  prefetch={false}
                  href="/custom-order"
                  icon={WandSparkles}
                  label="Start Your Custom Order"
                  onClick={onClose}
                  badge="Custom Form"
                />
                <MenuItem
                  prefetch={false}
                  href="/gallery"
                  icon={GalleryHorizontalEnd}
                  label="See Designs"
                  onClick={onClose}
                  badge="References"
                />

                {activeSeasonalEvent && (
                  <MenuItem
                    prefetch={false}
                    href={`/specials/${activeSeasonalEvent.slug}`}
                    icon={Sparkles}
                    label={activeSeasonalEvent.name}
                    onClick={onClose}
                    badge="Limited"
                    highlight={true}
                  />
                )}
              </div>

              <div className="my-2 h-px w-full bg-border/50" />

              <div className="flex flex-col gap-1">
                <div className="px-3 pb-1 pt-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary/40">
                    Categories
                  </span>
                </div>
                {categories.map((cat) => (
                  <MenuItem
                    prefetch={false}
                    key={cat.href}
                    href={cat.href}
                    icon={LayoutGrid}
                    imageUrl={cat.imageUrl}
                    label={cat.name}
                    onClick={onClose}
                  />
                ))}

                {collections.length > 0 && (
                  <>
                    <div className="px-3 pb-1 pt-4">
                      <span className="text-xs font-bold uppercase tracking-wider text-primary/40">
                        Collections
                      </span>
                    </div>
                    {collections.map((col) => (
                      <MenuItem
                        prefetch={false}
                        key={col._id.toString()}
                        href={`/products/collections/${col.slug}`}
                        icon={Crown}
                        imageUrl={col.imageUrl}
                        label={col.name}
                        onClick={onClose}
                      />
                    ))}
                  </>
                )}
              </div>

              <div className="my-2 h-px w-full bg-border/50" />

              <div className="flex flex-col gap-1">
                {secondaryLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <MenuItem
                      prefetch={false}
                      key={link.href}
                      href={link.href}
                      icon={Icon}
                      label={link.name}
                      onClick={onClose}
                    />
                  );
                })}

                {user ? (
                  <>
                    <MenuItem
                      prefetch={false}
                      href="/profile"
                      icon={UserCircle}
                      label="Profile"
                      onClick={onClose}
                    />
                    <button
                      type="button"
                      aria-label="Logout"
                      onClick={() => {
                        handleLogout();
                        onClose();
                      }}
                      className="group flex w-full cursor-pointer items-center justify-between rounded-[16px] p-2.5 text-left transition-all duration-300 hover:bg-error/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-error/10 text-error transition-all duration-300 group-hover:bg-error group-hover:text-white group-hover:shadow-sm">
                          <LogOut className="h-5 w-5 stroke-[1.5]" aria-hidden="true" />
                        </div>
                        <span className="font-body text-[15px] font-medium text-error transition-colors group-hover:text-error">
                          Logout
                        </span>
                      </div>
                    </button>
                  </>
                ) : (
                  <MenuItem
                    prefetch={false}
                    href="/login"
                    icon={UserCircle}
                    label="Login"
                    onClick={onClose}
                  />
                )}

                {user?.role === "admin" && (
                  <>
                    <div className="my-2 h-px w-full bg-border/50" />
                    <MenuItem
                      prefetch={false}
                      href="/bakery-manufacturing-orders"
                      icon={ShieldCheck}
                      label="Dashboard"
                      onClick={onClose}
                      badge="Admin"
                      highlight={true}
                    />
                  </>
                )}
              </div>
            </div>
          </nav>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default MobileMenu;
