import ClientHeader from "@/components/(client)/layout/header/Header";
import Footer from "@/components/(client)/layout/Footer";
import { getCategories } from "@/lib/data";
import { getActiveSeasonals } from "@/lib/db/seasonals";
import { ProductCategory, SeasonalEvent } from "@/types";

export const revalidate = 300;

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const [categories, seasonals] = await Promise.all([
    getCategories(),
    getActiveSeasonals(),
  ]);

  const activeSeasonalEvent: SeasonalEvent | null =
    seasonals.length > 0 ? seasonals[0] : null;

  return (
    <>
      <div className="flex min-h-screen flex-col">
        <ClientHeader
          categories={categories}
          activeSeasonalEvent={activeSeasonalEvent}
        />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </div>
    </>
  );
}
