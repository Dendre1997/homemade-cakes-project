import { MetadataRoute } from "next";
import { withMongoClient } from "@/lib/db";
import { Blog, Product } from "@/types";

export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

  // Static routes
  const routes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}`, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${baseUrl}/shop`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.7 },
  ];

  try {
    const { blogs, products } = await withMongoClient(async (client) => {
      const db = client.db(process.env.MONGODB_DB_NAME);

      // Fetch active blogs
      const blogs = await db
        .collection<Blog>("blogs")
        .find({ isActive: true }, { projection: { slug: 1, updatedAt: 1 } })
        .toArray();

      // Fetch active products
      const products = await db
        .collection<Product>("products")
        .find({ isActive: true }, { projection: { _id: 1, updatedAt: 1, createdAt: 1 } })
        .toArray();

      return { blogs, products };
    });

    const blogRoutes: MetadataRoute.Sitemap = blogs.map((blog) => ({
      url: `${baseUrl}/blog/${blog.slug}`,
      lastModified: blog.updatedAt ? new Date(blog.updatedAt) : new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    const productRoutes: MetadataRoute.Sitemap = products.map((product) => {
      const p = product as any;
      return {
        url: `${baseUrl}/products/${product._id.toString()}`,
        lastModified: p.updatedAt ? new Date(p.updatedAt) : (p.createdAt ? new Date(p.createdAt) : undefined),
        changeFrequency: "weekly",
        priority: 0.8,
      };
    });

    return [...routes, ...blogRoutes, ...productRoutes];
  } catch (error) {
    console.error("Sitemap MongoDB fetch failed, returning static routes only:", error);
    return routes;
  }
}
