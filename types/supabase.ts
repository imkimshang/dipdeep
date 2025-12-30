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
      profiles: {
        Row: {
          id: string
          role: 'teacher' | 'student' | null
          username: string | null
          organization: string | null
        }
        Insert: {
          id: string
          role?: 'teacher' | 'student' | null
          username?: string | null
          organization?: string | null
        }
        Update: {
          id?: string
          role?: 'teacher' | 'student' | null
          username?: string | null
          organization?: string | null
        }
      }
      teams: {
        Row: {
          id: string
          name: string | null
          teacher_id: string | null
          is_public_to_members: boolean | null
        }
        Insert: {
          id?: string
          name?: string | null
          teacher_id?: string | null
          is_public_to_members?: boolean | null
        }
        Update: {
          id?: string
          name?: string | null
          teacher_id?: string | null
          is_public_to_members?: boolean | null
        }
      }
      projects: {
        Row: {
          id: string
          user_id: string | null
          team_id: string | null
          title: string | null
          type: string | null
          progress_rate: number | null
          current_step: number | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          team_id?: string | null
          title?: string | null
          type?: string | null
          progress_rate?: number | null
          current_step?: number | null
        }
        Update: {
          id?: string
          user_id?: string | null
          team_id?: string | null
          title?: string | null
          type?: string | null
          progress_rate?: number | null
          current_step?: number | null
        }
      }
      project_steps: {
        Row: {
          id: string
          project_id: string | null
          step_number: number | null
          step_data: Json | null
          ai_feedback: Json | null
        }
        Insert: {
          id?: string
          project_id?: string | null
          step_number?: number | null
          step_data?: Json | null
          ai_feedback?: Json | null
        }
        Update: {
          id?: string
          project_id?: string | null
          step_number?: number | null
          step_data?: Json | null
          ai_feedback?: Json | null
        }
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
  }
}



