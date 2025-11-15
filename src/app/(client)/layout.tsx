import ClientHeader from "@/components/(client)/layout/header/Header";
import Footer from "@/components/(client)/layout/Footer";
import { getCategories } from "@/lib/data";
import { ProductCategory } from "@/types";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const categories: ProductCategory[] = await getCategories();
  return (
    <>
      <div className="flex min-h-screen flex-col">
        <ClientHeader categories={categories} />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </div>
    </>
  );
}
