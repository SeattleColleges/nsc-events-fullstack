CREATE TABLE IF NOT EXISTS public.media (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    filename varchar NOT NULL,
    original_name varchar NOT NULL,
    mime_type varchar,
    size bigint NOT NULL,
    s3_key varchar,
    s3_url varchar,
    type varchar,
    uploaded_by_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;

-- Uploader can view/update/delete their own media
CREATE POLICY "Users can manage own media"
    ON public.media
    FOR ALL
    USING (auth.uid() = uploaded_by_user_id)
    WITH CHECK (auth.uid() = uploaded_by_user_id);

-- public can access to media
CREATE POLICY "Public can view media"
    ON public.media
    FOR SELECT
    USING (true);

-- Update updated at    
CREATE OR REPLACE TRIGGER update_media_updated_at
    BEFORE UPDATE ON public.media
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_updated_at_column();