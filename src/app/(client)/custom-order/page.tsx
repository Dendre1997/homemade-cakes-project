"use client";

import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { customOrderSchema, CustomOrderFormData } from "@/lib/validation/customOrderSchema";
import { Button } from "@/components/ui/Button";
import { Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Steps
import Step1Availability from "@/components/custom-order/Step1Availability";
import Step2Category from "@/components/custom-order/Step2Category";
import Step3SizeFlavor from "@/components/custom-order/Step3SizeFlavor";
import Step4Design from "@/components/custom-order/Step4Design";
import Step5Contact from "@/components/custom-order/Step5Contact";
import Step6Success from "@/components/custom-order/Step6Success";

const STEPS = [
  { id: 0, title: "Date", fields: ["date", "timeSlot", "deliveryMethod"] },
  { id: 1, title: "Category", fields: ["category"] },
  { id: 2, title: "Details", fields: ["details.size", "details.flavor"] },
  { id: 3, title: "Design", fields: ["referenceImages", "details.textOnCake", "details.designNotes"] },
  { id: 4, title: "Contact", fields: ["contact.name", "contact.email", "contact.phone", "contact.socialNickname", "contact.socialPlatform"] },
  { id: 5, title: "Success", fields: [] },
];

export default function CustomOrderPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState<CustomOrderFormData | null>(null);

  const methods = useForm<CustomOrderFormData>({
    resolver: zodResolver(customOrderSchema) as any,
    mode: "onTouched",
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
      approximatePrice: 0,
    },
  });

  const { trigger, handleSubmit } = methods;

  const handleNext = async () => {
    const fieldsToValidate = STEPS[currentStep].fields as any[];
    const isValid = await trigger(fieldsToValidate);

    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onSubmit = async (data: CustomOrderFormData) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/custom-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Failed to submit");
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
      case 2: return <Step3SizeFlavor onNext={handleNext} />;
      case 3: return <Step4Design />;
      case 4: return <Step5Contact />;
      case 5: return <Step6Success orderData={submittedData} />;
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
            <h1 className="text-4xl sm:text-5xl font-heading font-extrabold text-primary mb-4 tracking-tight">
              Build Your Dream Cake
            </h1>
            <p className="text-lg text-primary/70 max-w-xl mx-auto">
              Tell us about your event and we'll craft something unique, memorable, and delicious.
            </p>
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
    </div>
  );
}
