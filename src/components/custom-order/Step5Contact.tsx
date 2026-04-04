import { useFormContext, Controller } from "react-hook-form";
import { CustomOrderFormData } from "@/lib/validation/customOrderSchema";
import { Input } from "@/components/ui/Input";

// Inline SVG brand icons
const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

export default function Step5Contact() {
  const { control, watch, setValue, formState: { errors } } = useFormContext<CustomOrderFormData>();
  const socialNickname = watch("contact.socialNickname") ?? "";
  const socialPlatform = watch("contact.socialPlatform");
  const hasNickname = socialNickname.trim().length > 0;
  const phoneIsOptional = hasNickname && !!socialPlatform;

  const togglePlatform = (platform: "instagram" | "facebook") => {
    setValue(
      "contact.socialPlatform",
      socialPlatform === platform ? undefined : platform,
      { shouldValidate: true }
    );
  };

  return (
    <div className="space-y-8 max-w-sm mx-auto">
      <div className="text-center mb-8">
        <p className="text-primary/70 mt-2">How should we reach you for the price quote?</p>
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-semibold mb-1 text-primary">
            Full Name{" "}
            {hasNickname && (
              <span className="font-normal text-primary/50 text-xs">(Optional)</span>
            )}
          </label>
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
          <label className="block text-sm font-semibold mb-1 text-primary">
            Social Media Nickname{" "}
            <span className="font-normal text-primary/50 text-xs">(Optional)</span>
          </label>
          <Controller
            control={control}
            name="contact.socialNickname"
            render={({ field }) => (
              <Input
                {...field}
                placeholder="e.g. @username or Instagram handle"
                className="h-12 bg-white"
              />
            )}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1 text-primary">
            Phone Number{" "}
            {phoneIsOptional && (
              <span className="font-normal text-primary/50 text-xs">(Optional)</span>
            )}
          </label>
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

        {/* ── Social platform alternative ── */}
        <div className="pt-1">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-primary/10" />
            <span className="text-xs font-semibold text-primary/40 uppercase tracking-wider whitespace-nowrap">
              Or contact through social media
            </span>
            <div className="flex-1 h-px bg-primary/10" />
          </div>

          {!hasNickname && (
            <p className="text-xs text-primary/40 text-center mb-3 italic">
              Fill in your social media nickname above to enable this option
            </p>
          )}

          <div className="flex gap-3 justify-center">
            {/* Instagram */}
            <button
              type="button"
              disabled={!hasNickname}
              onClick={() => togglePlatform("instagram")}
              className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl border font-semibold text-sm transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
                socialPlatform === "instagram"
                  ? "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 text-white border-transparent shadow-lg shadow-pink-500/25"
                  : "bg-white border-primary/15 text-primary/70 hover:border-pink-400/50 hover:text-pink-600 hover:bg-pink-50/50"
              }`}
            >
              <InstagramIcon className="w-4 h-4" />
              Instagram
            </button>

            {/* Facebook */}
            <button
              type="button"
              disabled={!hasNickname}
              onClick={() => togglePlatform("facebook")}
              className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl border font-semibold text-sm transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
                socialPlatform === "facebook"
                  ? "bg-[#1877F2] text-white border-transparent shadow-lg shadow-blue-500/25"
                  : "bg-white border-primary/15 text-primary/70 hover:border-blue-500/50 hover:text-blue-600 hover:bg-blue-50/50"
              }`}
            >
              <FacebookIcon className="w-4 h-4" />
              Facebook
            </button>
          </div>

          {phoneIsOptional && (
            <p className="text-xs text-center text-primary/50 mt-3">
              ✓ We'll reach out via{" "}
              <span className="font-semibold capitalize">{socialPlatform}</span> at{" "}
              <span className="font-semibold">{socialNickname}</span>
            </p>
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

