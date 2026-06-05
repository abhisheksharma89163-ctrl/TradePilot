import { z } from "zod";
import { UNITS } from "@/lib/constants";

const optionalString = z
  .string()
  .trim()
  .max(255)
  .optional()
  .or(z.literal("").transform(() => undefined));

export const productSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(255),
  code: optionalString,
  category_id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  hsn_code: z
    .string()
    .trim()
    .regex(/^[0-9]{4,8}$/, "HSN must be 4-8 digits")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  unit: z.enum(UNITS).default("KG"),
  unit_weight: z.coerce
    .number()
    .min(0)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  gst_rate: z.coerce.number().min(0).max(100).default(0),
  description: optionalString,
});

export type ProductInput = z.infer<typeof productSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(255),
  description: optionalString,
});

export type CategoryInput = z.infer<typeof categorySchema>;
