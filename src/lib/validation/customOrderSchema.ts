import { z } from "zod";

export const customOrderSchema = z.object({
  status: z.enum(["pending_review", "converted", "rejected"]).optional().default("pending_review"),
  date: z.date(),
  timeSlot: z.string().min(1, "Please select a time slot"),
  deliveryMethod: z.enum(["pickup", "delivery"]).optional().default("pickup"),
  category: z.string().min(1, "Please select a creation type to continue"),
  details: z.object({
    size: z.string().min(1, "Please select a size or quantity"),
    flavor: z.string().min(1, "Please select a flavor"),
    textOnCake: z.string().optional(),
    designNotes: z.string().min(1, "Please provide overall design notes").max(1000, "Notes are too long"),
  }),
  allergies: z.string().min(2, "Please indicate if you have any allergies"),
  referenceImages: z
    .array(z.string().url("Invalid image URL"))
    .min(1, "You must select or upload at least one reference image")
    .max(3, "You can upload a maximum of 3 images"),
  contact: z.object({
    name: z.string().optional().default(""),
    phone: z.string().optional().default(""),
    email: z.string().email("Invalid email address").optional().or(z.literal("")),
    socialNickname: z.string().optional(),
    socialPlatform: z.enum(["instagram", "facebook"]).optional(),
  }).superRefine((data, ctx) => {
    const hasNickname = (data.socialNickname ?? "").trim().length > 0;
    const hasSocialPlatform = !!data.socialPlatform;

    // Name: required unless socialNickname is provided
    if (!hasNickname && (data.name ?? "").trim().length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_small,
        minimum: 2,
        origin: "string",
        inclusive: true,
        message: "Name is required (or provide your social media nickname)",
        path: ["name"],
      });
    }

    // Phone: required unless user has both a nickname AND chose a social platform
    const canContactViaSocial = hasNickname && hasSocialPlatform;
    if (!canContactViaSocial && (data.phone ?? "").trim().length < 5) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_small,
        minimum: 5,
        origin: "string",
        inclusive: true,
        message: "Phone is required (or select a social media platform above)",
        path: ["phone"],
      });
    }
  }),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  convertedOrderId: z.string().optional(),
  agreedPrice: z.number().optional(),
  approximatePrice: z.number().optional(),
  adminNotes: z.string().optional(),
});

export type CustomOrderFormData = z.infer<typeof customOrderSchema>;
