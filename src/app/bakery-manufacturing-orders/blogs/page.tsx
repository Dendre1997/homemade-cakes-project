import { Blog } from "@/types";
import clientPromise from "@/lib/db";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Plus, Edit, Eye } from "lucide-react";
import { format, isValid } from "date-fns";
import { isCloudinaryDeliveryUrl } from "@/lib/cloudinaryUtils";

function serializeBlogs(blogs: Blog[]): Blog[] {
  try {
    return JSON.parse(JSON.stringify(blogs)) as Blog[];
  } catch (error) {
    console.error("Failed to serialize blogs:", error);
    return blogs.map((blog) => ({
      ...blog,
      _id: String(blog._id),
      publishedAt: blog.publishedAt,
      createdAt: blog.createdAt,
      updatedAt: blog.updatedAt,
    }));
  }
}

function formatPublishedAt(value: Blog["publishedAt"]): string {
  if (!value) return "-";
  const date = new Date(value);
  return isValid(date) ? format(date, "MMM d, yyyy") : "-";
}

async function getBlogs(): Promise<Blog[]> {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    const blogs = await db
      .collection<Blog>("blogs")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    return serializeBlogs(blogs);
  } catch (error) {
    console.error("Error fetching admin blogs:", error);
    return [];
  }
}

export default async function AdminBlogsPage() {
  const blogs = await getBlogs();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-primary">Blog Posts</h1>
          <p className="text-muted-foreground">Manage your articles and news.</p>
        </div>
        <Link href="/bakery-manufacturing-orders/blogs/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Create New Post
          </Button>
        </Link>
      </div>

      <div className="border border-border rounded-lg overflow-hidden bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-subtleBackground border-b border-border">
            <tr>
              <th className="p-4 font-medium text-muted-foreground">Image</th>
              <th className="p-4 font-medium text-muted-foreground">Title</th>
              <th className="p-4 font-medium text-muted-foreground">Status</th>
              <th className="p-4 font-medium text-muted-foreground">Published</th>
              <th className="p-4 font-medium text-muted-foreground text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {blogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  No blog posts found. Create your first one!
                </td>
              </tr>
            ) : (
              blogs.map((blog) => (
                <tr key={blog._id} className="hover:bg-subtleBackground/50 transition-colors">
                  <td className="p-4">
                    <div className="relative h-12 w-20 rounded-md overflow-hidden bg-neutral-100">
                      {blog.imageUrl && isCloudinaryDeliveryUrl(blog.imageUrl) ? (
                        <Image
                          src={blog.imageUrl}
                          alt={blog.title}
                          fill
                          quality={90}
                          className="object-cover"
                          sizes="80px"
                        />
                      ) : blog.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={blog.imageUrl}
                          alt={blog.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-xs text-neutral-400">
                          No Img
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-4 font-medium text-primary">
                    <div className="max-w-xs truncate" title={blog.title}>
                      {blog.title}
                    </div>
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-bold ${
                        blog.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {blog.isActive ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="p-4 text-muted-foreground">
                    {formatPublishedAt(blog.publishedAt)}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/blog/${blog.slug}`} target="_blank" title="View Live">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href={`/bakery-manufacturing-orders/blogs/${blog._id}/edit`}>
                        <Button variant="secondary" size="sm" className="h-8 w-8 p-0">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
