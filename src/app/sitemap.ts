import { MetadataRoute } from "next";
import clientPromise from "@/lib/db";
import { Blog, Product } from "@/types";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Static routes
  const routes = [
    "",
    "/about",
    "/blog",
    "/contact",
    "/shop",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 1,
  }));

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB_NAME);

  // Fetch active blogs
  const blogs = await db
    .collection<Blog>("blogs")
    .find({ isActive: true })
    .toArray();

  const blogRoutes = blogs.map((blog) => ({
    url: `${baseUrl}/blog/${blog.slug}`,
    lastModified: new Date(blog.updatedAt),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // Fetch active products
  const products = await db
    .collection<Product>("products")
    .find({ isActive: true })
    .toArray();

  const productRoutes = products.map((product) => ({
    url: `${baseUrl}/products/${product._id.toString()}`,
    lastModified: new Date(), // Products might not have updatedAt, using current date or check schema
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...routes, ...blogRoutes, ...productRoutes];
}
