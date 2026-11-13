
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "activity": {
                  Row: {
                    "actor_id": string | null,"actor_name": string,"amount": number,"capsule_id": string,"created_at": string,"id": string,"kind": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"actor_name": string,"amount": number,"capsule_id": string,"created_at"?: string,"id"?: string,"kind": string
                  }
                  Update: {
                    "actor_id"?: string | null,"actor_name"?: string,"amount"?: number,"capsule_id"?: string,"created_at"?: string,"id"?: string,"kind"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "activity_capsule_id_fkey"
      columns: ["capsule_id"]
isOneToOne: false
      referencedRelation: "capsules"
      referencedColumns: ["id"]
    }
                  ]
                },"boxes": {
                  Row: {
                    "capsule_id": string,"collection_id": string | null,"created_at": string,"expires_on": string | null,"id": string,"qty": number,"size": number
                  }
                  ComputedFields: never
                  Insert: {
                    "capsule_id": string,"collection_id"?: string | null,"created_at"?: string,"expires_on"?: string | null,"id"?: string,"qty": number,"size": number
                  }
                  Update: {
                    "capsule_id"?: string,"collection_id"?: string | null,"created_at"?: string,"expires_on"?: string | null,"id"?: string,"qty"?: number,"size"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "boxes_capsule_id_fkey"
      columns: ["capsule_id"]
isOneToOne: false
      referencedRelation: "capsules"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "boxes_collection_id_fkey"
      columns: ["collection_id"]
isOneToOne: false
      referencedRelation: "collections"
      referencedColumns: ["id"]
    }
                  ]
                },"capsules": {
                  Row: {
                    "created_at": string | null,"description": string | null,"id": string,"img_box": string,"img_pour": string,"name": string,"sold_single": boolean,"sort_order": number,"spirit": string,"updated_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string | null,"description"?: string | null,"id": string,"img_box": string,"img_pour": string,"name": string,"sold_single"?: boolean,"sort_order"?: number,"spirit": string,"updated_at"?: string | null
                  }
                  Update: {
                    "created_at"?: string | null,"description"?: string | null,"id"?: string,"img_box"?: string,"img_pour"?: string,"name"?: string,"sold_single"?: boolean,"sort_order"?: number,"spirit"?: string,"updated_at"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"collection_items": {
                  Row: {
                    "capsule_id": string,"collection_id": string,"qty": number
                  }
                  ComputedFields: never
                  Insert: {
                    "capsule_id": string,"collection_id": string,"qty": number
                  }
                  Update: {
                    "capsule_id"?: string,"collection_id"?: string,"qty"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "collection_items_capsule_id_fkey"
      columns: ["capsule_id"]
isOneToOne: false
      referencedRelation: "capsules"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "collection_items_collection_id_fkey"
      columns: ["collection_id"]
isOneToOne: false
      referencedRelation: "collections"
      referencedColumns: ["id"]
    }
                  ]
                },"collections": {
                  Row: {
                    "created_at": string | null,"id": string,"img": string,"name": string,"sort_order": number,"updated_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string | null,"id": string,"img": string,"name": string,"sort_order"?: number,"updated_at"?: string | null
                  }
                  Update: {
                    "created_at"?: string | null,"id"?: string,"img"?: string,"name"?: string,"sort_order"?: number,"updated_at"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"guest_join_alerts": {
                  Row: {
                    "created_at": string,"guest_name": string,"id": string,"notified_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"guest_name": string,"id"?: string,"notified_at"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"guest_name"?: string,"id"?: string,"notified_at"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"guests": {
                  Row: {
                    "created_at": string | null,"name": string,"updated_at": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string | null,"name": string,"updated_at"?: string | null,"user_id": string
                  }
                  Update: {
                    "created_at"?: string | null,"name"?: string,"updated_at"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"low_stock_alerts": {
                  Row: {
                    "activity_id": string | null,"capsule_id": string,"created_at": string,"id": string,"notified_at": string | null,"qty": number
                  }
                  ComputedFields: never
                  Insert: {
                    "activity_id"?: string | null,"capsule_id": string,"created_at"?: string,"id"?: string,"notified_at"?: string | null,"qty": number
                  }
                  Update: {
                    "activity_id"?: string | null,"capsule_id"?: string,"created_at"?: string,"id"?: string,"notified_at"?: string | null,"qty"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "low_stock_alerts_activity_id_fkey"
      columns: ["activity_id"]
isOneToOne: false
      referencedRelation: "activity"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "low_stock_alerts_capsule_id_fkey"
      columns: ["capsule_id"]
isOneToOne: false
      referencedRelation: "capsules"
      referencedColumns: ["id"]
    }
                  ]
                },"settings": {
                  Row: {
                    "bar_name": string,"created_at": string | null,"id": number,"low_threshold": number,"owner_name": string,"show_out_to_guests": boolean,"updated_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "bar_name"?: string,"created_at"?: string | null,"id"?: number,"low_threshold"?: number,"owner_name"?: string,"show_out_to_guests"?: boolean,"updated_at"?: string | null
                  }
                  Update: {
                    "bar_name"?: string,"created_at"?: string | null,"id"?: number,"low_threshold"?: number,"owner_name"?: string,"show_out_to_guests"?: boolean,"updated_at"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"settings_private": {
                  Row: {
                    "created_at": string | null,"id": number,"join_key": string | null,"owner_email": string | null,"updated_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string | null,"id"?: number,"join_key"?: string | null,"owner_email"?: string | null,"updated_at"?: string | null
                  }
                  Update: {
                    "created_at"?: string | null,"id"?: number,"join_key"?: string | null,"owner_email"?: string | null,"updated_at"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"stock": {
                  Row: {
                    "capsule_id": string,"created_at": string | null,"qty": number,"updated_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "capsule_id": string,"created_at"?: string | null,"qty"?: number,"updated_at"?: string | null
                  }
                  Update: {
                    "capsule_id"?: string,"created_at"?: string | null,"qty"?: number,"updated_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "stock_capsule_id_fkey"
      columns: ["capsule_id"]
isOneToOne: true
      referencedRelation: "capsules"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "add_box":
{ Args: { "p_capsule_id": string,"p_expires_on"?: string }; Returns: number
                           },
"add_collection_box":
{ Args: { "p_collection_id": string,"p_expires_on"?: string }; Returns: undefined
                           },
"adjust_stock":
{ Args: { "p_capsule_id": string,"p_delta": number }; Returns: number
                           },
"claim_guest_join_alerts":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"claim_low_stock_alerts":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"delete_stale_anonymous_users":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"get_join_key":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"get_me":
{ Args: Record<PropertyKey, never>; Returns: {
              "name": string,"role": string
            }[]
                           },
"is_guest":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_member":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_owner":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"join_bar":
{ Args: { "p_key": string,"p_name": string }; Returns: string
                           },
"new_join_key":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"release_guest_join_alerts":
{ Args: { "p_ids": (string)[] }; Returns: undefined
                           },
"release_low_stock_alerts":
{ Args: { "p_ids": (string)[] }; Returns: undefined
                           },
"rotate_join_key":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"set_box_expiry":
{ Args: { "p_box_id": string,"p_expires_on": string }; Returns: undefined
                           },
"shelve_box":
{ Args: { "p_amount": number,"p_capsule_id": string,"p_collection_id": string,"p_expires_on": string,"p_owner_name": string }; Returns: number
                           },
"take_capsule":
{ Args: { "p_capsule_id": string }; Returns: {
              "activity_id": string,"is_low": boolean,"qty": number
            }[]
                           },
"undo_take":
{ Args: { "p_activity_id": string }; Returns: number
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
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
