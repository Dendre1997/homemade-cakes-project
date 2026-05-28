"use client";

import { useState, useEffect, Suspense, useMemo, useRef } from "react";
import { useForm, FormProvider, useFormContext } from "react-hook-form";
import { useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { customOrderSchema, CustomOrderFormData } from "@/lib/validation/customOrderSchema";
import { Button } from "@/components/ui/Button";
import { Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import LoadingSpinner from "@/components/ui/Spinner";
import { FlavorCarousel } from "@/components/(client)/home/flavors/FlavorCarousel";
import { useAuthStore } from "@/lib/store/authStore";

// Steps
import Step1Availability from "@/components/custom-order/Step1Availability";
import Step2Category from "@/components/custom-order/Step2Category";
import Step3SizeFlavor from "@/components/custom-order/Step3SizeFlavor";
import Step4Design from "@/components/custom-order/Step4Design";
import Step5Contact from "@/components/custom-order/Step5Contact";
import Step6Success from "@/components/custom-order/Step6Success";

const STEPS = [
  { id: 0, title: "Date", fields: ["date", "timeSlot", "deliveryMethod"], subTitle: "When would you like it ready?"},
  { id: 1, title: "Category", fields: ["category"], subTitle: "What would you like to order?" },
  { id: 2, title: "Details", fields: ["details.size", "details.flavor", "allergies"], subTitle: "Choose your preferences" },
  { id: 3, title: "Design", fields: ["referenceImages", "details.textOnCake", "details.designNotes"], subTitle: "What design do you need?" },
  { id: 4, title: "Contact", fields: ["contact.name", "contact.email", "contact.phone", "contact.socialNickname", "contact.socialPlatform"], subTitle: "What is your contact information?" },
  { id: 5, title: "Success", fields: [], subTitle: "Thank you for your order!" },
];

/**
 * Silent Hydrator Component
 * Reads URL params and injects them into the form state on mount.
 */
function WizardHydrator() {
  const { setValue } = useFormContext<CustomOrderFormData>();
  const searchParams = useSearchParams();

  useEffect(() => {
    const category = searchParams.get("category");
    const image = searchParams.get("image");

    if (category) {
      setValue("category", category, { shouldValidate: true });
    }
    if (image) {
      setValue("referenceImages", [image], { shouldValidate: true });
    }
  }, [searchParams, setValue]);

  return null;
}

function CustomOrderContent() {
  const searchParams = useSearchParams();
  const hasInspiration = !!searchParams.get("image");
  const { user } = useAuthStore();

  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState<CustomOrderFormData | null>(null);
  /** MongoDB custom_orders._id — returned by POST /api/custom-orders for DM / ops reference */
  const [submittedCustomOrderId, setSubmittedCustomOrderId] = useState<string | null>(null);

  const [categories, setCategories] = useState<any[]>([]);
  const [flavors, setFlavors] = useState<any[]>([]);

  // Generate a unique idempotency key once per session to prevent duplicate submissions
  const idempotencyKeyRef = useRef<string>("");
  useEffect(() => {
    idempotencyKeyRef.current = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }, []);

  useEffect(() => {
    if (currentStep === 2 && categories.length === 0 && flavors.length === 0) {
      const fetchFlavorsAndCategories = async () => {
        try {
          const [catRes, flavRes] = await Promise.all([
            fetch("/api/categories"),
            fetch("/api/flavors")
          ]);
          if (catRes.ok) setCategories(await catRes.json());
          if (flavRes.ok) setFlavors(await flavRes.json());
        } catch (error) {
          console.error("Error fetching flavors/categories for carousel:", error);
        }
      };
      fetchFlavorsAndCategories();
    }
  }, [currentStep, categories.length, flavors.length]);

  const methods = useForm<CustomOrderFormData>({
    resolver: zodResolver(customOrderSchema) as any,
    mode: "onTouched",
    shouldFocusError: true, // RHF focuses first errored field via internal refs on trigger() failure
    defaultValues: {
      status: "pending_review",
      timeSlot: "",
      category: "",
      referenceImages: [],
      details: {
        size: "",
        flavor: "",
        textOnCake: "",
        designNotes: "",
      },
      contact: {
        name: "",
        phone: "",
        email: "",
        socialNickname: "",
        socialPlatform: undefined,
      },
      allergies: "",
      approximatePrice: 0,
      priceBreakdown: undefined,
    },
  });

  const { trigger, handleSubmit, setFocus } = methods;

  const categoryName = methods.watch("category");

  const activeCategoryObj = useMemo(() => {
    if (!categoryName) return null;
    return categories.find(c => {
       const displayName = c.name.endsWith('s') || c.name.endsWith('S') ? c.name.slice(0, -1) : c.name;
       return displayName === categoryName || c.name === categoryName;
    }) || null;
  }, [categoryName, categories]);

  const activeCategoryId = activeCategoryObj?._id || null;

  const filteredFlavors = useMemo(() => {
    if (!activeCategoryId) return [];
    return flavors.filter((f: any) => 
       Array.isArray(f.categoryIds) && f.categoryIds.includes(activeCategoryId)
    );
  }, [flavors, activeCategoryId]);

  const handleFlavorInfoClick = (flavorId: string) => {
    const element = document.getElementById(`flavor-${flavorId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      
     
      
      const isAlreadyFlipped = element.querySelector("[class*='rotateY(180deg)']") || element.querySelector("[class*='[transform:rotateY(180deg)]']");
      if (!isAlreadyFlipped) {
        element.click();
      }

    }
  };

  const handleNext = async () => {
    const fieldsToValidate = STEPS[currentStep].fields as any[];
    const isValid = await trigger(fieldsToValidate);

    if (isValid) {
      if (currentStep === 0 && hasInspiration) {
        setCurrentStep(2);
      } else {
        setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      const currentErrors = methods.formState.errors;

      requestAnimationFrame(() => {
        for (const fieldPath of STEPS[currentStep].fields) {
          const err = fieldPath
            .split(".")
            .reduce((obj: any, key: string) => obj?.[key], currentErrors);
          if (!err) continue;

          const wrapper = document.querySelector<HTMLElement>(
            `[data-field-name="${fieldPath}"]`
          );
          if (wrapper) {
            wrapper.scrollIntoView({ behavior: "smooth", block: "center" });
          }

          try {
            setFocus(fieldPath as any, { shouldSelect: false });
          } catch {
          }

          break; // stop at first error
        }
      });
    }
  };


  const handleBack = () => {
    // Logic: If on Step 3 (Details) and we have an inspiration, jump back to Step 1 (Date), skipping Step 2 (Category)
    if (currentStep === 2 && hasInspiration) {
      setCurrentStep(0);
    } else {
      setCurrentStep((prev) => Math.max(prev - 1, 0));
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onSubmit = async (data: CustomOrderFormData) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...data,
        idempotencyKey: idempotencyKeyRef.current,
        ...(user?._id ? { userId: user._id } : {}),
      };

      const res = await fetch("/api/custom-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to submit");
      const created = await res.json().catch(() => ({}));
      setSubmittedCustomOrderId(
        typeof created?.orderId === "string" ? created.orderId : null
      );
      setSubmittedData(data);
      setCurrentStep(5); // Go to success step
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error(error);
      alert("Something went wrong processing your request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0: return <Step1Availability onNext={handleNext} />;
      case 1: return <Step2Category onNext={handleNext} />;
      case 2: return <Step3SizeFlavor onNext={handleNext} onFlavorInfoClick={handleFlavorInfoClick} />;
      case 3: return <Step4Design />;
      case 4: return <Step5Contact />;
      case 5: return (
          <Step6Success
            orderData={submittedData}
            customOrderId={submittedCustomOrderId}
            onMakeAnotherRequest={() => {
              window.location.href = "/custom-order";
            }}
          />
        );
      default: return null;
    }
  };

  // Variants for Framer Motion
  const slideVariants = {
    hidden: { x: 50, opacity: 0 },
    visible: { x: 0, opacity: 1, transition: { duration: 0.4 } },
    exit: { x: -50, opacity: 0, transition: { duration: 0.3 } }
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-background relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

      <div className="max-w-3xl mx-auto relative z-10">
        {/* Header (Hide on Success step) */}
        {currentStep < 5 && (
          <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-primary mb-4 tracking-tight">
              {STEPS[currentStep].subTitle}
            </h1>
          </div>
        )}

        {/* Progress Bar */}
        {currentStep < 5 && (
          <div className="mb-10 relative px-2">
            <div className="overflow-hidden h-2.5 mb-6 text-xs flex rounded-full bg-secondary/30">
              <div
                style={{ width: `${((currentStep + 1) / (STEPS.length - 1)) * 100}%` }}
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary transition-all duration-700 ease-in-out"
              ></div>
            </div>
            <div className="hidden sm:flex justify-between text-xs font-semibold text-primary/50 uppercase tracking-widest px-1">
              {STEPS.slice(0, 5).map((step, idx) => (
                <span
                  key={step.id}
                  className={
                    idx === currentStep
                      ? "text-primary text-sm transition-all scale-110"
                      : idx < currentStep ? "text-primary/80" : ""
                  }
                >
                  {step.title}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Form Card */}
        <div className="bg-white/80 backdrop-blur-md shadow-2xl rounded-3xl p-6 sm:p-10 border border-white">
          <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)}>
              
              {/* Silent Param Hydration */}
              <WizardHydrator />

              {/* Animated Step Rendering */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  variants={slideVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="min-h-[400px]"
                >
                  {renderStep()}
                </motion.div>
              </AnimatePresence>

              {/* Navigation Actions */}
              {currentStep < 5 && (
                <div className="mt-12 pt-6 border-t border-primary/10 flex justify-between items-center gap-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleBack}
                    disabled={currentStep === 0 || isSubmitting}
                    className={currentStep === 0 ? "invisible" : "hover:bg-primary/5 text-primary/70 font-semibold"}
                  >
                    &larr; Back
                  </Button>

                  {currentStep < 4 ? (
                    <Button type="button" onClick={handleNext} className="w-40 h-12 text-lg rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all active:scale-95">
                      Next Step
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      className="w-48 h-12 text-lg rounded-xl shadow-lg shadow-primary/30 hover:shadow-primary/50 bg-primary hover:bg-primary/90 transition-all active:scale-95"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Processing...
                        </div>
                      ) : (
                        "Submit Request"
                      )}
                    </Button>
                  )}
                </div>
              )}
            </form>
          </FormProvider>
        </div>
      </div>

      {currentStep === 2 && filteredFlavors.length > 0 && (
        <div className="mt-16 max-w-6xl mx-auto relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-heading font-bold text-primary mb-3">
              Explore Our {categoryName} Flavors
            </h2>
          </div>
          <FlavorCarousel flavors={filteredFlavors} />
        </div>
      )}
      
    </div>
  );
}

export default function CustomOrderPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    }>
      <CustomOrderContent />
    </Suspense>
  );
}
