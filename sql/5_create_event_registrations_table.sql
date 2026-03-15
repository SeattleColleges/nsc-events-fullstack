CREATE TABLE IF NOT EXISTS public.event_registrations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE SET NULL,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
    college varchar NOT NULL,
    year_of_study varchar NOT NULL,
    is_attended boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own registrations"
    ON public.event_registrations
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can register themselves"
    ON public.event_registrations
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own registrations"
    ON public.event_registrations
    FOR DELETE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can change own registrations"
    ON public.event_registrations
    FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Creators view registrations for their events"
    ON public.event_registrations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.activities activity 
            WHERE activity.id = activity_id 
            AND activity.created_by_user_id = auth.uid())
    );
-- Update updated at    
CREATE OR REPLACE TRIGGER update_event_registrations_updated_at
    BEFORE UPDATE ON public.event_registrations
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_updated_at_column();