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
      vehicles: {
        Row: {
          id: string;
          company_id: string;
          vehicle_number: string;
          vehicle_type: string | null;
          owner_name: string | null;
          driver_name: string | null;
          capacity_kg: number | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          vehicle_number: string;
          vehicle_type?: string | null;
          owner_name?: string | null;
          driver_name?: string | null;
          capacity_kg?: number | null;
          is_active?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["vehicles"]["Insert"]>;
        Relationships: [];
      };
      weighment_slips: {
        Row: {
          id: string;
          company_id: string;
          slip_number: string | null;
          slip_date: string;
          vehicle_id: string | null;
          vehicle_number: string | null;
          product_id: string | null;
          party_id: string | null;
          slip_type: string;
          gross_weight_kg: number | null;
          tare_weight_kg: number | null;
          net_weight_kg: number | null;
          moisture_pct: number | null;
          quality_grade: string | null;
          remarks: string | null;
          document_id: string | null;
          custom_fields: Json;
          is_cancelled: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          slip_number?: string | null;
          slip_date: string;
          vehicle_id?: string | null;
          vehicle_number?: string | null;
          product_id?: string | null;
          party_id?: string | null;
          slip_type: string;
          gross_weight_kg?: number | null;
          tare_weight_kg?: number | null;
          moisture_pct?: number | null;
          quality_grade?: string | null;
          remarks?: string | null;
          document_id?: string | null;
          custom_fields?: Json;
          is_cancelled?: boolean;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["weighment_slips"]["Insert"]>;
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          company_id: string;
          payment_number: string;
          payment_date: string;
          payment_type: string;
          party_id: string | null;
          bank_account_id: string | null;
          amount: number;
          payment_mode: string | null;
          utr_number: string | null;
          cheque_number: string | null;
          cheque_date: string | null;
          bank_name: string | null;
          reference_number: string | null;
          purpose: string | null;
          paid_to: string | null;
          notes: string | null;
          document_id: string | null;
          is_reconciled: boolean;
          is_cancelled: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          payment_number: string;
          payment_date: string;
          payment_type: string;
          party_id?: string | null;
          bank_account_id?: string | null;
          amount: number;
          payment_mode?: string | null;
          utr_number?: string | null;
          cheque_number?: string | null;
          cheque_date?: string | null;
          bank_name?: string | null;
          reference_number?: string | null;
          purpose?: string | null;
          paid_to?: string | null;
          notes?: string | null;
          document_id?: string | null;
          is_reconciled?: boolean;
          is_cancelled?: boolean;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["payments"]["Insert"]>;
        Relationships: [];
      };
      purchase_entries: {
        Row: {
          id: string;
          company_id: string;
          entry_number: string;
          entry_date: string;
          supplier_id: string | null;
          vehicle_id: string | null;
          weighment_slip_id: string | null;
          product_id: string | null;
          quantity_kg: number | null;
          rate_per_kg: number | null;
          freight: number;
          advance_paid: number;
          total_amount: number;
          balance_due: number | null;
          payment_status: string;
          due_date: string | null;
          is_cancelled: boolean;
          notes: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          entry_number: string;
          entry_date: string;
          supplier_id?: string | null;
          vehicle_id?: string | null;
          weighment_slip_id?: string | null;
          product_id?: string | null;
          quantity_kg?: number | null;
          rate_per_kg?: number | null;
          freight?: number;
          advance_paid?: number;
          total_amount: number;
          balance_due?: number | null;
          payment_status?: string;
          due_date?: string | null;
          is_cancelled?: boolean;
          notes?: string | null;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["purchase_entries"]["Insert"]>;
        Relationships: [];
      };
      ledger_entries: {
        Row: {
          id: string;
          company_id: string;
          entry_date: string;
          account_type: string;
          account_id: string;
          account_name: string;
          entry_type: string;
          amount: number;
          narration: string | null;
          reference_type: string | null;
          reference_id: string | null;
          reference_number: string | null;
          is_opening: boolean;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          entry_date: string;
          account_type: string;
          account_id: string;
          account_name: string;
          entry_type: string;
          amount: number;
          narration?: string | null;
          reference_type?: string | null;
          reference_id?: string | null;
          reference_number?: string | null;
          is_opening?: boolean;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["ledger_entries"]["Insert"]>;
        Relationships: [];
      };
      expense_categories: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          parent_id: string | null;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          parent_id?: string | null;
          is_active?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["expense_categories"]["Insert"]>;
        Relationships: [];
      };
      expenses: {
        Row: {
          id: string;
          company_id: string;
          expense_date: string;
          category_id: string | null;
          amount: number;
          paid_from: string | null;
          paid_to: string | null;
          description: string | null;
          gst_amount: number;
          document_id: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          expense_date: string;
          category_id?: string | null;
          amount: number;
          paid_from?: string | null;
          paid_to?: string | null;
          description?: string | null;
          gst_amount?: number;
          document_id?: string | null;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["expenses"]["Insert"]>;
        Relationships: [];
      };
      payment_allocations: {
        Row: {
          id: string;
          payment_id: string;
          reference_type: string;
          reference_id: string;
          allocated_amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          payment_id: string;
          reference_type: string;
          reference_id: string;
          allocated_amount: number;
        };
        Update: Partial<Database["public"]["Tables"]["payment_allocations"]["Insert"]>;
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          company_id: string;
          file_name: string;
          file_path: string;
          file_url: string | null;
          file_type: string;
          file_size_bytes: number | null;
          mime_type: string | null;
          document_date: string | null;
          upload_date: string;
          uploaded_by: string | null;
          ocr_status: string;
          ocr_provider: string | null;
          ocr_confidence: number | null;
          ocr_raw_text: string | null;
          ocr_extracted: Json;
          ocr_flagged_fields: Json;
          ocr_processed_at: string | null;
          doc_type: string | null;
          classification_confidence: number | null;
          linked_to: string | null;
          linked_id: string | null;
          file_hash: string | null;
          is_duplicate: boolean;
          notes: string | null;
          tags: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          file_name: string;
          file_path: string;
          file_url?: string | null;
          file_type: string;
          file_size_bytes?: number | null;
          mime_type?: string | null;
          document_date?: string | null;
          uploaded_by?: string | null;
          ocr_status?: string;
          ocr_provider?: string | null;
          ocr_confidence?: number | null;
          ocr_raw_text?: string | null;
          ocr_extracted?: Json;
          ocr_flagged_fields?: Json;
          ocr_processed_at?: string | null;
          doc_type?: string | null;
          classification_confidence?: number | null;
          linked_to?: string | null;
          linked_id?: string | null;
          file_hash?: string | null;
          is_duplicate?: boolean;
          notes?: string | null;
          tags?: string[] | null;
        };
        Update: Partial<Database["public"]["Tables"]["documents"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      is_company_member: {
        Args: { target_company: string };
        Returns: boolean;
      };
      match_party: {
        Args: { p_company: string; p_name: string };
        Returns: string | null;
      };
      next_entry_number: {
        Args: { p_company: string; p_prefix: string; p_table: string };
        Returns: string;
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
export type Vehicle = Tables<"vehicles">;
export type WeighmentSlip = Tables<"weighment_slips">;
export type Payment = Tables<"payments">;
export type DocumentRow = Tables<"documents">;
export type PurchaseEntry = Tables<"purchase_entries">;
export type LedgerEntry = Tables<"ledger_entries">;
