
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric chars with hyphens
        .replace(/^-+|-+$/g, '');     // Remove leading/trailing hyphens
}

export const slugify = generateSlug;

export function isValidObjectId(id: string) {
    return /^[0-9a-fA-F]{24}$/.test(id);
}

export function extractOriginalItemId(id: string): string {
    return id.split("-").slice(0, -1).join("-");
}

export function createUnitId(itemId: string, unitIndex: number): string {
    return `${itemId}-${unitIndex}`;
}

export function formatOrderItemDescription(item: any): string {
  const parts: string[] = [];

  // 1. Base Name
  parts.push(item.name);

  // 2. Custom Size or Standard Diameter (if part of name, ok, otherwise appended)
  if (item.customSize) {
     parts.push(`(${item.customSize})`);
  }

  // 3. Flavors (Simple)
  if (item.flavor && item.flavor !== "N/A" && !item.selectedConfig) {
      parts.push(`- ${item.flavor}`);
  }

  // 4. Detailed Set/Combo Config
  if (item.selectedConfig) {
      const details: string[] = [];
      
      // Cake Portion
      if (item.selectedConfig.cake) {
          if (item.flavor && item.flavor.startsWith("Mix:")) {
          } else {
             details.push("Cake Configured"); 
          }
      }

      
      if (item.flavor && item.flavor !== "N/A") {
          details.push(item.flavor);
      }
      
      if (details.length > 0) {
          if (!parts.join("").includes(item.flavor)) {
             parts.push(`- ${details.join(", ")}`);
          }
      }
  }

  // 5. Inscriptions / Notes
  if (item.inscription || (item.selectedConfig?.cake?.inscription)) {
      const text = item.inscription || item.selectedConfig.cake.inscription;
      if (text) parts.push(`[Inscription: "${text}"]`);
  }
  
  if (item.adminNotes) {
     // Admin notes shown to user? Maybe not.
  }

  return parts.join(" ");
}
