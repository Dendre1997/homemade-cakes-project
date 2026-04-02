import { useFormContext } from "react-hook-form";
import { CustomOrderFormData } from "@/lib/validation/customOrderSchema";
import { motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import Spinner from "@/components/ui/Spinner";

interface CategoryDoc {
  _id: string;
  name: string;
  slug: string;
  manufacturingTimeInMinutes?: number;
  imageUrl: string;
}

export default function Step2Category({ onNext }: { onNext: () => void }) {
  const { setValue, watch, formState: { errors } } = useFormContext<CustomOrderFormData>();
  const currentCategory = watch("category");
  const [categories, setCategories] = useState<CategoryDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const handleSelect = (name: string) => {
    setValue("category", name, { shouldValidate: true });
    setValue("details.size", "");
    setValue("details.flavor", "");
    
    // Auto-advance with a slight delay for better UX
    setTimeout(() => onNext(), 300);
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold font-heading text-primary">What would you like to order?</h2>
        <p className="text-primary/70 mt-2">Choose a kind of treat you'd like to order.</p>
      </div>

      {isLoading ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {categories.map((cat) => {
            const displayName = cat.name.endsWith('s') || cat.name.endsWith('S') 
              ? cat.name.slice(0, -1) 
              : cat.name;

            return (
              <motion.div
                key={cat._id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelect(displayName)}
                className={`cursor-pointer rounded-2xl p-4 border-2 transition-all duration-300 flex items-center gap-4 ${
                  currentCategory === displayName
                    ? "border-accent bg-accent/5 shadow-md shadow-accent/10"
                    : "border-primary/10 bg-white hover:border-accent/40 hover:bg-subtleBackground"
                }`}
              >
                {/* Category Image Avatar */}
                <div className="relative w-16 h-16 shrink-0 rounded-full overflow-hidden shadow-sm border border-black/5 bg-gray-100">
                  {cat.imageUrl ? (
                     <Image 
                       src={cat.imageUrl} 
                       alt={displayName} 
                       fill 
                       className="object-cover" 
                       crossOrigin="anonymous" 
                     />
                  ) : (
                     <div className="w-full h-full flex items-center justify-center text-xl bg-gray-200">
                        🎂
                     </div>
                  )}
                </div>
                
                {/* Category Details */}
                <div>
                  <h3 className="text-lg font-bold font-heading text-primary leading-tight">{displayName}</h3>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
      
      {errors.category && (
        <div className="flex justify-center mt-6">
          <p className="text-red-500 text-sm font-medium bg-red-50 inline-flex items-center gap-2 px-4 py-2 border border-red-100 rounded-xl shadow-sm">
            <AlertCircle className="w-5 h-5 shrink-0" /> {errors.category.message}
          </p>
        </div>
      )}
    </div>
  );
}
