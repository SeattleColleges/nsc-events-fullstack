CREATE TABLE IF NOT EXISTS public.activity_tags (
    activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
    tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    PRIMARY KEY (activity_id, tag_id)
);

ALTER TABLE public.activity_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view activity tags"
    ON public.activity_tags
    FOR SELECT
    USING (true);