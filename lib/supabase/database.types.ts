// ============================================================
// Database types
// ------------------------------------------------------------
// In production these are GENERATED, not hand-written:
//   npx supabase gen types typescript --local > lib/supabase/database.types.ts
//
// This hand-written subset covers the tables used by the
// modules built so far (core multi-tenancy, parties, products)
// so the app type-checks before you run the generator.
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          owner_id: string | null;
          name: string;
          legal_name: string | null;
          gst_number: string | null;
          pan_number: string | null;
          state_code: string | null;
          city: string | null;
          state: string | null;
          currency: string | null;
          is_active: boolean;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string | null;
          name: string;
          legal_name?: string | null;
          gst_number?: string | null;
          pan_number?: string | null;
          state_code?: string | null;
          city?: string | null;
          state?: string | null;
          currency?: string | null;
          is_active?: boolean;
          settings?: Json;
        };
        Update: Partial<Database["public"]["Tables"]["companies"]["Insert"]>;
        Relationships: [];
      };
      company_members: {
        Row: {
          id: string;
          company_id: string;
          user_id: string;
          role: string;
          custom_permissions: Json;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          user_id: string;
          role?: string;
          custom_permissions?: Json;
          is_active?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["company_members"]["Insert"]>;
        Relationships: [];
      };
      product_categories: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          parent_id: string | null;
          description: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          parent_id?: string | null;
          description?: string | null;
          is_active?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["product_categories"]["Insert"]>;
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          company_id: string;
          category_id: string | null;
          name: string;
          code: string | null;
          hsn_code: string | null;
          unit: string;
          unit_weight: number | null;
          gst_rate: number;
          description: string | null;
          custom_fields: Json;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          category_id?: string | null;
          name: string;
          code?: string | null;
          hsn_code?: string | null;
          unit?: string;
          unit_weight?: number | null;
          gst_rate?: number;
          description?: string | null;
          custom_fields?: Json;
          is_active?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
        Relationships: [];
      };
      parties: {
        Row: {
          id: string;
          company_id: string;
          type: string[];
          name: string;
          alias: string | null;
          gst_number: string | null;
          pan_number: string | null;
          address_line1: string | null;
          address_line2: string | null;
          city: string | null;
          state: string | null;
          state_code: string | null;
          pincode: string | null;
          phone: string | null;
          whatsapp: string | null;
          email: string | null;
          bank_name: string | null;
          bank_account: string | null;
          bank_ifsc: string | null;
          bank_branch: string | null;
          credit_limit: number;
          credit_days: number;
          opening_balance: number;
          opening_balance_type: string;
          custom_fields: Json;
          notes: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          type: string[];
          name: string;
          alias?: string | null;
          gst_number?: string | null;
          pan_number?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          city?: string | null;
          state?: string | null;
          state_code?: string | null;
          pincode?: string | null;
          phone?: string | null;
          whatsapp?: string | null;
          email?: string | null;
          bank_name?: string | null;
          bank_account?: string | null;
          bank_ifsc?: string | null;
          bank_branch?: string | null;
          credit_limit?: number;
          credit_days?: number;
          opening_balance?: number;
          opening_balance_type?: string;
          custom_fields?: Json;
          notes?: string | null;
          is_active?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["parties"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      is_company_member: {
        Args: { target_company: string };
        Returns: boolean;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}

// Convenience helpers
type PublicSchema = Database["public"];
export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];

export type Company = Tables<"companies">;
export type Party = Tables<"parties">;
export type Product = Tables<"products">;
export type ProductCategory = Tables<"product_categories">;
