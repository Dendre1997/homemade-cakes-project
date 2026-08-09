"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/Label";
import { Input } from "@/components/ui/Input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";

interface Option {
  _id: string;
  name: string;
}

interface HybridSelectorProps {
  label: string;
  options: Option[];
  value?: string;
  onChange: (val: string, isCustom: boolean) => void;
}

export default function HybridSelector({ label, options, value, onChange }: HybridSelectorProps) {
  const optionIdsMatch = (optId: string, val: string) => String(optId) === String(val);

  const valueInOptions = Boolean(
    value && options.some((opt) => optionIdsMatch(opt._id, value))
  );

  const [internalMode, setInternalMode] = useState<"select" | "custom">(
    !value ? "select" : valueInOptions ? "select" : "custom"
  );

  // Keep mode in sync when async options load or the resolved value changes.
  useEffect(() => {
    if (!value) {
      setInternalMode("select");
      return;
    }
    if (options.some((o) => optionIdsMatch(o._id, value))) {
      setInternalMode("select");
    } else if (value !== "custom") {
      setInternalMode("custom");
    }
  }, [value, options]);

  const selectValue =
    internalMode === "custom"
      ? "custom"
      : valueInOptions
        ? String(value)
        : undefined;

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value, true);
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select
        value={selectValue}
        onValueChange={(val) => {
          if (val === "custom") {
            setInternalMode("custom");
            onChange("", true);
          } else {
            setInternalMode("select");
            onChange(val, false);
          }
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={`Select ${label}...`} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
             {options.map((opt) => (
              <SelectItem key={String(opt._id)} value={String(opt._id)}>
                {opt.name}
              </SelectItem>
            ))}
            <SelectItem value="custom" className="font-bold text-accent">
              + Custom / Other
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>

      {internalMode === "custom" && (
        <Input
          type="text"
          placeholder={`Enter custom ${label.toLowerCase()}...`}
          value={(!valueInOptions && value !== "custom") ? value : ""}
          onChange={handleTextChange}
          className="animate-in fade-in slide-in-from-top-1 duration-200"
          autoFocus
        />
      )}
    </div>
  );
}
