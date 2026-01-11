import { notFound } from "next/navigation";
import Image from "next/image";
import ProductCard from "@/components/(client)/ProductCard";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { getSeasonalEventBySlug, getSeasonalProducts } from "@/lib/db/data";
import { Sparkles } from "lucide-react";

interface PageProps {
  params: Promise<{ slug: string }>;
}

const SeasonalPage = async ({ params }: PageProps) => {
  const { slug } = await params;
  const event = await getSeasonalEventBySlug(slug);

  if (!event || !event.isActive) {
    notFound();
  }

  const products = await getSeasonalProducts(event._id.toString());

  return (
    <div className="bg-background min-h-screen">
      {/* --- HERO SECTION --- */}
      <div className="relative w-full h-[400px] md:h-[500px]">
        {event.heroBannerUrl ? (
          <Image
            src={event.heroBannerUrl}
            alt={event.name}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from- to-primary flex items-center justify-center">
            <Sparkles className="w-24 h-24 text-primary opacity-20" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 text-center md:text-left mx-auto max-w-7xl z-10">
          <h1
            className="text-4xl md:text-6xl font-heading font-bold text-white mb-4 shadow-sm"
            style={{
              textShadow: `0 4px 20px ${event.themeColor || "rgba(0,0,0,0.5)"}`,
            }}
          >
            {event.name}
          </h1>
          {event.description && (
            <p className="text-lg md:text-xl text-white/90 max-w-2xl font-body drop-shadow-md">
              {event.description}
            </p>
          )}
        </div>
      </div>

      {/* --- PRODUCTS GRID --- */}
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div
          className="mb-10 pb-4 border-b-2"
          style={{ borderColor: event.themeColor || "#000" }}
        >
          <h2 className="text-2xl font-bold font-heading text-primary">
            Limited Time Treats
          </h2>
        </div>

        {products.length > 0 ? (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 auto-rows-fr">
            {products.map((product) => (
              <ProductCard key={product._id.toString()} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-card-background rounded-medium p-lg shadow-sm border border-border">
            <p className="text-xl text-primary/60 mb-6 font-body">
              We are baking something special for this collection. Stay tuned!
            </p>
            <Link href="/products">
              <Button variant="primary">View All Products</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default SeasonalPage;
