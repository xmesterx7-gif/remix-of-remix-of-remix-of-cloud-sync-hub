export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          after_data: Json | null
          before_data: Json | null
          business_date: string
          created_at: string
          entity: string
          id: string
          note: string | null
          organization_id: string | null
          record_id: string
          user_id: string
        }
        Insert: {
          action?: string
          after_data?: Json | null
          before_data?: Json | null
          business_date?: string
          created_at?: string
          entity: string
          id?: string
          note?: string | null
          organization_id?: string | null
          record_id: string
          user_id: string
        }
        Update: {
          action?: string
          after_data?: Json | null
          before_data?: Json | null
          business_date?: string
          created_at?: string
          entity?: string
          id?: string
          note?: string | null
          organization_id?: string | null
          record_id?: string
          user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          alarms: Json
          app_banner: string | null
          backend_checked_at: string | null
          backend_publishable_key: string
          backend_url: string
          chat_groups: Json
          created_at: string
          currency: string
          custom_roles: Json
          id: boolean
          login_banner: string | null
          updated_at: string
        }
        Insert: {
          alarms?: Json
          app_banner?: string | null
          backend_checked_at?: string | null
          backend_publishable_key?: string
          backend_url?: string
          chat_groups?: Json
          created_at?: string
          currency?: string
          custom_roles?: Json
          id?: boolean
          login_banner?: string | null
          updated_at?: string
        }
        Update: {
          alarms?: Json
          app_banner?: string | null
          backend_checked_at?: string | null
          backend_publishable_key?: string
          backend_url?: string
          chat_groups?: Json
          created_at?: string
          currency?: string
          custom_roles?: Json
          id?: boolean
          login_banner?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          actor_id: string | null
          after_data: Json | null
          before_data: Json | null
          business_date: string
          created_at: string
          id: number
          operation: string
          organization_id: string | null
          record_id: string
          table_name: string
        }
        Insert: {
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          business_date?: string
          created_at?: string
          id?: number
          operation: string
          organization_id?: string | null
          record_id: string
          table_name: string
        }
        Update: {
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          business_date?: string
          created_at?: string
          id?: number
          operation?: string
          organization_id?: string | null
          record_id?: string
          table_name?: string
        }
        Relationships: []
      }
      bicycle_purchases: {
        Row: {
          accounting_ref: string | null
          bike_type: string
          brand: string
          color: string
          created_at: string
          created_by: string
          deleted_at: string | null
          deleted_by: string | null
          description: string
          id: string
          organization_id: string | null
          purchase_price: number
          repair_task_id: string | null
          review_note: string | null
          size: string
          status: string
          updated_at: string
        }
        Insert: {
          accounting_ref?: string | null
          bike_type?: string
          brand?: string
          color?: string
          created_at?: string
          created_by: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string
          id?: string
          organization_id?: string | null
          purchase_price?: number
          repair_task_id?: string | null
          review_note?: string | null
          size?: string
          status?: string
          updated_at?: string
        }
        Update: {
          accounting_ref?: string | null
          bike_type?: string
          brand?: string
          color?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string
          id?: string
          organization_id?: string | null
          purchase_price?: number
          repair_task_id?: string | null
          review_note?: string | null
          size?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      daily_reports: {
        Row: {
          bonus: number
          business_date: string
          created_at: string
          created_by: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          notes: string
          organization_id: string | null
          penalty: number
          performance: string | null
          salary: number
          subject_id: string
          updated_at: string
        }
        Insert: {
          bonus?: number
          business_date: string
          created_at?: string
          created_by: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          notes?: string
          organization_id?: string | null
          penalty?: number
          performance?: string | null
          salary?: number
          subject_id: string
          updated_at?: string
        }
        Update: {
          bonus?: number
          business_date?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          notes?: string
          organization_id?: string | null
          penalty?: number
          performance?: string | null
          salary?: number
          subject_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          accounting_ref: string | null
          amount: number
          category: string
          created_at: string
          created_by: string
          date: string
          deleted_at: string | null
          deleted_by: string | null
          description: string
          id: string
          name: string | null
          organization_id: string | null
          related_user_id: string | null
          review_note: string | null
          status: string
          updated_at: string
        }
        Insert: {
          accounting_ref?: string | null
          amount?: number
          category?: string
          created_at?: string
          created_by: string
          date?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string
          id?: string
          name?: string | null
          organization_id?: string | null
          related_user_id?: string | null
          review_note?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          accounting_ref?: string | null
          amount?: number
          category?: string
          created_at?: string
          created_by?: string
          date?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string
          id?: string
          name?: string | null
          organization_id?: string | null
          related_user_id?: string | null
          review_note?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          created_at: string
          final_qty: number | null
          final_unit_price: number | null
          id: string
          invoice_id: string
          notes: string | null
          probable_qty: number
          probable_unit_price: number
          product_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          final_qty?: number | null
          final_unit_price?: number | null
          id?: string
          invoice_id: string
          notes?: string | null
          probable_qty?: number
          probable_unit_price?: number
          product_name?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          final_qty?: number | null
          final_unit_price?: number | null
          id?: string
          invoice_id?: string
          notes?: string | null
          probable_qty?: number
          probable_unit_price?: number
          product_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "purchase_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment: Json | null
          channel: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          edited_at: string | null
          id: string
          organization_id: string | null
          read_by: string[]
          sender_id: string
          text: string
          updated_at: string
        }
        Insert: {
          attachment?: Json | null
          channel: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          edited_at?: string | null
          id?: string
          organization_id?: string | null
          read_by?: string[]
          sender_id: string
          text?: string
          updated_at?: string
        }
        Update: {
          attachment?: Json | null
          channel?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          edited_at?: string | null
          id?: string
          organization_id?: string | null
          read_by?: string[]
          sender_id?: string
          text?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          deliver_at: string
          delivered: boolean
          id: string
          organization_id: string | null
          priority: string
          read_by: string[]
          title: string
          type: string
          updated_at: string
          url: string
          user_ids: string[]
          user_roles: Database["public"]["Enums"]["app_role"][]
          vibrate_pattern: number[] | null
        }
        Insert: {
          body?: string
          created_at?: string
          created_by?: string | null
          deliver_at?: string
          delivered?: boolean
          id?: string
          organization_id?: string | null
          priority?: string
          read_by?: string[]
          title?: string
          type?: string
          updated_at?: string
          url?: string
          user_ids?: string[]
          user_roles?: Database["public"]["Enums"]["app_role"][]
          vibrate_pattern?: number[] | null
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          deliver_at?: string
          delivered?: boolean
          id?: string
          organization_id?: string | null
          priority?: string
          read_by?: string[]
          title?: string
          type?: string
          updated_at?: string
          url?: string
          user_ids?: string[]
          user_roles?: Database["public"]["Enums"]["app_role"][]
          vibrate_pattern?: number[] | null
        }
        Relationships: []
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_role_id_organization_id_fkey"
            columns: ["role_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          bio: string
          created_at: string
          custom_role: string | null
          full_name: string
          id: string
          is_active: boolean
          is_archived: boolean
          is_worker: boolean
          permissions: Json
          phone: string
          title: string
          updated_at: string
          username: string
        }
        Insert: {
          bio?: string
          created_at?: string
          custom_role?: string | null
          full_name?: string
          id: string
          is_active?: boolean
          is_archived?: boolean
          is_worker?: boolean
          permissions?: Json
          phone?: string
          title?: string
          updated_at?: string
          username: string
        }
        Update: {
          bio?: string
          created_at?: string
          custom_role?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          is_archived?: boolean
          is_worker?: boolean
          permissions?: Json
          phone?: string
          title?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      purchase_invoices: {
        Row: {
          accounting_ref: string | null
          created_at: string
          created_by: string
          date: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          invoice_number: string
          notes: string
          organization_id: string | null
          status: string
          supplier: string
          updated_at: string
        }
        Insert: {
          accounting_ref?: string | null
          created_at?: string
          created_by: string
          date?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          invoice_number?: string
          notes?: string
          organization_id?: string | null
          status?: string
          supplier?: string
          updated_at?: string
        }
        Update: {
          accounting_ref?: string | null
          created_at?: string
          created_by?: string
          date?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          invoice_number?: string
          notes?: string
          organization_id?: string | null
          status?: string
          supplier?: string
          updated_at?: string
        }
        Relationships: []
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      system_initialization: {
        Row: {
          created_at: string
          id: boolean
          initialized_at: string | null
          is_initialized: boolean
          metadata: Json
          updated_at: string
          version: string
        }
        Insert: {
          created_at?: string
          id?: boolean
          initialized_at?: string | null
          is_initialized?: boolean
          metadata?: Json
          updated_at?: string
          version?: string
        }
        Update: {
          created_at?: string
          id?: boolean
          initialized_at?: string | null
          is_initialized?: boolean
          metadata?: Json
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          accounting_at: string | null
          accounting_ref: string | null
          approved_at: string | null
          bike_id: string | null
          completed_note: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          deleted_by: string | null
          description: string
          due_date: string | null
          edit_request: string | null
          edit_request_at: string | null
          final_wage: number | null
          id: string
          organization_id: string | null
          photo: string | null
          photos: Json
          priority: string
          reject_reason: string | null
          status: string
          submitted_at: string | null
          title: string
          updated_at: string
          wage: number
          wage_note: string | null
          worker_id: string | null
        }
        Insert: {
          accounting_at?: string | null
          accounting_ref?: string | null
          approved_at?: string | null
          bike_id?: string | null
          completed_note?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string
          due_date?: string | null
          edit_request?: string | null
          edit_request_at?: string | null
          final_wage?: number | null
          id?: string
          organization_id?: string | null
          photo?: string | null
          photos?: Json
          priority?: string
          reject_reason?: string | null
          status?: string
          submitted_at?: string | null
          title?: string
          updated_at?: string
          wage?: number
          wage_note?: string | null
          worker_id?: string | null
        }
        Update: {
          accounting_at?: string | null
          accounting_ref?: string | null
          approved_at?: string | null
          bike_id?: string | null
          completed_note?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string
          due_date?: string | null
          edit_request?: string | null
          edit_request_at?: string | null
          final_wage?: number | null
          id?: string
          organization_id?: string | null
          photo?: string | null
          photos?: Json
          priority?: string
          reject_reason?: string | null
          status?: string
          submitted_at?: string | null
          title?: string
          updated_at?: string
          wage?: number
          wage_note?: string | null
          worker_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_task: { Args: { _task_id: string }; Returns: boolean }
      current_org_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      initialize_system: {
        Args: never
        Returns: {
          created_at: string
          id: boolean
          initialized_at: string | null
          is_initialized: boolean
          metadata: Json
          updated_at: string
          version: string
        }
        SetofOptions: {
          from: "*"
          to: "system_initialization"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      is_active_user: { Args: { _user_id: string }; Returns: boolean }
      is_manager: { Args: { _user_id: string }; Returns: boolean }
      is_org_member: {
        Args: { _organization_id: string; _user_id: string }
        Returns: boolean
      }
      is_org_owner: { Args: { _user_id: string }; Returns: boolean }
      soft_delete_record: {
        Args: { _id: string; _restore?: boolean; _table: string }
        Returns: boolean
      }
      tehran_business_date: { Args: { _at?: string }; Returns: string }
    }
    Enums: {
      app_role:
        | "ADMIN"
        | "STORE_MANAGER"
        | "EMPLOYEE"
        | "MECHANIC"
        | "ACCOUNTANT"
        | "VIEWER"
        | "GENERAL_MANAGER"
        | "SENIOR_SELLER"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "ADMIN",
        "STORE_MANAGER",
        "EMPLOYEE",
        "MECHANIC",
        "ACCOUNTANT",
        "VIEWER",
        "GENERAL_MANAGER",
        "SENIOR_SELLER",
      ],
    },
  },
} as const
