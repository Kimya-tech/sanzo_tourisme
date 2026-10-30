
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "collectors": {
                  Row: {
                    "created_at": string,"display_name": string,"invite_id": string,"is_active": boolean,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"display_name": string,"invite_id": string,"is_active"?: boolean,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string,"invite_id"?: string,"is_active"?: boolean,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"site_photos": {
                  Row: {
                    "caption": string | null,"created_at": string,"created_by": string | null,"height": number | null,"id": string,"site_id": string,"sort_order": number,"storage_path": string,"thumb_path": string | null,"width": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "caption"?: string | null,"created_at"?: string,"created_by"?: string | null,"height"?: number | null,"id"?: string,"site_id": string,"sort_order"?: number,"storage_path": string,"thumb_path"?: string | null,"width"?: number | null
                  }
                  Update: {
                    "caption"?: string | null,"created_at"?: string,"created_by"?: string | null,"height"?: number | null,"id"?: string,"site_id"?: string,"sort_order"?: number,"storage_path"?: string,"thumb_path"?: string | null,"width"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "site_photos_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "collectors"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "site_photos_site_id_fkey"
      columns: ["site_id"]
isOneToOne: false
      referencedRelation: "sites"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "site_photos_site_id_fkey"
      columns: ["site_id"]
isOneToOne: false
      referencedRelation: "story_sites"
      referencedColumns: ["id"]
    }
                  ]
                },"sites": {
                  Row: {
                    "collected_on": string,"collector_name": string,"created_at": string,"created_by": string | null,"description": string,"id": string,"is_published": boolean,"language": string,"latitude": number,"location": unknown,"location_accuracy_m": number | null,"longitude": number,"name": string,"sort_order": number | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "collected_on"?: string,"collector_name": string,"created_at"?: string,"created_by"?: string | null,"description": string,"id"?: string,"is_published"?: boolean,"language"?: string,"latitude": number,"location"?: never,"location_accuracy_m"?: number | null,"longitude": number,"name": string,"sort_order"?: number | null,"updated_at"?: string
                  }
                  Update: {
                    "collected_on"?: string,"collector_name"?: string,"created_at"?: string,"created_by"?: string | null,"description"?: string,"id"?: string,"is_published"?: boolean,"language"?: string,"latitude"?: number,"location"?: never,"location_accuracy_m"?: number | null,"longitude"?: number,"name"?: string,"sort_order"?: number | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "sites_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "collectors"
      referencedColumns: ["user_id"]
    }
                  ]
                }
          }
          Views: {
            "story_sites": {
                  Row: {
                    "collected_on": string,"collector_name": string,"description": string,"id": string,"language": string,"latitude": number,"longitude": number,"name": string,"photos": Json | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                           "collected_on"?: string | null,"collector_name"?: string | null,"description"?: string | null,"id"?: string | null,"language"?: string | null,"latitude"?: number | null,"longitude"?: number | null,"name"?: string | null,"photos"?: never,"updated_at"?: string | null
                         }
                        Update: {
                           "collected_on"?: string | null,"collector_name"?: string | null,"description"?: string | null,"id"?: string | null,"language"?: string | null,"latitude"?: number | null,"longitude"?: number | null,"name"?: string | null,"photos"?: never,"updated_at"?: string | null
                         }
                        Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "my_collector":
{ Args: Record<PropertyKey, never>; Returns: {
              "display_name": string,"is_active": boolean
            }[]
                           },
"register_collector":
{ Args: { "p_code": string,"p_display_name": string }; Returns: boolean
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            
          }
        }
} as const
