"use client";

import { useState, ReactNode } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import * as Dialog from "@radix-ui/react-dialog";
import { X, HelpCircle, Edit2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminListItemProps {
  imageUrl?: string | null;
  title: string;
  description?: string | null;
  details: Record<string, any>; 
  onEdit: () => void;
    onDelete: () => void;
    icon?: ReactNode;
}

export const AdminListItem = ({
  imageUrl,
  title,
  description,
  details,
  onEdit,
    onDelete,
  icon
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
      <div className="flex justify-between items-center bg-card-background p-md rounded-large shadow-md">
        <div className="flex items-center gap-md overflow-hidden">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={title}
              width={64}
              height={64}
              className="w-16 h-16 rounded-medium object-cover border border-border flex-shrink-0"
            />
          ) : icon ? (
            <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center">
              {icon}
            </div>
          ) : (
            <></>
          )}
          <div className="overflow-hidden">
            <p className="font-body font-bold text-primary truncate">{title}</p>
            {description && (
              <p className="font-body text-small text-primary/80 truncate">
                {description}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-sm flex-shrink-0">
          <Dialog.Trigger asChild>
            <Button
              variant="primary"
              size="sm"
              className="!p-2"
              aria-label="Show details"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
          </Dialog.Trigger>

          <Button variant="secondary" size="sm" onClick={onEdit}>
            <Edit2 className="h-4 w-4 sm:mr-sm" />
            <span className="hidden sm:inline">Edit</span>
          </Button>
          <Button variant="danger" size="sm" onClick={onDelete}>
            <Trash2 className="h-4 w-4 sm:mr-sm" />
            <span className="hidden sm:inline">Delete</span>
          </Button>
        </div>
      </div>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card-background p-lg rounded-large shadow-lg w-full max-w-md z-50 max-h-[80vh] overflow-y-auto custom-scrollbar">
          <Dialog.Title className="font-heading text-h3 text-primary mb-md">
            Details for &quot;{title}&quot;
          </Dialog.Title>

          {imageUrl ? (
            <div className="relative w-full h-48 rounded-medium overflow-hidden mb-md">
              <Image
                src={imageUrl}
                alt={title}
                layout="fill"
                className="object-contain"
                sizes="(max-width: 640px) 100vw, 448px"
              />
            </div>
          ) : icon ? (
            <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center">
              {icon}
            </div>
          ) : (
            <></>
          )}

          <div className="space-y-sm">
            {filteredDetails.map(([key, value]) => (
              <div key={key} className="font-body text-body">
                <span className="font-semibold text-primary/80 capitalize">
                  {key}:{" "}
                </span>
                <span className="text-primary">{String(value)}</span>
              </div>
            ))}
          </div>

          <div className="mt-lg flex justify-end">
            <Dialog.Close asChild>
              <Button variant="primary">Close</Button>
            </Dialog.Close>
          </div>

          <Dialog.Close asChild>
            <button className="absolute top-md right-md p-1 rounded-full transition-colors text-primary/60 hover:bg-subtleBackground">
              <span className="sr-only">Close</span>
              <X className="h-5 w-5" />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
