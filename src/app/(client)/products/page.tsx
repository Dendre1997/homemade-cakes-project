import ProductFeed from "@/components/(client)/ProductFeed";
import { 
  getActiveDiscounts,
  getActiveCategories
} from "@/lib/data";
import { getActiveFlavors as getDbActiveFlavors } from "@/lib/db/data";
import { FlavorCarousel } from "@/components/(client)/home/flavors/FlavorCarousel";

const Section = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => <section className={`py-xxl ${className || ""}`}>{children}</section>;

const Container = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${className || ""}`}>{children}</div>
);

async function getInitialProducts() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL
  const res = await fetch(`${baseUrl}/api/products?page=1&limit=10`, {
    cache: "no-store",
  });

  if (!res.ok) {
    console.error("Failed to fetch initial products");
    return [];
  }

  return res.json();
}

const ProductsPage = async () => {
  const [initialProducts, discounts, categories, activeFlavors] = await Promise.all([
    getInitialProducts(),
    getActiveDiscounts(),
    getActiveCategories(),
    getDbActiveFlavors(),
  ]);

  // Filter Flavors
  const bentoCategoryIds = categories
    .filter((c) => c.name.toLowerCase().includes("bento"))
    .map((c) => c._id);

  const cakeCategoryIds = categories
    .filter(
      (c) =>
        c.name.toLowerCase().includes("cake") &&
        !c.name.toLowerCase().includes("bento")
    )
    .map((c) => c._id);

  const bentoFlavors = activeFlavors.filter((f) =>
    f.categoryIds?.some((id) => bentoCategoryIds.includes(id))
  );

  const cakeFlavors = activeFlavors.filter((f) =>
    f.categoryIds?.some((id) => cakeCategoryIds.includes(id))
  );

  return (
    <div className="bg-background min-h-screen">
      <div className="mx-auto max-w-7xl px-1 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="text-center">
          <h2 className="font-heading text-h1 text-text-primary">
            Our Latest Creations
          </h2>
          <p className="mt-4 font-body text-lg text-text-primary/90 max-w-2xl mx-auto">
            Discover our handcrafted cakes, made with love and the finest
            ingredients. Perfect for every celebration and every sweet moment.
          </p>
        </div>

        <ProductFeed initialProducts={initialProducts} validDiscounts={discounts} />
      </div>

       {/* Bento Flavors */}
       {bentoFlavors.length > 0 && (
        <Section className="bg-subtleBackground/30">
          <Container>
            <h2 className="text-center font-heading text-h2 mb-10">
              Bento Flavors
            </h2>
            <FlavorCarousel flavors={bentoFlavors} />
          </Container>
        </Section>
      )}

      {/* Cake Flavors */}
      {cakeFlavors.length > 0 && (
        <Section className="bg-subtleBackground/30 border-t border-border/50">
          <Container>
            <h2 className="text-center font-heading text-h2 mb-10">
              Cake Flavors
            </h2>
            <FlavorCarousel flavors={cakeFlavors} />
          </Container>
        </Section>
      )}
    </div>
  );
};

export default ProductsPage;
