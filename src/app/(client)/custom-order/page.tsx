"use client";

import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { customOrderSchema, CustomOrderFormData } from "@/lib/validation/customOrderSchema";
import { Button } from "@/components/ui/Button";
import { Loader2, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

// Steps
import StepEventDetails from "@/components/custom-order/StepEventDetails";
import StepDesign from "@/components/custom-order/StepDesign";
import StepContact from "@/components/custom-order/StepContact";

const STEPS = [
  { id: 0, title: "Event Details", fields: ["eventDate", "eventType", "servingSize"] },
  { id: 1, title: "Design & Flavor", fields: ["description", "flavorPreferences", "budgetRange", "referenceImageUrls"] },
  { id: 2, title: "Contact Info", fields: ["customerName", "customerEmail", "customerPhone", "communicationMethod"] },
];

export default function CustomOrderPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const methods = useForm<CustomOrderFormData>({
    resolver: zodResolver(customOrderSchema),
    mode: "onSubmit",
    defaultValues: {
      status: "new",
      referenceImageUrls: [],
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

      setIsSuccess(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error(error);
      alert("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-md w-full text-center space-y-6 animate-in zoom-in duration-500">
          <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-success/10 text-success">
            <CheckCircle2 className="h-12 w-12" />
          </div>
          <h2 className="text-3xl font-heading font-bold text-primary">Request Received!</h2>
          <p className="text-lg text-gray-600">
            Thank you for your custom order request. We will review your details and get back to you shortly via your preferred contact method.
          </p>
          <Button onClick={() => router.push("/")} className="w-full">
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-heading font-bold text-primary mb-2">
            Build Your Dream Cake
          </h1>
          <p className="text-gray-600">
            Tell us about your event and we'll craft something unique.
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8 relative">
          <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-secondary/20">
            <div
              style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary transition-all duration-500"
            ></div>
          </div>
          <div className="flex justify-between text-sm font-medium text-gray-500 uppercase tracking-wider">
            {STEPS.map((step, idx) => (
              <span
                key={step.id}
                className={
                  idx <= currentStep
                    ? "text-primary font-bold transition-colors"
                    : ""
                }
              >
                {idx + 1}. {step.title}
              </span>
            ))}
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white shadow-xl rounded-2xl p-8 border border-white/50">
          <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)}>
              {/* Dynamic Step Rendering */}
              {currentStep === 0 && <StepEventDetails />}
              {currentStep === 1 && <StepDesign />}
              {currentStep === 2 && <StepContact />}

              {/* Navigation Actions */}
              <div className="mt-10 pt-6 border-t flex justify-between gap-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleBack}
                  disabled={currentStep === 0 || isSubmitting}
                  className={currentStep === 0 ? "invisible" : ""}
                >
                  Back
                </Button>

                {currentStep < STEPS.length - 1 ? (
                  <Button type="button" onClick={handleNext} className="w-32">
                    Next
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    className="w-32"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      "Submit Request"
                    )}
                  </Button>
                )}
              </div>
            </form>
          </FormProvider>
        </div>
      </div>
    </div>
  );
}
