import Link from "next/link";
import HomeCategories from "@/components/(client)/home/HomeCategories";
import HomeCollections from "@/components/(client)/home/HomeCollections";
import HeroSlider from "@/components/(client)/home/HeroSlider";
import {
  getBestsellers,
  getActiveFlavors,
  getLatestBlogs,
} from "@/lib/db/data";
import {
  getActiveDiscounts,
  getActiveCategories,
  getActiveCollections,
  getHeroSlides,
  getActiveSeasonalEvent,
  getActiveDiscountedProducts,
} from "@/lib/data";
import DiscountShowcase from "@/components/(client)/home/DiscountShowcase";
import ProductCarousel from "@/components/(client)/home/ProductCarousel";
import SeasonalHomeBanner from "@/components/(client)/home/SeasonalHomeBanner";
import BlogCarousel from "@/components/(client)/home/BlogCarousel";
import { FlavorCarousel } from "@/components/(client)/home/flavors/FlavorCarousel";
import { VideoBanner } from "@/components/content/VideoBanner";
import { getVideoBanner } from "@/app/actions/site-content";

export const revalidate = 60; // Revalidate at most once every 60 seconds

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
  <div className={`mx-auto max-w-7xl px-lg ${className || ""}`}>{children}</div>
);

const Homepage = async () => {
  const [
    bestsellers,
    discounts,
    latestBlogs,
    categories,
    collections,
    heroSlides,
    activeSeasonalEvent,
    discountedProducts,
    activeFlavors,
    videoBannerContent,
  ] = await Promise.all([
    getBestsellers(),
    getActiveDiscounts(),
    getLatestBlogs(),
    getActiveCategories(),
    getActiveCollections(),
    getHeroSlides(),
    getActiveSeasonalEvent(),
    getActiveDiscountedProducts(),
    getActiveFlavors(),
    getVideoBanner(),
  ]);

  // Filter Flavors
  const bentoCategoryIds = categories
    .filter((c) => c.name.toLowerCase().includes("bento cakes"))
    .map((c) => c._id);

  const cakeCategoryIds = categories
    .filter((c) => c.name.trim().toLowerCase() === "cakes")
    .map((c) => c._id);

  const bentoFlavors = activeFlavors.filter((f) =>
    f.categoryIds?.some((id) => bentoCategoryIds.includes(id))
  );

  const cakeFlavors = activeFlavors.filter((f) =>
    f.categoryIds?.some((id) => cakeCategoryIds.includes(id))
  );

  return (
    <div className="bg-background font-body text-primary">
      <HeroSlider slides={heroSlides} />

      <SeasonalHomeBanner activeEvent={activeSeasonalEvent} />
      <HomeCategories categories={categories} />
      <HomeCollections collections={collections} />
      <VideoBanner content={videoBannerContent} />

      {discountedProducts.length > 0 && (
        <Section>
          <Container>
            <DiscountShowcase
              products={discountedProducts}
              validDiscounts={discounts}
            />
          </Container>
        </Section>
      )}

      <Section>
        <Container>
          <h2 className="text-center font-heading text-h2">Our Bestsellers</h2>
          <div className="mx-auto max-w-7xl">
            <ProductCarousel
              products={bestsellers}
              validDiscounts={discounts}
            />
          </div>
        </Container>
      </Section>

      {/* Latest Articles Section */}
      {latestBlogs.length > 0 && (
        <Section className=" border-t border-border">
          <Container>
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-heading text-h2">Latest From The Blog</h2>
              <Link
                href="/blog"
                className="hidden sm:inline-flex text-sm font-bold text-accent hover:underline"
              >
                View All
              </Link>
            </div>
            <BlogCarousel blogs={latestBlogs} />
            <div className="mt-6 text-center sm:hidden">
              <Link
                href="/blog"
                className="text-sm font-bold text-accent hover:underline"
              >
                View All Articles
              </Link>
            </div>
          </Container>
        </Section>
      )}

      {/* Bento Flavors */}
      {bentoFlavors.length > 0 && (
        <Section className="bg-subtleBackground/30">
          <Container>
            <h2 className="text-center font-heading text-h2 mb-lg">
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
            <h2 className="text-center font-heading text-h2 mb-lg">
              Cake Flavors
            </h2>
            <FlavorCarousel flavors={cakeFlavors} />
          </Container>
        </Section>
      )}
    </div>
  );
};

export default Homepage;
