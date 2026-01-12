"use client";

import BlogForm from "@/components/admin/BlogForm";
import { useAlert } from "@/contexts/AlertContext";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Blog, Product } from "@/types";
import { Button } from "@/components/ui/Button";
import { Trash2 } from "lucide-react";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";

export default function EditBlogClient({ blog, availableProducts }: { blog: Blog; availableProducts: Product[] }) {
  const router = useRouter();
  const { showAlert } = useAlert();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleSubmit = async (data: Partial<Blog>) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/blogs/${blog._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || "Failed to update blog");
      }

      showAlert("Blog post updated successfully!", "success");
      router.push("/bakery-manufacturing-orders/blogs");
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

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/admin/blogs/${blog._id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
         const result = await res.json();
         throw new Error(result.error || "Failed to delete blog");
      }
      
      showAlert("Blog post deleted successfully", "success");
      router.push("/bakery-manufacturing-orders/blogs");
      router.refresh();
    } catch (error) {
        console.error(error);
        showAlert("Failed to delete blog", "error");
    }
  };

  return (
    <>
      <div className="flex justify-end mb-4">
         <Button variant="danger" onClick={() => setIsDeleteModalOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete Post
         </Button>
      </div>

      <BlogForm 
        initialData={blog} 
        onSubmit={handleSubmit} 
        isSubmitting={isSubmitting} 
        availableProducts={availableProducts}
      />

       <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Blog Post?"
        variant="danger"
      >
        This action cannot be undone.
      </ConfirmationModal>
    </>
  );
}
