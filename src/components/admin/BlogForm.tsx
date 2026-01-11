"use client";

import { useState, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExtension from "@tiptap/extension-image";
import { Blog, ProductWithCategory } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { Label } from "@/components/ui/Label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ImageUploadPreview } from "@/components/admin/ImageUploadPreview";
import { ProductPicker } from "@/components/admin/ProductPicker";
import { Bold, Italic, List, ListOrdered, Heading1, Heading2, Loader2 } from "lucide-react";

interface BlogFormProps {
  initialData?: Blog | null;
  onSubmit: (data: Partial<Blog>) => Promise<void>;
  isSubmitting?: boolean;
  availableProducts?: any[]; 
}

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 p-2 border-b border-border bg-subtleBackground mb-2 rounded-t-md">
      <Button
        type="button"
        variant={editor.isActive("bold") ? "primary" : "secondary"}
        size="sm"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className="h-8 w-8 p-0"
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant={editor.isActive("italic") ? "primary" : "secondary"}
        size="sm"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className="h-8 w-8 p-0"
      >
        <Italic className="h-4 w-4" />
      </Button>
      <div className="w-px h-8 bg-border mx-1" />
      <Button
        type="button"
        variant={editor.isActive("heading", { level: 1 }) ? "primary" : "secondary"}
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className="h-8 w-8 p-0"
      >
        <Heading1 className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant={editor.isActive("heading", { level: 2 }) ? "primary" : "secondary"}
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className="h-8 w-8 p-0"
      >
        <Heading2 className="h-4 w-4" />
      </Button>
      <div className="w-px h-8 bg-border mx-1" />
      <Button
        type="button"
        variant={editor.isActive("bulletList") ? "primary" : "secondary"}
        size="sm"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className="h-8 w-8 p-0"
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant={editor.isActive("orderedList") ? "primary" : "secondary"}
        size="sm"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className="h-8 w-8 p-0"
      >
        <ListOrdered className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default function BlogForm({ initialData, onSubmit, isSubmitting, availableProducts = [] }: BlogFormProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || "");
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [relatedProductIds, setRelatedProductIds] = useState<string[]>(initialData?.relatedProductIds || []);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Tiptap Editor
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, ImageExtension],
    content: initialData?.content || "",
    editorProps: {
      attributes: {
        class: "prose prose-sm sm:prose lg:prose-lg xl:prose-2xl m-5 focus:outline-none min-h-[300px]",
      },
    },
  });

  // Slug auto-generation
  useEffect(() => {
    if (!initialData && title) {
      // Only auto-generate on create mode
      const generated = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with -
        .replace(/^-+|-+$/g, ""); // Trim dashes
      setSlug(generated);
    }
  }, [title, initialData]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "homemade_cakes_preset");

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) throw new Error("Image upload failed");
      const data = await response.json();
      setImageUrl(data.secure_url);
    } catch (err) {
      setUploadError("Failed to upload image. Please try again.");
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editor) return;

    const data: Partial<Blog> = {
      title,
      slug,
      content: editor.getHTML(),
      imageUrl,
      isActive,
      relatedProductIds,
    };
    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* LEFT COLUMN: Main Content */}
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Article Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter article title"
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="url-friendly-slug"
                required
              />
              <p className="text-xs text-muted-foreground">
                The URL path for this article. Auto-generated from title but can be renamed.
              </p>
            </div>

            <div className="border border-border rounded-md">
              <MenuBar editor={editor} />
              <EditorContent editor={editor} className="min-h-[300px] p-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* RIGHT COLUMN: Sidebar Settings */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Publishing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex items-center gap-2">
              <Checkbox
                id="isActive"
                checked={isActive}
                onCheckedChange={(c) => setIsActive(Boolean(c))}
              />
              <Label htmlFor="isActive">Published / Active</Label>
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                 <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Article"
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cover Image</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ImageUploadPreview
              imagePreview={imageUrl}
              isUploading={isUploading}
              onRemove={() => setImageUrl("")}
            />
            
            <div className="grid w-full max-w-sm items-center gap-1.5">
               <Label htmlFor="picture">Upload Image</Label>
               <Input 
                 id="picture" 
                 type="file" 
                 accept="image/*"
                 onChange={handleImageUpload}
                 disabled={isUploading}
               />
               {uploadError && <p className="text-xs text-error">{uploadError}</p>}
            </div>
          </CardContent>
        </Card>
        {/* RELATED PRODUCTS */}
        <Card>
          <CardHeader>
             <CardTitle>Recommended Products</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             {availableProducts && availableProducts.length > 0 ? (
               <ProductPicker 
                 availableProducts={availableProducts as ProductWithCategory[]}
                 selectedIds={relatedProductIds}
                 onChange={setRelatedProductIds}
                 themeColor="#D4A373" // Using a nice accent color
               />
             ) : (
               <p className="text-sm text-muted-foreground">No products available.</p>
             )}
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
