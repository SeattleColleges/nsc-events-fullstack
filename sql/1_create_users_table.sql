-- Migration: create_users_table
-- Creates users table for NSC Events

CREATE TYPE public.user_role_type AS ENUM ('user', 'creator', 'admin');

CREATE TABLE IF NOT EXISTS public.users (
    id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name varchar(100) NOT NULL, 
    last_name varchar(100) NOT NULL, 
    pronouns varchar(100), 
    user_role user_role_type NOT NULL DEFAULT 'user',
    email varchar(255) NOT NULL UNIQUE, 
    google_credentials jsonb,
    reset_password_token varchar UNIQUE,
    reset_password_expires timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by authenticated users" ON public.users
    FOR SELECT USING(TRUE);

CREATE POLICY "Users can insert their own profile." ON profiles
    FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Admins manage all users"
    ON public.users 
    FOR ALL 
    USING ((SELECT user_role FROM public.users WHERE id = auth.uid()) = 'admin');

-- users can only read/update their own row
CREATE POLICY "Users can view own profile"
    ON public.users
    FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.users
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
    
CREATE OR REPLACE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_updated_at_column();