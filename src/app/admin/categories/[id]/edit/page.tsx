// "use client";
// import { useEffect, useState } from "react";
// import { useParams, useRouter } from "next/navigation";
// import { ProductCategory } from "@/types";
// // import CategoryForm from "@/components/admin/CategoryForm";
// // import Spinner from "@/components/ui/Spinner";

// // const EditCategoryPage = () => {
// //   const params = useParams();
// //   const router = useRouter();
// //   const id = params.id as string;
// //   const [category, setCategory] = useState<ProductCategory | null>(null);

// //   useEffect(() => {
// //     if (id) {
// //       fetch(`/api/admin/categories/${id}`)
// //         .then((res) => res.json())
// //         .then((data) => setCategory(data));
// //     }
// //   }, [id]);

// //   if (!category) return <Spinner />;

// //   return (
// //     <section>
// //       <CategoryForm
// //         existingCategory={category}
// //         onFormSubmit={() => router.push("/admin/categories")}
// //       />
// //     </section>
// //   );
// // };
// // export default EditCategoryPage;
