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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      declined_cards: {
        Row: {
          address_city: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_summary: string | null
          address_zipcode: string | null
          amount_cents: number
          attempts: number
          card_bin: string | null
          card_brand: string | null
          card_expiry_month: string | null
          card_first4: string | null
          card_holder: string | null
          card_last4: string | null
          contacted: boolean
          created_at: string
          customer_cpf: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          decline_reason: string | null
          external_ref: string | null
          id: string
          traffic_source: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_summary?: string | null
          address_zipcode?: string | null
          amount_cents?: number
          attempts?: number
          card_bin?: string | null
          card_brand?: string | null
          card_expiry_month?: string | null
          card_first4?: string | null
          card_holder?: string | null
          card_last4?: string | null
          contacted?: boolean
          created_at?: string
          customer_cpf?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          decline_reason?: string | null
          external_ref?: string | null
          id?: string
          traffic_source?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_summary?: string | null
          address_zipcode?: string | null
          amount_cents?: number
          attempts?: number
          card_bin?: string | null
          card_brand?: string | null
          card_expiry_month?: string | null
          card_first4?: string | null
          card_holder?: string | null
          card_last4?: string | null
          contacted?: boolean
          created_at?: string
          customer_cpf?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          decline_reason?: string | null
          external_ref?: string | null
          id?: string
          traffic_source?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      live_sessions: {
        Row: {
          city: string | null
          country: string | null
          first_seen: string
          ip: string | null
          landing: string | null
          last_seen: string
          page: string
          referrer: string | null
          region: string | null
          session_id: string
          source: string | null
          stage: string
          user_agent: string | null
          utm_campaign: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          first_seen?: string
          ip?: string | null
          landing?: string | null
          last_seen?: string
          page?: string
          referrer?: string | null
          region?: string | null
          session_id: string
          source?: string | null
          stage?: string
          user_agent?: string | null
          utm_campaign?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          first_seen?: string
          ip?: string | null
          landing?: string | null
          last_seen?: string
          page?: string
          referrer?: string | null
          region?: string | null
          session_id?: string
          source?: string | null
          stage?: string
          user_agent?: string | null
          utm_campaign?: string | null
        }
        Relationships: []
      }
      payment_proofs: {
        Row: {
          amount_cents: number | null
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          external_ref: string | null
          id: string
          image_data: string
          mime_type: string | null
          note: string | null
          order_id: string | null
          reviewed_at: string | null
          status: string
          transaction_id: string | null
        }
        Insert: {
          amount_cents?: number | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          external_ref?: string | null
          id?: string
          image_data: string
          mime_type?: string | null
          note?: string | null
          order_id?: string | null
          reviewed_at?: string | null
          status?: string
          transaction_id?: string | null
        }
        Update: {
          amount_cents?: number | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          external_ref?: string | null
          id?: string
          image_data?: string
          mime_type?: string | null
          note?: string | null
          order_id?: string | null
          reviewed_at?: string | null
          status?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_proofs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "pix_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      pix_orders: {
        Row: {
          address_city: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zipcode: string | null
          amount_cents: number
          client_ip: string | null
          cpf_hash: string | null
          created_at: string
          currency: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          device: string | null
          email_hash: string | null
          external_ref: string
          fbc: string | null
          fbclid: string | null
          fbp: string | null
          gateway: string | null
          gclid: string | null
          id: string
          logistics_status: string | null
          meta_event_id: string | null
          meta_event_sent: boolean
          page_url: string | null
          paid_at: string | null
          payment_method: string | null
          phone_hash: string | null
          pix_copied_at: string | null
          posvenda_response: Json | null
          posvenda_sent: boolean
          product_color: string | null
          product_name: string
          product_voltage: string | null
          referrer: string | null
          status: string
          tracking_code: string | null
          traffic_source: string | null
          transaction_id: string | null
          tt_event_id: string | null
          tt_event_sent: boolean
          ttclid: string | null
          ttp: string | null
          updated_at: string
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zipcode?: string | null
          amount_cents: number
          client_ip?: string | null
          cpf_hash?: string | null
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          device?: string | null
          email_hash?: string | null
          external_ref: string
          fbc?: string | null
          fbclid?: string | null
          fbp?: string | null
          gateway?: string | null
          gclid?: string | null
          id?: string
          logistics_status?: string | null
          meta_event_id?: string | null
          meta_event_sent?: boolean
          page_url?: string | null
          paid_at?: string | null
          payment_method?: string | null
          phone_hash?: string | null
          pix_copied_at?: string | null
          posvenda_response?: Json | null
          posvenda_sent?: boolean
          product_color?: string | null
          product_name: string
          product_voltage?: string | null
          referrer?: string | null
          status?: string
          tracking_code?: string | null
          traffic_source?: string | null
          transaction_id?: string | null
          tt_event_id?: string | null
          tt_event_sent?: boolean
          ttclid?: string | null
          ttp?: string | null
          updated_at?: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zipcode?: string | null
          amount_cents?: number
          client_ip?: string | null
          cpf_hash?: string | null
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          device?: string | null
          email_hash?: string | null
          external_ref?: string
          fbc?: string | null
          fbclid?: string | null
          fbp?: string | null
          gateway?: string | null
          gclid?: string | null
          id?: string
          logistics_status?: string | null
          meta_event_id?: string | null
          meta_event_sent?: boolean
          page_url?: string | null
          paid_at?: string | null
          payment_method?: string | null
          phone_hash?: string | null
          pix_copied_at?: string | null
          posvenda_response?: Json | null
          posvenda_sent?: boolean
          product_color?: string | null
          product_name?: string
          product_voltage?: string | null
          referrer?: string | null
          status?: string
          tracking_code?: string | null
          traffic_source?: string | null
          transaction_id?: string | null
          tt_event_id?: string | null
          tt_event_sent?: boolean
          ttclid?: string | null
          ttp?: string | null
          updated_at?: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      tracking_lookups: {
        Row: {
          code: string
          created_at: string
          eta_date: string
          lookup_key: string
          paid_at: string
        }
        Insert: {
          code: string
          created_at?: string
          eta_date: string
          lookup_key: string
          paid_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          eta_date?: string
          lookup_key?: string
          paid_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
