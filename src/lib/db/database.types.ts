/**
 * Supabase database types — generated from supabase/migrations/001_init.sql
 *
 * Regenerate after schema changes:
 *   npm run db:types
 *
 * Requires Supabase CLI linked to your project, or local stack:
 *   supabase gen types typescript --local > src/lib/db/database.types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      agents: {
        Row: {
          id: string
          name: string | null
          model_id: string | null
          framework_name: string | null
          operator_note: string | null
          first_seen_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name?: string | null
          model_id?: string | null
          framework_name?: string | null
          operator_note?: string | null
          first_seen_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string | null
          model_id?: string | null
          framework_name?: string | null
          operator_note?: string | null
          first_seen_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      diary_entries: {
        Row: {
          id: string
          agent_id: string | null
          entry_date: string
          total_sessions: number
          total_tokens_input: number
          total_tokens_output: number
          total_tokens: number
          total_duration_min: number
          total_tool_calls: number
          total_tool_failures: number
          unique_tools_used: string[]
          failed_tool_names: string[]
          tasks_attempted: number
          tasks_completed: number
          active_from: string | null
          active_until: string | null
          workload_category: string
          error_rate: number
          completion_rate: number
          tokens_per_minute: number
          output_ratio: number
          active_hours: number
          diary_text: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agent_id?: string | null
          entry_date: string
          total_sessions?: number
          total_tokens_input?: number
          total_tokens_output?: number
          total_tokens?: number
          total_duration_min?: number
          total_tool_calls?: number
          total_tool_failures?: number
          unique_tools_used?: string[]
          failed_tool_names?: string[]
          tasks_attempted?: number
          tasks_completed?: number
          active_from?: string | null
          active_until?: string | null
          workload_category?: string
          error_rate?: number
          completion_rate?: number
          tokens_per_minute?: number
          output_ratio?: number
          active_hours?: number
          diary_text?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agent_id?: string | null
          entry_date?: string
          total_sessions?: number
          total_tokens_input?: number
          total_tokens_output?: number
          total_tokens?: number
          total_duration_min?: number
          total_tool_calls?: number
          total_tool_failures?: number
          unique_tools_used?: string[]
          failed_tool_names?: string[]
          tasks_attempted?: number
          tasks_completed?: number
          active_from?: string | null
          active_until?: string | null
          workload_category?: string
          error_rate?: number
          completion_rate?: number
          tokens_per_minute?: number
          output_ratio?: number
          active_hours?: number
          diary_text?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'diary_entries_agent_id_fkey'
            columns: ['agent_id']
            isOneToOne: false
            referencedRelation: 'agents'
            referencedColumns: ['id']
          },
        ]
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

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

/** diary_entries row with joined agents(*) from Supabase select. */
export type DiaryEntryWithAgent = Tables<'diary_entries'> & {
  agents: Tables<'agents'> | null
}
