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
  referenceImages: z
    .array(z.string().url("Invalid image URL"))
    .min(1, "You must select or upload at least one reference image")
    .max(3, "You can upload a maximum of 3 images"),
  contact: z.object({
    name: z.string().min(2, "Name is required"),
    phone: z.string().min(5, "Valid phone number is required"),
    email: z.string().email("Invalid email address").optional().or(z.literal("")),
  }),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  convertedOrderId: z.string().optional(),
  agreedPrice: z.number().optional(),
  adminNotes: z.string().optional(),
});

export type CustomOrderFormData = z.infer<typeof customOrderSchema>;
