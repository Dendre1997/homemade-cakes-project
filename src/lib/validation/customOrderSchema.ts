import { z } from "zod";

export const customOrderSchema = z.object({
  // Status and CreatedAt are backend managed or optional for the form
  status: z.literal("new").optional(), 
  createdAt: z.date().optional(),
  
  eventDate: z.date().min(new Date(), "Event date must be in the future"),
  eventType: z.string().min(1, "Event type is required"),
  servingSize: z.string().min(1, "Serving size is required"),
  description: z.string().min(10, "Description must be at least 10 characters long"),
  flavorPreferences: z.string().min(1, "Flavor preferences are required"),
  referenceImageUrls: z
    .array(z.string().url("Invalid image URL"))
    .max(3, "You can upload a maximum of 3 images"),
  budgetRange: z.string().min(1, "Budget range is required"),
  customerName: z.string().min(1, "Name is required"),
  customerPhone: z.string().min(1, "Phone number is required"),
  customerEmail: z.string().email("Invalid email address"),
  communicationMethod: z.enum(["phone", "email", "WhatsApp"]),
});

export type CustomOrderFormData = z.infer<typeof customOrderSchema>;
