// models/athlete.model.ts
export interface Athlete {
    id?: number;
    name: string;
    handle: string;
    email: string;
    password?: string; // ✅ Add password (optional for responses)
    avatar: string;
    role: string;
    school_or_league: string;
    primary_sport: string;
    position: string;
    jersey_number: number;
    registered_state: string;
    registered_city: string;
    has_completed_location_onboarding: boolean;
    bio: string;
    email_verified: boolean;
    is_verified: boolean;
    is_pro: boolean;
    is_verified_pro: boolean;
    subscription_tier: string;
    level: number;
    is_scout?: boolean;
    is_verified_scout?: boolean;
    scout_pass_active?: boolean;
    scout_org_name?: string;
    created_at?: Date;
    updated_at?: Date;
}

export interface CreateAthleteDTO {
    name: string;
    handle: string;
    email: string;
    password: string; // ✅ REQUIRED for creation
    avatar?: string;
    role?: string;
    school_or_league?: string;
    primary_sport?: string;
    position?: string;
    jersey_number?: number;
    registered_state?: string;
    registered_city?: string;
    has_completed_location_onboarding?: boolean;
    bio?: string;
    email_verified?: boolean;
    is_verified?: boolean;
    is_pro?: boolean;
    is_verified_pro?: boolean;
    subscription_tier?: string;
    level?: number;
    is_scout?: boolean;
    is_verified_scout?: boolean;
    scout_pass_active?: boolean;
    scout_org_name?: string;
}

export interface UpdateAthleteDTO {
    name?: string;
    handle?: string;
    email?: string;
    password?: string; // ✅ Allow password updates
    avatar?: string;
    role?: string;
    school_or_league?: string;
    primary_sport?: string;
    position?: string;
    jersey_number?: number;
    registered_state?: string;
    registered_city?: string;
    has_completed_location_onboarding?: boolean;
    bio?: string;
    email_verified?: boolean;
    is_verified?: boolean;
    is_pro?: boolean;
    is_verified_pro?: boolean;
    subscription_tier?: string;
    level?: number;
    is_scout?: boolean;
    is_verified_scout?: boolean;
    scout_pass_active?: boolean;
    scout_org_name?: string;
}