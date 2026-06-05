import { z } from "zod";
import { GSTIN_REGEX, PAN_REGEX } from "@/lib/constants";

const optionalString = z
  .string()
  .trim()
  .max(255)
  .optional()
  .or(z.literal("").transform(() => undefined));

export const partySchema = z.object({
  type: z
    .array(z.enum(["customer", "supplier"]))
    .min(1, "Select at least one type (customer and/or supplier)"),
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(255),
  alias: optionalString,
  gst_number: z
    .string()
    .trim()
    .toUpperCase()
    .regex(GSTIN_REGEX, "Invalid 15-character GSTIN")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  pan_number: z
    .string()
    .trim()
    .toUpperCase()
    .regex(PAN_REGEX, "Invalid PAN (e.g. ABCDE1234F)")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9]{10}$/, "Phone must be 10 digits")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  whatsapp: optionalString,
  email: z
    .string()
    .trim()
    .email("Invalid email")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  address_line1: optionalString,
  city: optionalString,
  state: optionalString,
  state_code: z
    .string()
    .trim()
    .regex(/^[0-9]{2}$/, "State code must be 2 digits")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  pincode: z
    .string()
    .trim()
    .regex(/^[0-9]{6}$/, "Pincode must be 6 digits")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  bank_name: optionalString,
  bank_account: optionalString,
  bank_ifsc: optionalString,
  credit_limit: z.coerce.number().min(0).default(0),
  credit_days: z.coerce.number().int().min(0).default(0),
  opening_balance: z.coerce.number().default(0),
  opening_balance_type: z.enum(["debit", "credit"]).default("debit"),
  notes: optionalString,
});

export type PartyInput = z.infer<typeof partySchema>;
