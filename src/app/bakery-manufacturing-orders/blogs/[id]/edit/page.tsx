import Link from "next/link";
import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/db";
import { Blog, Product } from "@/types";
import EditBlogClient from "./EditBlogClient";
import { Button } from "@/components/ui/Button";
import { ArrowLeft } from "lucide-react";

async function getProducts() {
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB_NAME);
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

async function getBlog(id: string) {
  if (!ObjectId.isValid(id)) return null;
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB_NAME);
  const blog = await db.collection("blogs").findOne({ _id: new ObjectId(id) });
  if (!blog) return null;
  return JSON.parse(JSON.stringify(blog)) as Blog;
}

export default async function EditBlogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [blog, products] = await Promise.all([getBlog(id), getProducts()]);

  if (!blog) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/bakery-manufacturing-orders/blogs">
            <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
            </Button>
        </Link>
        <h1 className="text-3xl font-heading font-bold text-primary">
          Edit Post
        </h1>
      </div>
      <EditBlogClient blog={blog} availableProducts={products} />
    </div>
  );
}
