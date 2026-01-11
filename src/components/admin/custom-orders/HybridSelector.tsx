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
  // Determine initial mode based on whether value matches an ID in options
  const isValueInOptions = options.some((opt) => opt._id === value);
  const [internalMode, setInternalMode] = useState<"select" | "custom">(
    !value ? "select" : isValueInOptions ? "select" : "custom"
  );
  
  // If value is passed and it's not in options, force custom mode (sync with parent)
  useEffect(() => {
     if (value && !options.some(o => o._id === value) && value !== "custom") {
         setInternalMode("custom");
     }
  }, [value, options]);



  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value, true);
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select
        value={internalMode === "custom" ? "custom" : (isValueInOptions ? value : undefined)}
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
              <SelectItem key={opt._id} value={opt._id}>
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
          value={(!isValueInOptions && value !== "custom") ? value : ""}
          onChange={handleTextChange}
          className="animate-in fade-in slide-in-from-top-1 duration-200"
          autoFocus
        />
      )}
    </div>
  );
}
