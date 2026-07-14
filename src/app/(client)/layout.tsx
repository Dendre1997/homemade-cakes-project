import ClientHeader from "@/components/(client)/layout/header/Header";
import Footer from "@/components/(client)/layout/Footer";
import { getCategories } from "@/lib/data";
import { getCollections } from "@/lib/db/collections";
import { getActiveSeasonals } from "@/lib/db/seasonals";
import { MongoUnavailableError } from "@/lib/db/withMongoRetry";
import { Collection, ProductCategory, SeasonalEvent } from "@/types";

export const revalidate = 300;

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  let categories: ProductCategory[] = [];
  let seasonals: SeasonalEvent[] = [];
  let collections: Collection[] = [];

  const results = await Promise.allSettled([
    getCategories(),
    getActiveSeasonals(),
    getCollections(),
  ]);

  if (results[0].status === "fulfilled") {
    categories = results[0].value;
  } else {
    console.error("[layout] getCategories failed:", results[0].reason);
  }

  if (results[1].status === "fulfilled") {
    seasonals = results[1].value;
  } else if (results[1].reason instanceof MongoUnavailableError) {
    console.error("[layout] getActiveSeasonals unavailable after retries:", results[1].reason);
  } else {
    console.error("[layout] getActiveSeasonals failed:", results[1].reason);
  }

  if (results[2].status === "fulfilled") {
    collections = results[2].value;
  } else {
    console.error("[layout] getCollections failed:", results[2].reason);
  }

  const activeSeasonalEvent: SeasonalEvent | null =
    seasonals.length > 0 ? seasonals[0] : null;

  return (
    <div className="flex min-h-screen flex-col">
      <ClientHeader
        categories={categories}
        activeSeasonalEvent={activeSeasonalEvent}
        collections={collections}
      />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
