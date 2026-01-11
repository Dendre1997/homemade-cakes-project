"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";
import { Input } from "@/components/ui/Input";
import { Plus, Trash2, Box } from "lucide-react"; 

export interface QuantityConfig {
  label: string;
  quantity: number;
  price: number;
}

interface QuantityConfigSelectorProps {
  configs: QuantityConfig[];
  onChange: (configs: QuantityConfig[]) => void;
  className?: string;
}

const QuantityConfigSelector = ({
  configs,
  onChange,
  className,
}: QuantityConfigSelectorProps) => {
  const [newLabel, setNewLabel] = useState("");
  const [newQuantity, setNewQuantity] = useState("");
  const [newPrice, setNewPrice] = useState("");

  const handleAdd = () => {
    if (!newLabel || !newQuantity || !newPrice) return;
    
    const newItem: QuantityConfig = {
      label: newLabel,
      quantity: parseInt(newQuantity) || 0,
      price: parseFloat(newPrice) || 0,
    };
    
    onChange([...configs, newItem]);
    setNewLabel("");
    setNewQuantity("");
    setNewPrice("");
  };

  const handleRemove = (index: number) => {
    const newConfigs = [...configs];
    newConfigs.splice(index, 1);
    onChange(newConfigs);
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-col gap-2 p-4 border rounded-md bg-subtleBackground/50">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Add Box Configuration
        </h4>
        <div className="flex flex-wrap gap-2 items-end">
          <div className="grid gap-1 flex-1 min-w-[120px]">
            <label className="text-xs font-medium">Label (e.g. "Box of 6")</label>
            <Input 
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Box Name"
            />
          </div>
          <div className="grid gap-1 w-24">
            <label className="text-xs font-medium">Quantity</label>
            <Input 
              type="number"
              value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
              placeholder="Qty"
            />
          </div>
          <div className="grid gap-1 w-24">
            <label className="text-xs font-medium">Price ($)</label>
            <Input 
              type="number"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <Button type="button" onClick={handleAdd} disabled={!newLabel} variant="secondary">
            <Plus className="h-4 w-4 mr-2" /> Add
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Active Configurations
        </h4>
        {configs.length === 0 ? (
            <p className="text-sm text-muted-foreground italic text-center py-4 border border-dashed rounded-md">
            No box sizes defined.
            </p>
        ) : (
            <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
                {configs.map((config, index) => (
                    <div
                    key={index}
                    className="flex w-40 shrink-0 flex-col items-center gap-2 rounded-medium border border-border bg-background p-4 text-center relative group"
                    >
                        <button
                            type="button"
                            onClick={() => handleRemove(index)}
                            className="absolute top-2 right-2 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                        
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-accent">
                            <Box className="h-8 w-8" />
                        </div>
                        
                        <div>
                            <p className="font-bold text-primary text-sm">{config.label}</p>
                            <p className="text-xs text-muted-foreground">{config.quantity} items</p>
                            <p className="font-bold text-accent mt-1">${config.price.toFixed(2)}</p>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};

export default QuantityConfigSelector;
