import { useFormContext, Controller } from "react-hook-form";
import { CustomOrderFormData } from "@/lib/validation/customOrderSchema";
import { Input } from "@/components/ui/Input";

export default function Step5Contact() {
  const { control, formState: { errors } } = useFormContext<CustomOrderFormData>();

  return (
    <div className="space-y-8 max-w-sm mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold font-heading text-primary">Your Details</h2>
        <p className="text-primary/70 mt-2">How should we reach you for the price quote?</p>
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-semibold mb-1 text-primary">Full Name</label>
          <Controller
            control={control}
            name="contact.name"
            render={({ field }) => (
              <Input
                {...field}
                placeholder="Your Name"
                className={`h-12 bg-white ${errors.contact?.name ? "border-red-500" : ""}`}
              />
            )}
          />
          {errors.contact?.name && (
             <p className="text-primary/60 text-xs mt-1">{errors.contact.name.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1 text-primary">Phone Number</label>
          <Controller
            control={control}
            name="contact.phone"
            render={({ field }) => (
              <Input
                {...field}
                type="tel"
                placeholder="Your Phone Number"
                 className={`h-12 bg-white ${errors.contact?.phone ? "border-red-500" : ""}`}
              />
            )}
          />
           {errors.contact?.phone && (
             <p className="text-primary/60 text-xs mt-1">{errors.contact.phone.message}</p>
          )}
        </div>

        <div>
           <label className="block text-sm font-semibold mb-1 text-primary">Email Address <span className="font-normal text-primary/50 text-xs">(Optional)</span></label>
           <Controller
             control={control}
             name="contact.email"
             render={({ field }) => (
               <Input
                 {...field}
                 type="email"
                 placeholder="name@example.com"
                 className={`h-12 bg-white ${errors.contact?.email ? "border-red-500" : ""}`}
               />
             )}
           />
            {errors.contact?.email && (
             <p className="text-primary/60 text-xs mt-1">{errors.contact.email.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
