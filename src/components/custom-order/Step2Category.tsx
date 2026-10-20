import { useFormContext } from "react-hook-form";
import { CustomOrderRequestData } from "@/lib/validation/customOrderSchema";
import { motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowLeft } from "lucide-react";
import Spinner from "@/components/ui/Spinner";
import {
  CANDY_BAR_GROUP_LABEL,
  collageImageUrlsFromSets,
  partitionCustomOrderCategories,
} from "@/lib/customOrderCategoryDisplay";

interface CategoryDoc {
  _id: string;
  name: string;
  slug: string;
  categoryType?: string;
  manufacturingTimeInMinutes?: number;
  imageUrl: string;
}

function CategoryAvatar({
  imageUrl,
  alt,
}: {
  imageUrl?: string;
  alt: string;
}) {
  return (
    <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-full border border-black/5 shadow-sm">
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={alt}
          fill
          sizes="256px"
          quality={100}
          className="object-cover"
          crossOrigin="anonymous"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gray-200 text-xl">
          🎂
        </div>
      )}
    </div>
  );
}

function CollageTile({ url, sizes = "128px" }: { url: string; sizes?: string }) {
  return (
    <div className="relative min-h-0 min-w-0 h-full w-full bg-gray-100">
      <Image
        src={url}
        alt=""
        fill
        sizes={sizes}
        quality={85}
        className="object-cover"
        crossOrigin="anonymous"
      />
    </div>
  );
}

/** 1–4 set images only; no empty cells. Zero URLs → single placeholder. */
function CandyBarCollageAvatar({ imageUrls }: { imageUrls: string[] }) {
  const urls = imageUrls.slice(0, 4);
  const n = urls.length;

  if (n === 0) {
    return <CategoryAvatar alt={CANDY_BAR_GROUP_LABEL} />;
  }

  if (n === 1) {
    return <CategoryAvatar imageUrl={urls[0]} alt={CANDY_BAR_GROUP_LABEL} />;
  }

  const shell =
    "relative h-32 w-32 shrink-0 overflow-hidden rounded-full border border-black/5 shadow-sm";

  if (n === 2) {
    return (
      <div className={shell}>
        <div className="grid h-full w-full grid-cols-2">
          {urls.map((url, i) => (
            <CollageTile key={i} url={url} />
          ))}
        </div>
      </div>
    );
  }

  if (n === 3) {
    return (
      <div className={shell}>
        <div className="grid h-full w-full grid-cols-2 grid-rows-2">
          <CollageTile url={urls[0]} />
          <CollageTile url={urls[1]} />
          <div className="relative col-span-2 min-h-0">
            <CollageTile url={urls[2]} sizes="256px" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={shell}>
      <div className="grid h-full w-full grid-cols-2 grid-rows-2">
        {urls.map((url, i) => (
          <CollageTile key={i} url={url} />
        ))}
      </div>
    </div>
  );
}

function categoryCardClass(isSelected: boolean) {
  return `cursor-pointer rounded-2xl p-4 border-2 transition-all duration-300 flex items-center gap-4 ${
    isSelected
      ? "border-accent bg-accent/5 shadow-md shadow-accent/10"
      : "border-primary/10 bg-white hover:border-accent/40 hover:bg-subtleBackground"
  }`;
}

export default function Step2Category({
  onNext: _onNext,
  itemIndex,
}: {
  onNext: () => void;
  itemIndex: number;
}) {
  const {
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<CustomOrderRequestData>();
  const ip = (sub: string): any => `items.${itemIndex}.${sub}`;
  const currentCategoryId = watch(ip("categoryId"));
  const categoryError =
    (errors.items?.[itemIndex] as any)?.categoryId ||
    (errors.items?.[itemIndex] as any)?.category;
  const [categories, setCategories] = useState<CategoryDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<"root" | "candy-bar">("root");

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch("/api/categories");
        if (res.ok) {
          const data = await res.json();
          setCategories(data);
        }
      } catch (e) {
        console.error("Failed to load categories", e);
      } finally {
        setIsLoading(false);
      }
    }
    fetchCategories();
  }, []);

  const { rootCategories, setCategories: setTypeCategories } = useMemo(
    () => partitionCustomOrderCategories(categories),
    [categories]
  );

  const collageUrls = useMemo(
    () => collageImageUrlsFromSets(setTypeCategories),
    [setTypeCategories]
  );

  const selectedSetId =
    setTypeCategories.some((c) => String(c._id) === String(currentCategoryId))
      ? String(currentCategoryId)
      : null;

  const candyBarHighlighted =
    view === "candy-bar" || Boolean(selectedSetId);

  const handleSelect = (cat: CategoryDoc) => {
    setValue(ip("categoryId"), String(cat._id), { shouldValidate: true });
    setValue(ip("category"), cat.name, { shouldValidate: true });
    setValue(ip("details.size"), "");
    setValue(ip("details.flavor"), "");
    setValue(ip("details.diameterId"), undefined);
    setValue(ip("details.tiers"), undefined);
  };

  return (
    <div className="space-y-2">
      <div className="text-center">
        <p className="text-primary/70 mt-2">
          {view === "candy-bar"
            ? "Choose a candy bar option"
            : "Select the product you’d like to order"}
        </p>
      </div>

      {view === "candy-bar" && (
        <button
          type="button"
          onClick={() => setView("root")}
          className="inline-flex items-center gap-2 text-sm font-semibold text-accent hover:text-accent/80 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          All categories
        </button>
      )}

      {isLoading ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {view === "root" && (
            <>
              {rootCategories.map((cat) => {
                const isSelected =
                  String(currentCategoryId) === String(cat._id);
                return (
                  <motion.div
                    key={cat._id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSelect(cat)}
                    className={categoryCardClass(isSelected)}
                  >
                    <CategoryAvatar imageUrl={cat.imageUrl} alt={cat.name} />
                    <div>
                      <h3 className="text-lg font-bold font-heading text-primary leading-tight">
                        {cat.name}
                      </h3>
                    </div>
                  </motion.div>
                );
              })}

              {setTypeCategories.length > 0 && (
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setView("candy-bar")}
                  className={categoryCardClass(candyBarHighlighted)}
                >
                  <CandyBarCollageAvatar imageUrls={collageUrls} />
                  <div>
                    <h3 className="text-lg font-bold font-heading text-primary leading-tight">
                      {CANDY_BAR_GROUP_LABEL}
                    </h3>
                    <p className="mt-1 text-sm text-primary/55">
                      {setTypeCategories.length} options
                    </p>
                  </div>
                </motion.div>
              )}
            </>
          )}

          {view === "candy-bar" &&
            setTypeCategories.map((cat) => {
              const isSelected = String(currentCategoryId) === String(cat._id);
              return (
                <motion.div
                  key={cat._id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelect(cat)}
                  className={categoryCardClass(isSelected)}
                >
                  <CategoryAvatar imageUrl={cat.imageUrl} alt={cat.name} />
                  <div>
                    <h3 className="text-lg font-bold font-heading text-primary leading-tight">
                      {cat.name}
                    </h3>
                  </div>
                </motion.div>
              );
            })}
        </div>
      )}

      {categoryError && (
        <div className="flex justify-center mt-6">
          <p className="text-red-500 text-sm font-medium bg-red-50 inline-flex items-center gap-2 px-4 py-2 border border-red-100 rounded-xl shadow-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />{" "}
            {categoryError.message}
          </p>
        </div>
      )}
    </div>
  );
}
