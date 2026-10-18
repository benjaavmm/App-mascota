export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      applications: {
        Row: {
          accepts_followup: boolean;
          adults_count: number;
          applicant_id: string;
          care_plan: string;
          children_ages: string | null;
          children_count: number;
          commits_return_not_abandon: boolean;
          commits_sterilization: boolean;
          commits_vet_care: boolean;
          completed_at: string | null;
          conversation_id: string | null;
          created_at: string;
          decided_at: string | null;
          decision_message: string | null;
          experience: string;
          has_secure_yard: boolean;
          hours_alone: number;
          household_agrees: boolean;
          housing_tenure: Database["public"]["Enums"]["housing_tenure"];
          housing_type: Database["public"]["Enums"]["housing_type"];
          id: string;
          landlord_allows_pets: boolean | null;
          motivation: string;
          other_pets: string | null;
          pet_id: string;
          publisher_id: string;
          status: Database["public"]["Enums"]["application_status"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          accepts_followup: boolean;
          adults_count: number;
          applicant_id?: string;
          care_plan: string;
          children_ages?: string | null;
          children_count?: number;
          commits_return_not_abandon: boolean;
          commits_sterilization: boolean;
          commits_vet_care: boolean;
          completed_at?: string | null;
          conversation_id?: string | null;
          created_at?: string;
          decided_at?: string | null;
          decision_message?: string | null;
          experience: string;
          has_secure_yard: boolean;
          hours_alone: number;
          household_agrees: boolean;
          housing_tenure: Database["public"]["Enums"]["housing_tenure"];
          housing_type: Database["public"]["Enums"]["housing_type"];
          id?: string;
          landlord_allows_pets?: boolean | null;
          motivation: string;
          other_pets?: string | null;
          pet_id: string;
          publisher_id: string;
          status?: Database["public"]["Enums"]["application_status"];
          updated_at?: string;
        };
        Update: {
          accepts_followup?: boolean;
          adults_count?: number;
          applicant_id?: string;
          care_plan?: string;
          children_ages?: string | null;
          children_count?: number;
          commits_return_not_abandon?: boolean;
          commits_sterilization?: boolean;
          commits_vet_care?: boolean;
          completed_at?: string | null;
          conversation_id?: string | null;
          created_at?: string;
          decided_at?: string | null;
          decision_message?: string | null;
          experience?: string;
          has_secure_yard?: boolean;
          hours_alone?: number;
          household_agrees?: boolean;
          housing_tenure?: Database["public"]["Enums"]["housing_tenure"];
          housing_type?: Database["public"]["Enums"]["housing_type"];
          id?: string;
          landlord_allows_pets?: boolean | null;
          motivation?: string;
          other_pets?: string | null;
          pet_id?: string;
          publisher_id?: string;
          status?: Database["public"]["Enums"]["application_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "applications_applicant_id_fkey";
            columns: ["applicant_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "applications_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "applications_pet_id_fkey";
            columns: ["pet_id"];
            isOneToOne: false;
            referencedRelation: "pets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "applications_publisher_id_fkey";
            columns: ["publisher_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_log: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          details: NonNullable<Json>;
          id: number;
          target_id: string | null;
          target_type: string;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          details?: NonNullable<Json>;
          id?: never;
          target_id?: string | null;
          target_type: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          details?: NonNullable<Json>;
          id?: never;
          target_id?: string | null;
          target_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      blocks: {
        Row: {
          blocked_id: string;
          blocker_id: string;
          created_at: string;
        };
        ComputedFields: never;
        Insert: {
          blocked_id: string;
          blocker_id?: string;
          created_at?: string;
        };
        Update: {
          blocked_id?: string;
          blocker_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey";
            columns: ["blocked_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey";
            columns: ["blocker_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      communes: {
        Row: {
          code: string;
          name: string;
          region_code: string;
        };
        ComputedFields: never;
        Insert: {
          code: string;
          name: string;
          region_code: string;
        };
        Update: {
          code?: string;
          name?: string;
          region_code?: string;
        };
        Relationships: [
          {
            foreignKeyName: "communes_region_code_fkey";
            columns: ["region_code"];
            isOneToOne: false;
            referencedRelation: "regions";
            referencedColumns: ["code"];
          },
        ];
      };
      conversations: {
        Row: {
          created_at: string;
          id: string;
          last_message_at: string | null;
          last_message_preview: string | null;
          last_message_sender_id: string | null;
          pet_id: string;
          recipient_id: string;
          recipient_last_read_at: string | null;
          recipient_shared_contact_at: string | null;
          starter_id: string;
          starter_last_read_at: string | null;
          starter_shared_contact_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          last_message_at?: string | null;
          last_message_preview?: string | null;
          last_message_sender_id?: string | null;
          pet_id: string;
          recipient_id: string;
          recipient_last_read_at?: string | null;
          recipient_shared_contact_at?: string | null;
          starter_id: string;
          starter_last_read_at?: string | null;
          starter_shared_contact_at?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          last_message_at?: string | null;
          last_message_preview?: string | null;
          last_message_sender_id?: string | null;
          pet_id?: string;
          recipient_id?: string;
          recipient_last_read_at?: string | null;
          recipient_shared_contact_at?: string | null;
          starter_id?: string;
          starter_last_read_at?: string | null;
          starter_shared_contact_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "conversations_last_message_sender_id_fkey";
            columns: ["last_message_sender_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_pet_id_fkey";
            columns: ["pet_id"];
            isOneToOne: false;
            referencedRelation: "pets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_recipient_id_fkey";
            columns: ["recipient_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_starter_id_fkey";
            columns: ["starter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      favorites: {
        Row: {
          created_at: string;
          pet_id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          pet_id: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          pet_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "favorites_pet_id_fkey";
            columns: ["pet_id"];
            isOneToOne: false;
            referencedRelation: "pets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "favorites_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      followups: {
        Row: {
          adopter_id: string;
          application_id: string;
          created_at: string;
          due_on: string;
          id: string;
          label: string;
          notes: string | null;
          overdue_notified_at: string | null;
          pet_id: string;
          photo_path: string | null;
          publisher_comment: string | null;
          publisher_id: string;
          reminded_at: string | null;
          submitted_at: string | null;
          wellbeing: number | null;
        };
        ComputedFields: never;
        Insert: {
          adopter_id: string;
          application_id: string;
          created_at?: string;
          due_on: string;
          id?: string;
          label: string;
          notes?: string | null;
          overdue_notified_at?: string | null;
          pet_id: string;
          photo_path?: string | null;
          publisher_comment?: string | null;
          publisher_id: string;
          reminded_at?: string | null;
          submitted_at?: string | null;
          wellbeing?: number | null;
        };
        Update: {
          adopter_id?: string;
          application_id?: string;
          created_at?: string;
          due_on?: string;
          id?: string;
          label?: string;
          notes?: string | null;
          overdue_notified_at?: string | null;
          pet_id?: string;
          photo_path?: string | null;
          publisher_comment?: string | null;
          publisher_id?: string;
          reminded_at?: string | null;
          submitted_at?: string | null;
          wellbeing?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "followups_adopter_id_fkey";
            columns: ["adopter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "followups_application_id_fkey";
            columns: ["application_id"];
            isOneToOne: false;
            referencedRelation: "applications";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "followups_pet_id_fkey";
            columns: ["pet_id"];
            isOneToOne: false;
            referencedRelation: "pets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "followups_publisher_id_fkey";
            columns: ["publisher_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          body: string;
          conversation_id: string;
          created_at: string;
          id: string;
          kind: Database["public"]["Enums"]["message_kind"];
          safety_flag: boolean;
          sender_id: string;
        };
        ComputedFields: never;
        Insert: {
          body: string;
          conversation_id: string;
          created_at?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["message_kind"];
          safety_flag?: boolean;
          sender_id?: string;
        };
        Update: {
          body?: string;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["message_kind"];
          safety_flag?: boolean;
          sender_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          body: string | null;
          created_at: string;
          id: string;
          link: string | null;
          read_at: string | null;
          title: string;
          type: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          body?: string | null;
          created_at?: string;
          id?: string;
          link?: string | null;
          read_at?: string | null;
          title: string;
          type: string;
          user_id: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          id?: string;
          link?: string | null;
          read_at?: string | null;
          title?: string;
          type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      pet_alerts: {
        Row: {
          commune_code: string | null;
          created_at: string;
          id: string;
          kind: Database["public"]["Enums"]["listing_kind"];
          region_code: string | null;
          size: Database["public"]["Enums"]["pet_size"] | null;
          species: Database["public"]["Enums"]["species"] | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          commune_code?: string | null;
          created_at?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["listing_kind"];
          region_code?: string | null;
          size?: Database["public"]["Enums"]["pet_size"] | null;
          species?: Database["public"]["Enums"]["species"] | null;
          user_id?: string;
        };
        Update: {
          commune_code?: string | null;
          created_at?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["listing_kind"];
          region_code?: string | null;
          size?: Database["public"]["Enums"]["pet_size"] | null;
          species?: Database["public"]["Enums"]["species"] | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pet_alerts_commune_code_fkey";
            columns: ["commune_code"];
            isOneToOne: false;
            referencedRelation: "communes";
            referencedColumns: ["code"];
          },
          {
            foreignKeyName: "pet_alerts_region_code_fkey";
            columns: ["region_code"];
            isOneToOne: false;
            referencedRelation: "regions";
            referencedColumns: ["code"];
          },
          {
            foreignKeyName: "pet_alerts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      pet_photos: {
        Row: {
          created_at: string;
          id: string;
          owner_id: string;
          pet_id: string;
          position: number;
          storage_path: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          owner_id?: string;
          pet_id: string;
          position?: number;
          storage_path: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          owner_id?: string;
          pet_id?: string;
          position?: number;
          storage_path?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pet_photos_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pet_photos_pet_id_fkey";
            columns: ["pet_id"];
            isOneToOne: false;
            referencedRelation: "pets";
            referencedColumns: ["id"];
          },
        ];
      };
      pets: {
        Row: {
          adopted_at: string | null;
          birth_date_estimate: string | null;
          breed: string;
          color: string | null;
          commune_code: string;
          cover_path: string | null;
          created_at: string;
          description: string;
          dewormed: boolean;
          energy: Database["public"]["Enums"]["energy_level"] | null;
          event_date: string | null;
          good_with_cats: boolean | null;
          good_with_dogs: boolean | null;
          good_with_kids: boolean | null;
          health_notes: string | null;
          hidden: boolean;
          hidden_at: string | null;
          hidden_reason: string | null;
          id: string;
          is_urgent: boolean;
          kind: Database["public"]["Enums"]["listing_kind"];
          location_hint: string | null;
          microchipped: boolean;
          name: string;
          owner_id: string;
          region_code: string | null;
          requirements: string | null;
          search_vector: unknown;
          sex: Database["public"]["Enums"]["pet_sex"];
          size: Database["public"]["Enums"]["pet_size"];
          special_needs: boolean;
          species: Database["public"]["Enums"]["species"];
          status: Database["public"]["Enums"]["pet_status"];
          sterilized: boolean;
          updated_at: string;
          vaccinated: boolean;
          weight_kg: number | null;
        };
        ComputedFields: never;
        Insert: {
          adopted_at?: string | null;
          birth_date_estimate?: string | null;
          breed?: string;
          color?: string | null;
          commune_code: string;
          cover_path?: string | null;
          created_at?: string;
          description: string;
          dewormed?: boolean;
          energy?: Database["public"]["Enums"]["energy_level"] | null;
          event_date?: string | null;
          good_with_cats?: boolean | null;
          good_with_dogs?: boolean | null;
          good_with_kids?: boolean | null;
          health_notes?: string | null;
          hidden?: boolean;
          hidden_at?: string | null;
          hidden_reason?: string | null;
          id?: string;
          is_urgent?: boolean;
          kind?: Database["public"]["Enums"]["listing_kind"];
          location_hint?: string | null;
          microchipped?: boolean;
          name: string;
          owner_id?: string;
          region_code?: never;
          requirements?: string | null;
          search_vector?: unknown;
          sex?: Database["public"]["Enums"]["pet_sex"];
          size: Database["public"]["Enums"]["pet_size"];
          special_needs?: boolean;
          species?: Database["public"]["Enums"]["species"];
          status?: Database["public"]["Enums"]["pet_status"];
          sterilized?: boolean;
          updated_at?: string;
          vaccinated?: boolean;
          weight_kg?: number | null;
        };
        Update: {
          adopted_at?: string | null;
          birth_date_estimate?: string | null;
          breed?: string;
          color?: string | null;
          commune_code?: string;
          cover_path?: string | null;
          created_at?: string;
          description?: string;
          dewormed?: boolean;
          energy?: Database["public"]["Enums"]["energy_level"] | null;
          event_date?: string | null;
          good_with_cats?: boolean | null;
          good_with_dogs?: boolean | null;
          good_with_kids?: boolean | null;
          health_notes?: string | null;
          hidden?: boolean;
          hidden_at?: string | null;
          hidden_reason?: string | null;
          id?: string;
          is_urgent?: boolean;
          kind?: Database["public"]["Enums"]["listing_kind"];
          location_hint?: string | null;
          microchipped?: boolean;
          name?: string;
          owner_id?: string;
          region_code?: never;
          requirements?: string | null;
          search_vector?: unknown;
          sex?: Database["public"]["Enums"]["pet_sex"];
          size?: Database["public"]["Enums"]["pet_size"];
          special_needs?: boolean;
          species?: Database["public"]["Enums"]["species"];
          status?: Database["public"]["Enums"]["pet_status"];
          sterilized?: boolean;
          updated_at?: string;
          vaccinated?: boolean;
          weight_kg?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "pets_commune_code_fkey";
            columns: ["commune_code"];
            isOneToOne: false;
            referencedRelation: "communes";
            referencedColumns: ["code"];
          },
          {
            foreignKeyName: "pets_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pets_region_code_fkey";
            columns: ["region_code"];
            isOneToOne: false;
            referencedRelation: "regions";
            referencedColumns: ["code"];
          },
        ];
      };
      profile_private: {
        Row: {
          phone: string | null;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          phone?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          phone?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profile_private_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          account_status: Database["public"]["Enums"]["account_status"];
          account_type: Database["public"]["Enums"]["account_type"];
          adult_confirmed_at: string | null;
          avatar_path: string | null;
          bio: string | null;
          commune_code: string | null;
          created_at: string;
          display_name: string;
          id: string;
          instagram: string | null;
          role: Database["public"]["Enums"]["user_role"];
          suspended_until: string | null;
          terms_accepted_at: string | null;
          updated_at: string;
          verification_status: Database["public"]["Enums"]["verification_status"];
          verified_at: string | null;
          website_url: string | null;
        };
        ComputedFields: never;
        Insert: {
          account_status?: Database["public"]["Enums"]["account_status"];
          account_type?: Database["public"]["Enums"]["account_type"];
          adult_confirmed_at?: string | null;
          avatar_path?: string | null;
          bio?: string | null;
          commune_code?: string | null;
          created_at?: string;
          display_name: string;
          id: string;
          instagram?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          suspended_until?: string | null;
          terms_accepted_at?: string | null;
          updated_at?: string;
          verification_status?: Database["public"]["Enums"]["verification_status"];
          verified_at?: string | null;
          website_url?: string | null;
        };
        Update: {
          account_status?: Database["public"]["Enums"]["account_status"];
          account_type?: Database["public"]["Enums"]["account_type"];
          adult_confirmed_at?: string | null;
          avatar_path?: string | null;
          bio?: string | null;
          commune_code?: string | null;
          created_at?: string;
          display_name?: string;
          id?: string;
          instagram?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          suspended_until?: string | null;
          terms_accepted_at?: string | null;
          updated_at?: string;
          verification_status?: Database["public"]["Enums"]["verification_status"];
          verified_at?: string | null;
          website_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_commune_code_fkey";
            columns: ["commune_code"];
            isOneToOne: false;
            referencedRelation: "communes";
            referencedColumns: ["code"];
          },
        ];
      };
      push_subscriptions: {
        Row: {
          auth: string;
          created_at: string;
          endpoint: string;
          id: string;
          p256dh: string;
          user_agent: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          auth: string;
          created_at?: string;
          endpoint: string;
          id?: string;
          p256dh: string;
          user_agent?: string | null;
          user_id?: string;
        };
        Update: {
          auth?: string;
          created_at?: string;
          endpoint?: string;
          id?: string;
          p256dh?: string;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      regions: {
        Row: {
          code: string;
          name: string;
          short_name: string;
          sort_order: number;
        };
        ComputedFields: never;
        Insert: {
          code: string;
          name: string;
          short_name: string;
          sort_order: number;
        };
        Update: {
          code?: string;
          name?: string;
          short_name?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          created_at: string;
          details: string | null;
          id: string;
          message_id: string | null;
          message_snapshot: string | null;
          pet_id: string | null;
          reason: Database["public"]["Enums"]["report_reason"];
          reported_user_id: string | null;
          reporter_id: string | null;
          resolution_note: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          status: Database["public"]["Enums"]["report_status"];
          target_type: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          details?: string | null;
          id?: string;
          message_id?: string | null;
          message_snapshot?: string | null;
          pet_id?: string | null;
          reason: Database["public"]["Enums"]["report_reason"];
          reported_user_id?: string | null;
          reporter_id?: string | null;
          resolution_note?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: Database["public"]["Enums"]["report_status"];
          target_type: string;
        };
        Update: {
          created_at?: string;
          details?: string | null;
          id?: string;
          message_id?: string | null;
          message_snapshot?: string | null;
          pet_id?: string | null;
          reason?: Database["public"]["Enums"]["report_reason"];
          reported_user_id?: string | null;
          reporter_id?: string | null;
          resolution_note?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: Database["public"]["Enums"]["report_status"];
          target_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reports_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_pet_id_fkey";
            columns: ["pet_id"];
            isOneToOne: false;
            referencedRelation: "pets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_reported_user_id_fkey";
            columns: ["reported_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_reporter_id_fkey";
            columns: ["reporter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_resolved_by_fkey";
            columns: ["resolved_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      verification_requests: {
        Row: {
          created_at: string;
          description: string;
          document_path: string | null;
          id: string;
          organization_name: string | null;
          requested_type: Database["public"]["Enums"]["account_type"];
          review_note: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          social_links: string | null;
          status: Database["public"]["Enums"]["verification_status"];
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          description: string;
          document_path?: string | null;
          id?: string;
          organization_name?: string | null;
          requested_type: Database["public"]["Enums"]["account_type"];
          review_note?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          social_links?: string | null;
          status?: Database["public"]["Enums"]["verification_status"];
          user_id?: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          document_path?: string | null;
          id?: string;
          organization_name?: string | null;
          requested_type?: Database["public"]["Enums"]["account_type"];
          review_note?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          social_links?: string | null;
          status?: Database["public"]["Enums"]["verification_status"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "verification_requests_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "verification_requests_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      admin_overview: { Args: Record<PropertyKey, never>; Returns: Json };
      assert_can_act: { Args: Record<PropertyKey, never>; Returns: string };
      assert_moderator: { Args: Record<PropertyKey, never>; Returns: string };
      clean_text: { Args: { p_text: string }; Returns: string };
      comment_followup: { Args: { p_comment: string; p_followup_id: string }; Returns: undefined };
      complete_adoption: { Args: { p_application_id: string }; Returns: undefined };
      detect_risky_text: { Args: { p_text: string }; Returns: boolean };
      get_conversation_contact: {
        Args: { p_conversation_id: string };
        Returns: {
          display_name: string;
          email: string;
          phone: string;
        }[];
      };
      get_profile_stats: { Args: { p_user_id: string }; Returns: Json };
      get_public_stats: { Args: Record<PropertyKey, never>; Returns: Json };
      is_active_user: { Args: { p_user_id: string }; Returns: boolean };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_blocked_between: { Args: { p_a: string; p_b: string }; Returns: boolean };
      is_conversation_participant: { Args: { p_conversation_id: string }; Returns: boolean };
      is_moderator: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_onboarded: { Args: { p_user_id: string }; Returns: boolean };
      log_action: {
        Args: { p_action: string; p_details?: Json; p_target_id: string; p_target_type: string };
        Returns: undefined;
      };
      mark_conversation_read: { Args: { p_conversation_id: string }; Returns: undefined };
      moderate_pet: { Args: { p_hide: boolean; p_pet_id: string; p_reason?: string }; Returns: undefined };
      my_unread_counts: { Args: Record<PropertyKey, never>; Returns: Json };
      normalize_text: { Args: { p_text: string }; Returns: string };
      notify: {
        Args: { p_body?: string; p_link?: string; p_title: string; p_type: string; p_user_id: string };
        Returns: undefined;
      };
      notify_due_followups: { Args: Record<PropertyKey, never>; Returns: number };
      notify_moderators: {
        Args: { p_body: string; p_link: string; p_title: string; p_type: string };
        Returns: undefined;
      };
      resolve_report: {
        Args: {
          p_note?: string;
          p_report_id: string;
          p_status: Database["public"]["Enums"]["report_status"];
        };
        Returns: undefined;
      };
      review_application: {
        Args: {
          p_application_id: string;
          p_message?: string;
          p_status: Database["public"]["Enums"]["application_status"];
        };
        Returns: undefined;
      };
      review_verification: {
        Args: { p_approve: boolean; p_note?: string; p_request_id: string };
        Returns: undefined;
      };
      save_push_subscription: {
        Args: { p_auth: string; p_endpoint: string; p_p256dh: string; p_user_agent?: string };
        Returns: undefined;
      };
      set_account_status: {
        Args: {
          p_days?: number;
          p_reason: string;
          p_status: Database["public"]["Enums"]["account_status"];
          p_user_id: string;
        };
        Returns: undefined;
      };
      set_user_role: {
        Args: { p_role: Database["public"]["Enums"]["user_role"]; p_user_id: string };
        Returns: undefined;
      };
      share_contact: { Args: { p_conversation_id: string }; Returns: undefined };
      start_conversation: { Args: { p_pet_id: string }; Returns: string };
      submit_followup: {
        Args: { p_followup_id: string; p_notes: string; p_photo_path?: string; p_wellbeing: number };
        Returns: undefined;
      };
      withdraw_application: { Args: { p_application_id: string }; Returns: undefined };
    };
    Enums: {
      account_status: "active" | "suspended" | "banned";
      account_type: "person" | "rescuer" | "shelter";
      application_status:
        "pending" | "reviewing" | "approved" | "rejected" | "withdrawn" | "cancelled" | "completed";
      energy_level: "low" | "medium" | "high";
      housing_tenure: "owned" | "rented" | "family" | "other";
      housing_type: "house" | "apartment" | "rural" | "other";
      listing_kind: "adoption" | "lost" | "found";
      message_kind: "user" | "system";
      pet_sex: "male" | "female" | "unknown";
      pet_size: "small" | "medium" | "large" | "giant";
      pet_status: "available" | "in_process" | "adopted" | "reunited" | "paused" | "archived";
      report_reason:
        | "animal_sale"
        | "animal_abuse"
        | "scam"
        | "false_info"
        | "inappropriate"
        | "harassment"
        | "spam"
        | "impersonation"
        | "other";
      report_status: "open" | "reviewing" | "resolved" | "dismissed";
      species: "dog" | "cat" | "rabbit" | "rodent" | "bird" | "horse" | "other";
      user_role: "user" | "moderator" | "admin";
      verification_status: "unverified" | "pending" | "verified" | "rejected";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]) | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      account_status: ["active", "suspended", "banned"],
      account_type: ["person", "rescuer", "shelter"],
      application_status: [
        "pending",
        "reviewing",
        "approved",
        "rejected",
        "withdrawn",
        "cancelled",
        "completed",
      ],
      energy_level: ["low", "medium", "high"],
      housing_tenure: ["owned", "rented", "family", "other"],
      housing_type: ["house", "apartment", "rural", "other"],
      listing_kind: ["adoption", "lost", "found"],
      message_kind: ["user", "system"],
      pet_sex: ["male", "female", "unknown"],
      pet_size: ["small", "medium", "large", "giant"],
      pet_status: ["available", "in_process", "adopted", "reunited", "paused", "archived"],
      report_reason: [
        "animal_sale",
        "animal_abuse",
        "scam",
        "false_info",
        "inappropriate",
        "harassment",
        "spam",
        "impersonation",
        "other",
      ],
      report_status: ["open", "reviewing", "resolved", "dismissed"],
      species: ["dog", "cat", "rabbit", "rodent", "bird", "horse", "other"],
      user_role: ["user", "moderator", "admin"],
      verification_status: ["unverified", "pending", "verified", "rejected"],
    },
  },
} as const;
