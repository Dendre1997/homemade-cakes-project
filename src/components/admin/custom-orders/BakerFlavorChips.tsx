"use client";

import { cn } from "@/lib/utils";

type FlavorChoice = { _id?: unknown; name?: string };

export function FlavorPills({ labels }: { labels: string[] }) {
  const clean = labels.map((label) => label.trim()).filter(Boolean);
  if (!clean.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {clean.map((label) => (
        <span
          key={label}
          className="inline-flex h-7 max-w-full items-center rounded-full border border-primary/15 bg-background/70 px-2.5 text-xs font-medium text-primary"
        >
          <span className="truncate">{label}</span>
        </span>
      ))}
    </div>
  );
}

export function BakerFlavorChips({
  flavors,
  selectedIds,
  onToggle,
  maxFlavors,
}: {
  flavors: FlavorChoice[];
  selectedIds: string[];
  onToggle: (flavorId: string) => void;
  maxFlavors?: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {flavors.map((flavor) => {
          const id = String(flavor._id);
          const selected = selectedIds.includes(id);
          return (
            <button
              key={id}
              type="button"
              aria-pressed={selected}
              onClick={() => onToggle(id)}
              className={cn(
                "h-11 max-w-full rounded-xl border px-3 text-left text-sm sm:h-10",
                selected
                  ? "border-accent bg-accent/10 font-semibold text-primary"
                  : "border-primary/15 bg-background/40 text-primary/80"
              )}
            >
              <span className="truncate">{(flavor.name ?? "").trim()}</span>
            </button>
          );
        })}
      </div>
      {maxFlavors ? (
        <p className="text-xs text-primary/55">
          This set allows up to {maxFlavors} {maxFlavors === 1 ? "flavor" : "flavors"}. You can still choose another.
        </p>
      ) : null}
    </div>
  );
}
