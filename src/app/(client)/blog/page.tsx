import Link from "next/link";
import Image from "next/image";
import clientPromise from "@/lib/db";
import { Blog } from "@/types";
import { format } from "date-fns";
import { Button } from "@/components/ui/Button";

// Force dynamic rendering to ensure fresh data
export const dynamic = "force-dynamic";

async function getBlogs() {
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB_NAME);
  // Only active blogs for public view
  const blogs = await db
    .collection<Blog>("blogs")
    .find({ isActive: true })
    .sort({ publishedAt: -1 })
    .toArray();
  return JSON.parse(JSON.stringify(blogs)) as Blog[];
}

export default async function BlogListingPage() {
  const blogs = await getBlogs();

  return (
    <div className="bg-background min-h-screen py-12 md:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="font-heading text-4xl md:text-5xl text-primary mb-4">
            Our Blog
          </h1>
          <p className="font-body text-lg text-primary/70 max-w-2xl mx-auto">
            Latest news, baking tips, and sweet stories from our kitchen.
          </p>
        </div>

        {blogs.length === 0 ? (
          <div className="text-center py-20 bg-white/50 rounded-lg">
            <p className="text-xl text-primary/60">
              No articles published yet. Check back soon!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogs.map((blog) => (
              <article
                key={blog._id}
                className="group flex flex-col bg-card-background rounded-medium overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 border border-border"
              >
                {/* Image */}
                <Link href={`/blog/${blog.slug}`} className="relative h-60 w-full overflow-hidden block">
                  {blog.imageUrl ? (
                    <Image
                      src={blog.imageUrl}
                      alt={blog.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="w-full h-full bg-subtleBackground flex items-center justify-center text-primary/20">
                       <span className="font-heading text-2xl">Homemade Cakes</span>
                    </div>
                  )}
                </Link>

                {/* Content */}
                <div className="flex-1 flex flex-col p-6">
                  <div className="mb-3 text-sm text-primary/60">
                     {blog.publishedAt && format(new Date(blog.publishedAt), "MMMM d, yyyy")}
                  </div>
                  
                  <Link href={`/blog/${blog.slug}`} className="block mb-3">
                    <h2 className="font-heading text-2xl text-primary leading-tight group-hover:text-accent transition-colors">
                      {blog.title}
                    </h2>
                  </Link>

                  <div className="text-primary/70 mb-6 line-clamp-3 text-sm">
                    {/* Basic strip HTML for excerpt */}
                     {blog.content.replace(/<[^>]+>/g, '')}
                  </div>

                  <div className="mt-auto">
                    <Link href={`/blog/${blog.slug}`}>
                      <span className="font-bold text-accent hover:underline decoration-2 underline-offset-4 text-sm uppercase tracking-wide">
                        Read Blog
                      </span>
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
