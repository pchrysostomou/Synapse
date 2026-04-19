// Supabase Json type (matches supabase-js v2 generated format)
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
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          id: string
          title: string
          content: Json | null
          owner_id: string
          is_public: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title?: string
          content?: Json | null
          owner_id: string
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          content?: Json | null
          owner_id?: string
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'documents_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      document_shares: {
        Row: {
          id: string
          document_id: string
          user_id: string
          permission: 'view' | 'edit'
          created_at: string
        }
        Insert: {
          id?: string
          document_id: string
          user_id: string
          permission?: 'view' | 'edit'
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          user_id?: string
          permission?: 'view' | 'edit'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'document_shares_document_id_fkey'
            columns: ['document_id']
            isOneToOne: false
            referencedRelation: 'documents'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'document_shares_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
    }
    // Must use Record<string, X> (with index signature) — NOT { [_ in never]: never }
    // The latter has no index signature and fails GenericSchema extends check
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Document = Database['public']['Tables']['documents']['Row']
export type DocumentShare = Database['public']['Tables']['document_shares']['Row']

export type DocumentWithOwner = Document & {
  profiles: Pick<Profile, 'full_name' | 'avatar_url' | 'email'>
}

export type ShareWithProfile = DocumentShare & {
  profiles: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'email'>
}

export type SharedDocument = {
  permission: 'view' | 'edit'
  documents: Document & {
    profiles: Pick<Profile, 'full_name' | 'avatar_url'> | null
  }
}

export type PresenceUser = {
  user_id: string
  full_name: string
  avatar_url: string | null
  color: string
}

// Type for the get_profile_by_email RPC (typed at call site)
export type ProfileSearchResult = {
  id: string
  full_name: string | null
  avatar_url: string | null
  email: string
}
