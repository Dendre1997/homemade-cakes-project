import { ProductCategory } from "@/types";

export async function getCategories(): Promise<ProductCategory[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/categories`,
      {
        next: { revalidate: 3600 }, 
      }
    );

    if (!res.ok) {
      throw new Error("Failed to fetch categories");
    }

    return res.json();
  } catch (error) {
    console.error("Error in getCategories:", error);
    return []; 
  }
}
