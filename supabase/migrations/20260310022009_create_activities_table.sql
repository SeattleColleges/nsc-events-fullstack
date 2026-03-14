CREATE TABLE IF NOT EXISTS public.activities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
    event_title varchar NOT NULL,
    event_description text NOT NULL,
    start_date timestamptz NOT NULL,
    end_date timestamptz NOT NULL,
    event_location varchar NOT NULL,
    event_host varchar NOT NULL,
    event_meeting_url varchar,
    event_registration varchar,
    event_capacity varchar NOT NULL,
    event_schedule varchar,
    event_speakers text,
    event_prerequisites varchar,
    event_cancellation_policy varchar,
    event_contact varchar NOT NULL,
    event_social_media jsonb,
    event_privacy varchar,
    event_accessibility varchar,
    event_note varchar,
    is_hidden boolean DEFAULT false,
    is_archived boolean DEFAULT false,
    cover_photo_id uuid REFERENCES public.media(id) ON DELETE SET NULL,
    document_id uuid REFERENCES public.media(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Creator can view/update/delete their own events
CREATE POLICY "Creators can manage own events"
    ON public.activities
    FOR ALL
    USING (auth.uid() = created_by_user_id)
    WITH CHECK (auth.uid() = created_by_user_id);

-- public have read access to activities
CREATE POLICY "Public can view activity"
    ON public.activities
    FOR SELECT
    USING (true);

-- Update updated at    
CREATE OR REPLACE TRIGGER update_activities_updated_at
    BEFORE UPDATE ON public.activities
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_updated_at_column();