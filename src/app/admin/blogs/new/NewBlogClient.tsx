"use client";

import BlogForm from "@/components/admin/BlogForm";
import { useAlert } from "@/contexts/AlertContext";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Blog, Product } from "@/types";

interface NewBlogClientProps {
  availableProducts: Product[];
}

export default function NewBlogClient({ availableProducts }: NewBlogClientProps) {
  const router = useRouter();
  const { showAlert } = useAlert();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: Partial<Blog>) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/blogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || "Failed to create blog");
      }

      showAlert("Blog post created successfully!", "success");
      router.push("/admin/blogs");
      router.refresh(); 
    } catch (error) {
      console.error(error);
      showAlert(
        error instanceof Error ? error.message : "Something went wrong",
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-heading font-bold text-primary">
          Create New Post
        </h1>
      </div>
      <BlogForm 
        onSubmit={handleSubmit} 
        isSubmitting={isSubmitting} 
        availableProducts={availableProducts}
      />
    </div>
  );
}
