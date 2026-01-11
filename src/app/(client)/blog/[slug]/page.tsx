import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import clientPromise from "@/lib/db";
import { Blog } from "@/types";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { Metadata } from "next"; 
import ProductCard from "@/components/(client)/ProductCard";

// Force dynamic for simple implementation, or can use generateStaticParams
export const dynamic = "force-dynamic";

async function getBlog(slug: string) {
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB_NAME);
  const blog = await db.collection<Blog>("blogs").findOne({ 
    slug: slug,
    isActive: true 
  });
  
  if (!blog) return null;

  // Populate related products (Server Side)
  if (blog.relatedProductIds && blog.relatedProductIds.length > 0) {
    const { ObjectId } = require("mongodb");
    const pIds = blog.relatedProductIds.map((id) => new ObjectId(id));
    
    const products = await db.collection("products").aggregate([
      { $match: { _id: { $in: pIds }, isActive: true } },
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
    
    blog.relatedProducts = products as any;
  }

  return JSON.parse(JSON.stringify(blog)) as Blog;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const blog = await getBlog(slug);

  if (!blog) {
    return {
      title: "Article Not Found",
    };
  }

  return {
    title: `${blog.title} | Homemade Cakes`,
    description: blog.content.replace(/<[^>]+>/g, '').substring(0, 160),
    openGraph: {
      title: blog.title,
      description: blog.content.replace(/<[^>]+>/g, '').substring(0, 160),
      images: blog.imageUrl ? [blog.imageUrl] : [],
      type: "article",
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const blog = await getBlog(slug);

  if (!blog) {
    notFound();
  }

  return (
    <div className="bg-background min-h-screen">
  <article className="relative">

    {/* Top Navigation */}
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10">
      <Link
        href="/blog"
        className="inline-flex items-center text-sm font-semibold text-primary/60 hover:text-accent transition"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        All Blogs
      </Link>
    </div>

    {/* Header */}
    <header className="max-w-3xl mx-auto px-4 sm:px-6 text-center pt-12 pb-16">
      {blog.publishedAt && (
        <time className="block text-xs font-bold uppercase tracking-widest text-accent mb-4">
          {format(new Date(blog.publishedAt), "MMMM d, yyyy")}
        </time>
      )}

      <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-primary leading-tight">
        {blog.title}
      </h1>
        </header>
        
    {blog.imageUrl ? (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-24">
        <div
          className="
            grid
            grid-cols-1
            lg:grid-cols-[420px_1fr]
            gap-10
            items-start
          "
        >
          {/* Image */}
          <div className="lg:sticky lg:top-24">
            <Image
              src={blog.imageUrl}
              alt={blog.title}
              width={0}
              height={0}
              sizes="(min-width: 1024px) 420px, 100vw"
              className="w-full h-auto rounded-2xl shadow-xl object-contain"
              priority
            />
          </div>

          {/* Text (Grid Layout) */}
          <div
            className="
              prose prose-lg
              prose-headings:font-heading
              prose-headings:text-primary
              prose-p:text-primary/80
              prose-p:leading-relaxed
              prose-a:text-accent
              hover:prose-a:text-accent/80
              prose-img:rounded-xl
              prose-blockquote:border-accent
              mx-auto
              max-w-none
            "
            dangerouslySetInnerHTML={{ __html: blog.content }}
          />
        </div>
      </div>
    ) : (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-24">
        <div
          className="
            prose prose-lg
            prose-headings:font-heading
            prose-headings:text-primary
            prose-p:text-primary/80
            prose-p:leading-relaxed
            prose-a:text-accent
            prose-a:font-medium
            hover:prose-a:text-accent/80
            prose-img:rounded-xl
            prose-blockquote:border-accent
            prose-blockquote:text-primary/70
            mx-auto
          "
          dangerouslySetInnerHTML={{ __html: blog.content }}
        />
      </div>
    )}

  </article>

  {/* Related Products / Shop the Look */}
  {blog.relatedProducts && blog.relatedProducts.length > 0 && (
    <section className="bg-subtleBackground py-16 md:py-24 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="font-heading text-3xl md:text-4xl text-primary font-bold mb-4">
            Shop the Look
          </h2>
          <p className="text-text-secondary text-lg">
            Loved the article? Check out these delicious treats mentioned above.
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {blog.relatedProducts.map((product: any) => (
            <div key={product._id} className="h-full">
               {/* Note: ProductCard expects ProductWithCategory. API provides it. */}
               <ProductCard product={product} /> 
            </div>
          ))}
        </div>
      </div>
    </section>
  )}
</div>

  );
}
