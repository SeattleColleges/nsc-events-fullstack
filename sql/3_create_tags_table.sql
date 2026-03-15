CREATE TABLE IF NOT EXISTS public.tags (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name varchar NOT NULL UNIQUE,
    slug varchar NOT NULL UNIQUE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- everyone can see tags
CREATE POLICY "Public read access to tags"
    ON public.tags
    FOR SELECT
    USING (true);
    
CREATE OR REPLACE TRIGGER update_tags_updated_at
    BEFORE UPDATE ON public.tags
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_updated_at_column();