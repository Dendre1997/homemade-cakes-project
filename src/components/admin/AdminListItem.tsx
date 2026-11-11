"use client";

import { useState, ReactNode } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import * as Dialog from "@radix-ui/react-dialog";
import { X, HelpCircle, Edit2, Trash2 } from "lucide-react";

interface AdminListItemProps {
  imageUrl?: string | null;
  title: string;
  description?: string | null;
  details: Record<string, any>;
  onEdit: () => void;
  onDelete: () => void;
  icon?: ReactNode;
}

const rowActionClass =
  "h-11 w-11 shrink-0 rounded-xl p-0 sm:h-10 sm:w-auto sm:px-3";

export const AdminListItem = ({
  imageUrl,
  title,
  description,
  details,
  onEdit,
  onDelete,
  icon,
}: AdminListItemProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredDetails = Object.entries(details).filter(
    ([key, value]) =>
      key !== "_id" &&
      key !== "imageUrl" &&
      value !== "" &&
      value !== null
  );

  return (
    <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
      <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/10 bg-background/40 p-3">
        <div className="flex min-w-0 items-center gap-3">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={title}
              width={64}
              height={64}
              quality={90}
              className="h-16 w-16 shrink-0 rounded-xl border border-primary/10 object-cover"
            />
          ) : icon ? (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center">
              {icon}
            </div>
          ) : null}
          <div className="min-w-0">
            <p className="truncate font-body font-bold text-primary">{title}</p>
            {description && (
              <p className="truncate font-body text-sm text-primary/70">
                {description}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-row items-center gap-2">
          <Dialog.Trigger asChild>
            <Button
              type="button"
              variant="primary"
              aria-label="Show details"
              className="h-11 w-11 shrink-0 rounded-xl p-0 sm:h-10 sm:w-10"
            >
              <HelpCircle className="h-4 w-4" aria-hidden />
            </Button>
          </Dialog.Trigger>

          <Button
            type="button"
            variant="secondary"
            onClick={onEdit}
            aria-label="Edit"
            className={rowActionClass}
          >
            <Edit2 className="h-4 w-4 sm:mr-2" aria-hidden />
            <span className="hidden sm:inline">Edit</span>
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={onDelete}
            aria-label="Delete"
            className={rowActionClass}
          >
            <Trash2 className="h-4 w-4 sm:mr-2" aria-hidden />
            <span className="hidden sm:inline">Delete</span>
          </Button>
        </div>
      </div>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[80vh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-contain rounded-2xl border border-primary/15 bg-background/95 p-5 shadow-lg backdrop-blur-xl custom-scrollbar">
          <Dialog.Title className="mb-4 pr-12 font-heading text-xl font-semibold tracking-tight text-primary text-balance">
            Details for &quot;{title}&quot;
          </Dialog.Title>

          {imageUrl ? (
            <div className="relative mb-4 h-48 w-full overflow-hidden rounded-xl">
              <Image
                src={imageUrl}
                alt={title}
                fill
                quality={90}
                className="object-contain"
                sizes="(max-width: 640px) 100vw, 448px"
              />
            </div>
          ) : icon ? (
            <div className="mb-4 flex h-16 w-16 items-center justify-center">
              {icon}
            </div>
          ) : null}

          <div className="space-y-2">
            {filteredDetails.map(([key, value]) => (
              <div key={key} className="break-words font-body text-sm">
                <span className="font-semibold capitalize text-primary/70">
                  {key}:{" "}
                </span>
                <span className="text-primary">{String(value)}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <Dialog.Close asChild>
              <Button type="button" variant="primary" className="h-11 rounded-xl sm:h-10">
                Close
              </Button>
            </Dialog.Close>
          </div>

          <Dialog.Close asChild>
            <button
              type="button"
              className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-xl text-primary/60 transition-colors hover:bg-subtleBackground"
            >
              <span className="sr-only">Close</span>
              <X className="h-5 w-5" aria-hidden />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
