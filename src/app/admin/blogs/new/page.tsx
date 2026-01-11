import clientPromise from "@/lib/db";
import { Product } from "@/types";
import NewBlogClient from "./NewBlogClient";

async function getProducts() {
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB_NAME);
  // Fetch only active products for cross-selling and populate categories
  const products = await db.collection("products").aggregate([
    { $match: { isActive: true } },
    {
      $lookup: {
        from: "categories",
        let: { catId: "$categoryId" },
        pipeline: [
          { $match: { $expr: { $eq: ["$_id", { $toObjectId: "$$catId" }] } } }
        ],
        as: "category"
      }
    },
    { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } }
  ]).toArray();
  
  return JSON.parse(JSON.stringify(products)) as Product[];
}

export default async function NewBlogPage() {
  const products = await getProducts();

  return (
    <NewBlogClient availableProducts={products} />
  );
}
