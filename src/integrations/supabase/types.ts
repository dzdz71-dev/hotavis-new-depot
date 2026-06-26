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
      agency_settings: {
        Row: {
          commission_centimes_per_fiche: number
          id: string
          singleton: boolean
          super_admin_email: string
          updated_at: string
        }
        Insert: {
          commission_centimes_per_fiche?: number
          id?: string
          singleton?: boolean
          super_admin_email?: string
          updated_at?: string
        }
        Update: {
          commission_centimes_per_fiche?: number
          id?: string
          singleton?: boolean
          super_admin_email?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_secrets: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      agent_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          token?: string
        }
        Relationships: []
      }
      agent_notes: {
        Row: {
          agent_id: string
          commande_id: string
          contenu: string
          created_at: string
          id: string
        }
        Insert: {
          agent_id: string
          commande_id: string
          contenu: string
          created_at?: string
          id?: string
        }
        Update: {
          agent_id?: string
          commande_id?: string
          contenu?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_notes_commande_id_fkey"
            columns: ["commande_id"]
            isOneToOne: false
            referencedRelation: "commandes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_notes_commande_id_fkey"
            columns: ["commande_id"]
            isOneToOne: false
            referencedRelation: "commandes_agent_view"
            referencedColumns: ["id"]
          },
        ]
      }
      candidatures: {
        Row: {
          created_at: string
          email: string
          fiche_url: string | null
          id: string
          nom: string
          notes_admin: string | null
          prenom: string
          q2_reponse: string
          q3_reponse: string
          qcm_q1: string
          qcm_score: number
          siret: string | null
          statut: Database["public"]["Enums"]["candidature_statut"]
          telephone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          fiche_url?: string | null
          id?: string
          nom: string
          notes_admin?: string | null
          prenom: string
          q2_reponse: string
          q3_reponse: string
          qcm_q1: string
          qcm_score?: number
          siret?: string | null
          statut?: Database["public"]["Enums"]["candidature_statut"]
          telephone: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          fiche_url?: string | null
          id?: string
          nom?: string
          notes_admin?: string | null
          prenom?: string
          q2_reponse?: string
          q3_reponse?: string
          qcm_q1?: string
          qcm_score?: number
          siret?: string | null
          statut?: Database["public"]["Enums"]["candidature_statut"]
          telephone?: string
          updated_at?: string
        }
        Relationships: []
      }
      commandes: {
        Row: {
          activite: string
          assigned_agent_id: string | null
          assigned_at: string | null
          commission_centimes: number | null
          created_at: string
          delivered_at: string | null
          email: string
          entreprise: string
          id: string
          montant_centimes: number
          nom: string
          notes_admin: string | null
          paid_at: string | null
          prenom: string
          reminder_sent_at: string | null
          statut: Database["public"]["Enums"]["commande_statut"]
          stripe_payment_id: string | null
          stripe_session_id: string | null
          telephone: string
          updated_at: string
          ville: string
        }
        Insert: {
          activite: string
          assigned_agent_id?: string | null
          assigned_at?: string | null
          commission_centimes?: number | null
          created_at?: string
          delivered_at?: string | null
          email: string
          entreprise: string
          id?: string
          montant_centimes?: number
          nom: string
          notes_admin?: string | null
          paid_at?: string | null
          prenom: string
          reminder_sent_at?: string | null
          statut?: Database["public"]["Enums"]["commande_statut"]
          stripe_payment_id?: string | null
          stripe_session_id?: string | null
          telephone: string
          updated_at?: string
          ville: string
        }
        Update: {
          activite?: string
          assigned_agent_id?: string | null
          assigned_at?: string | null
          commission_centimes?: number | null
          created_at?: string
          delivered_at?: string | null
          email?: string
          entreprise?: string
          id?: string
          montant_centimes?: number
          nom?: string
          notes_admin?: string | null
          paid_at?: string | null
          prenom?: string
          reminder_sent_at?: string | null
          statut?: Database["public"]["Enums"]["commande_statut"]
          stripe_payment_id?: string | null
          stripe_session_id?: string | null
          telephone?: string
          updated_at?: string
          ville?: string
        }
        Relationships: []
      }
      onboardings: {
        Row: {
          adresse: string
          attributs: Json
          categorie_principale: string
          cgv_acceptees: boolean
          code_postal: string
          commande_id: string
          commentaires: string | null
          couverture_url: string | null
          created_at: string
          date_creation: string | null
          description: string
          email_google: string | null
          facture_nom: string | null
          facture_type: string | null
          facture_url: string | null
          horaires: Json
          id: string
          justificatif_nom: string | null
          justificatif_type: string | null
          justificatif_url: string | null
          logo_url: string | null
          nom_commercial: string
          pas_compte_google: boolean
          photos_etablissement: Json
          photos_urls: Json
          rayon_intervention_km: number | null
          services: Json
          site_web: string | null
          telephone_affiche: string
          type_presence: string
          updated_at: string
          ville: string
        }
        Insert: {
          adresse: string
          attributs?: Json
          categorie_principale: string
          cgv_acceptees?: boolean
          code_postal: string
          commande_id: string
          commentaires?: string | null
          couverture_url?: string | null
          created_at?: string
          date_creation?: string | null
          description: string
          email_google?: string | null
          facture_nom?: string | null
          facture_type?: string | null
          facture_url?: string | null
          horaires?: Json
          id?: string
          justificatif_nom?: string | null
          justificatif_type?: string | null
          justificatif_url?: string | null
          logo_url?: string | null
          nom_commercial: string
          pas_compte_google?: boolean
          photos_etablissement?: Json
          photos_urls?: Json
          rayon_intervention_km?: number | null
          services?: Json
          site_web?: string | null
          telephone_affiche: string
          type_presence: string
          updated_at?: string
          ville: string
        }
        Update: {
          adresse?: string
          attributs?: Json
          categorie_principale?: string
          cgv_acceptees?: boolean
          code_postal?: string
          commande_id?: string
          commentaires?: string | null
          couverture_url?: string | null
          created_at?: string
          date_creation?: string | null
          description?: string
          email_google?: string | null
          facture_nom?: string | null
          facture_type?: string | null
          facture_url?: string | null
          horaires?: Json
          id?: string
          justificatif_nom?: string | null
          justificatif_type?: string | null
          justificatif_url?: string | null
          logo_url?: string | null
          nom_commercial?: string
          pas_compte_google?: boolean
          photos_etablissement?: Json
          photos_urls?: Json
          rayon_intervention_km?: number | null
          services?: Json
          site_web?: string | null
          telephone_affiche?: string
          type_presence?: string
          updated_at?: string
          ville?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboardings_commande_id_fkey"
            columns: ["commande_id"]
            isOneToOne: true
            referencedRelation: "commandes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboardings_commande_id_fkey"
            columns: ["commande_id"]
            isOneToOne: true
            referencedRelation: "commandes_agent_view"
            referencedColumns: ["id"]
          },
        ]
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
      commandes_agent_view: {
        Row: {
          activite: string | null
          assigned_agent_id: string | null
          assigned_at: string | null
          created_at: string | null
          delivered_at: string | null
          entreprise: string | null
          id: string | null
          nom: string | null
          paid_at: string | null
          prenom: string | null
          statut: Database["public"]["Enums"]["commande_statut"] | null
          ville: string | null
        }
        Insert: {
          activite?: string | null
          assigned_agent_id?: string | null
          assigned_at?: string | null
          created_at?: string | null
          delivered_at?: string | null
          entreprise?: string | null
          id?: string | null
          nom?: string | null
          paid_at?: string | null
          prenom?: string | null
          statut?: Database["public"]["Enums"]["commande_statut"] | null
          ville?: string | null
        }
        Update: {
          activite?: string | null
          assigned_agent_id?: string | null
          assigned_at?: string | null
          created_at?: string | null
          delivered_at?: string | null
          entreprise?: string | null
          id?: string | null
          nom?: string | null
          paid_at?: string | null
          prenom?: string | null
          statut?: Database["public"]["Enums"]["commande_statut"] | null
          ville?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      claim_commande: { Args: { _commande_id: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "agent"
      candidature_statut: "nouveau" | "accepté" | "rejeté"
      commande_statut:
        | "en_attente"
        | "payé"
        | "onboarding_complété"
        | "en_cours"
        | "livrée"
        | "annulée"
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
      app_role: ["admin", "user", "agent"],
      candidature_statut: ["nouveau", "accepté", "rejeté"],
      commande_statut: [
        "en_attente",
        "payé",
        "onboarding_complété",
        "en_cours",
        "livrée",
        "annulée",
      ],
    },
  },
} as const
