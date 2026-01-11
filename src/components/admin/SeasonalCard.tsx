"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link"; // Потрібен для емуляції кнопки
import { SeasonalEvent } from "@/types";
import { Button } from "@/components/ui/Button";
import { format, isBefore, isAfter } from "date-fns";
import { Edit2, Trash2, Calendar, Eye, X } from "lucide-react"; // Додано Eye, X
import { cn } from "@/lib/utils";
import * as Dialog from "@radix-ui/react-dialog"; // Імпортуємо Dialog

interface SeasonalCardProps {
  event: SeasonalEvent;
  onEdit: () => void;
  onDelete: () => void;
}

export const SeasonalCard = ({
  event,
  onEdit,
  onDelete,
}: SeasonalCardProps) => {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const now = new Date();
  const start = new Date(event.startDate);
  const end = new Date(event.endDate);

  let status: "active" | "upcoming" | "ended" = "active";
  if (isBefore(now, start)) status = "upcoming";
  else if (isAfter(now, end)) status = "ended";

  const statusStyles = {
    active: "bg-success/90 text-white",
    upcoming: "bg-warning/90 text-primary",
    ended: "bg-neutral-500/90 text-white",
  };

  const statusLabels = {
    active: "Active Now",
    upcoming: "Upcoming",
    ended: "Ended",
  };

  return (
    <Dialog.Root open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
      <div
        className="group relative flex flex-col rounded-large overflow-hidden bg-card-background shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border border-border"
        style={{ borderBottom: `4px solid ${event.themeColor}` }}
      >
        {/* --- Card Header / Banner Thumbnail --- */}
        <div className="relative w-full h-40 bg-neutral-200">
          {event.heroBannerUrl ? (
            <Image
              src={event.heroBannerUrl}
              alt={event.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 400px"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-primary/20">
              No Banner
            </div>
          )}

          <div
            className={cn(
              "absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold shadow-sm backdrop-blur-md flex items-center gap-1.5",
              statusStyles[status]
            )}
          >
            <span
              className={cn(
                "w-2 h-2 rounded-full bg-current opacity-70",
                status === "active" && "animate-pulse"
              )}
            />
            {statusLabels[status]}
          </div>

          <div
            className="absolute top-3 right-3 w-4 h-4 rounded-full border border-white/50 shadow-sm"
            style={{ backgroundColor: event.themeColor }}
            title={`Theme: ${event.themeColor}`}
          />
        </div>

        {/* --- Card Content --- */}
        <div className="flex-1 p-md flex flex-col">
          <div className="flex justify-between items-start mb-xs">
            <h3 className="font-heading text-xl text-primary line-clamp-1">
              {event.name}
            </h3>
          </div>

          <div className="flex items-center gap-2 text-small text-primary/60 mb-md">
            <Calendar className="h-3.5 w-3.5" />
            <span>
              {format(start, "MMM d")} - {format(end, "MMM d, yyyy")}
            </span>
          </div>

          {/* --- Actions --- */}
          <div className="mt-auto flex gap-sm pt-sm border-t border-border/50">
            <Button
              variant="secondary"
              size="sm"
              className="px-3"
              onClick={() => setIsDetailsOpen(true)}
              title="Preview & Details"
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>

            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={onEdit}
            >
              <Edit2 className="h-3.5 w-3.5 mr-2" /> Edit
            </Button>
            <Button
              variant="danger"
              size="sm"
              className="px-3"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* --- 2. MODAL: "Big as a Slide" Preview --- */}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl z-50 outline-none p-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Container for the "Slide" look */}
          <div className="relative w-full rounded-large overflow-hidden bg-neutral-100 shadow-2xl">
            {/* --- The "Slide" Preview --- */}
            <div className="relative aspect-[16/9] md:aspect-[21/9] w-full">
              {event.heroBannerUrl ? (
                <Image
                  src={event.heroBannerUrl}
                  alt={event.name}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-neutral-200 text-neutral-400">
                  No Banner Image
                </div>
              )}

              {/* Overlay */}
              <div className="absolute inset-0 bg-black/30" />

              {/* Text Content (Centered, exactly like HeroSlider) */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white p-lg">
                <Dialog.Title className="font-heading text-4xl md:text-6xl drop-shadow-md mb-sm">
                  {event.name}
                </Dialog.Title>
                {event.description && (
                  <p className="text-lg md:text-2xl max-w-2xl drop-shadow-sm mb-md opacity-90">
                    {event.description}
                  </p>
                )}
                {/* Fake "CTA Button" for preview */}
                <div className="mt-4 pointer-events-none">
                  <Button size="lg" variant="primary" className="shadow-lg">
                    Explore Collection
                  </Button>
                </div>
              </div>
            </div>

            {/* --- Additional Details Footer --- */}
            <div className="bg-card-background p-md md:p-lg border-t border-border grid grid-cols-1 md:grid-cols-3 gap-md text-small">
              <div>
                <p className="font-bold text-primary">Schedule</p>
                <p className="text-primary/70">
                  {format(start, "MMMM d, yyyy")} —{" "}
                  {format(end, "MMMM d, yyyy")}
                </p>
              </div>
              <div>
                <p className="font-bold text-primary">Details</p>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-bold",
                      event.isActive
                        ? "bg-success/20 text-success"
                        : "bg-neutral-200 text-neutral-600"
                    )}
                  >
                    {event.isActive ? "Published" : "Draft (Inactive)"}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-primary/60">
                    <span
                      className="w-3 h-3 rounded-full border border-border"
                      style={{ background: event.themeColor }}
                    />
                    Theme Color
                  </span>
                </div>
              </div>
              <div className="md:text-right">
                <p className="font-bold text-primary">Internal ID</p>
                <p className="font-mono text-xs text-primary/50">
                  {event._id.toString()}
                </p>
              </div>
            </div>

            {/* Close Button */}
            <Dialog.Close asChild>
              <button
                className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-md transition-colors"
                aria-label="Close preview"
              >
                <X className="h-6 w-6" />
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
