"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import ProductCard from "@/components/(client)/ProductCard";
import { Button } from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/Spinner";
import { Gem, Leaf, Heart } from "lucide-react";
import TestimonialCard from "@/components/ui/TestimonialCard";

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



const Homepage = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleNavClick = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => router.push(path), 500);
  };

  const featuredProducts = [
    /* product objects */
  ];

  // Placeholder Version
  return (
    <div className="bg-background font-body text-primary">
      <section className="relative flex h-[80vh] items-center justify-center text-center text-white">
        <div className="absolute inset-0 bg-black/40 z-10"></div>
        <Image
          src="/placeholderw.jpg"
          alt="A stunning signature cake"
          fill
          className="object-cover"
          priority
        />
        <div className="relative z-20">
          <h1 className="font-heading text-h1">
            Handcrafted Cakes for Life`s Sweetest Moments
          </h1>
          <div className="mt-lg">
            <Link
              href="/products"
              onClick={(e) => handleNavClick(e, "/products")}
            >
              <Button variant="primary" size="lg">
                View The Catalog
              </Button>
            </Link>
          </div>
        </div>
      </section>
      <Section>
        <Container className="grid grid-cols-1 gap-xl text-center md:grid-cols-3">
          <div className="flex flex-col items-center">
            <Gem className="h-10 w-10 text-accent" />
            <h3 className="mt-md font-heading text-h3">Unique Recipes</h3>
            <p className="mt-sm max-w-xs">
              Every cake is crafted from a time-honored recipe, perfected to
              create a truly unforgettable taste.
            </p>
          </div>
          <div className="flex flex-col items-center">
            <Leaf className="h-10 w-10 text-accent" />
            <h3 className="mt-md font-heading text-h3">Finest Ingredients</h3>
            <p className="mt-sm max-w-xs">
              We believe in quality you can taste, using only the freshest,
              locally-sourced ingredients.
            </p>
          </div>
          <div className="flex flex-col items-center">
            <Heart className="h-10 w-10 text-accent" />
            <h3 className="mt-md font-heading text-h3">Made With Love</h3>
            <p className="mt-sm max-w-xs">
              Each cake is more than just a dessert-it`s a piece of our heart,
              baked especially for you.
            </p>
          </div>
        </Container>
      </Section>

      <Section className="border-t border-border">
        <Container>
          <h2 className="text-center font-heading text-h2">Our Bestsellers</h2>
          <div className="mt-xl grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3">
            {/* <ProductCard product={...} /> */}
            {/* <ProductCard product={...} /> */}
            {/* <ProductCard product={...} /> */}
          </div>
          <div className="mt-xl text-center">
            <Link
              href="/products"
              onClick={(e) => handleNavClick(e, "/products")}
            >
              <Button variant="secondary" size="lg">
                See The Full Catalog
              </Button>
            </Link>
          </div>
        </Container>
      </Section>

      <Section className="bg-accent-secondary/10">
        <Container>
          <h2 className="text-center font-heading text-h2">
            Winter Wonderland
          </h2>
          <div className="mt-xl grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3">
          </div>
        </Container>
      </Section>

      <Section>
        <Container className="grid grid-cols-1 items-center gap-xl md:grid-cols-2">
          <div className="relative aspect-square w-full overflow-hidden rounded-medium">
            <Image
              src="/placeholder.png"
              alt="A friendly photo of the baker"
              fill
              className="object-cover"
            />
          </div>
          <div>
            <h2 className="font-heading text-h2">Created with Love and Care</h2>
            <p className="mt-md">
              At Homemade Cakes, every creation is a piece of our heart. We
              believe in the magic of traditional baking, using only
              high-quality ingredients to ensure every bite is a moment of pure
              joy.
            </p>
            <div className="mt-lg">
              <Link href="/about" onClick={(e) => handleNavClick(e, "/about")}>
                <Button variant="secondary">Read Our Story</Button>
              </Link>
            </div>
          </div>
        </Container>
      </Section>

      <Section className="border-t border-border">
        <Container>
          <h2 className="text-center font-heading text-h2">
            What Our Customers Are Saying
          </h2>
          <div className="grid grid-cols-1 gap-md md:grid-cols-3">
            <TestimonialCard
              rating={5}
              quote="This was the most delicious cake I have ever had! Truly homemade quality and exceptional service."
              author="Anastasiia P."
            />
            <TestimonialCard
              rating={5}
              quote="Absolutely perfect for our celebration. The attention to detail and flavor was incredible."
              author="John D."
            />
            <TestimonialCard
              rating={4}
              quote="You can taste the quality and the love baked into every single slice. We will definitely be back for more!"
              author="Sarah L."
            />
          </div>
        </Container>
      </Section>

      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <LoadingSpinner />
        </div>
      )}
    </div>
  );
};

export default Homepage;
