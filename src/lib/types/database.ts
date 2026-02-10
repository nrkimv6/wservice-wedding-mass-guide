// Supabase database types
// This is a simplified version - you can generate full types using Supabase CLI:
// npx supabase gen types typescript --project-id qxiuqztinabmdhclxsuz > src/lib/types/database.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      mass_configurations: {
        Row: {
          id: string
          user_id: string
          church_name: string
          date: string
          time: string
          groom_name: string
          bride_name: string
          celebrant_name: string | null
          hymns: Json
          liturgical_season: string
          gloria_enabled: boolean
          alleluia_enabled: boolean
          theme: string
          view_mode: string
          sync_enabled: boolean
          current_step: number
          announcements: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          church_name: string
          date: string
          time: string
          groom_name: string
          bride_name: string
          celebrant_name?: string | null
          hymns?: Json
          liturgical_season?: string
          gloria_enabled?: boolean
          alleluia_enabled?: boolean
          theme?: string
          view_mode?: string
          sync_enabled?: boolean
          current_step?: number
          announcements?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          church_name?: string
          date?: string
          time?: string
          groom_name?: string
          bride_name?: string
          celebrant_name?: string | null
          hymns?: Json
          liturgical_season?: string
          gloria_enabled?: boolean
          alleluia_enabled?: boolean
          theme?: string
          view_mode?: string
          sync_enabled?: boolean
          current_step?: number
          announcements?: Json
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
