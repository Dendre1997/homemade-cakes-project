import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w\-]+/g, "") // Remove all non-word chars
    .replace(/\-\-+/g, "-"); // Replace multiple - with single -
}

export const UNIT_DELIMITER = "::unit::";

export const createUnitId = (itemId: string, unitIndex: number): string => {
  return `${itemId}${UNIT_DELIMITER}${unitIndex}`;
};

export const extractOriginalItemId = (unitId: string): string => {
  if (unitId.includes(UNIT_DELIMITER)) {
    const parts = unitId.split(UNIT_DELIMITER);
    return parts[0];
  } else {
    const parts = unitId.split("-");
    if (parts.length < 2) return unitId; 
    return parts.slice(0, -1).join("-");
  }
};