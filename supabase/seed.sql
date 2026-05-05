-- =============================================
-- SEED DATA FOR LOCAL DEVELOPMENT ONLY
-- Creates a real auth user + matching public.users row
-- =============================================

-- 1. Create the admin user in Supabase Auth (auth.users)
-- Password = admin123  (CHANGE THIS AFTER FIRST LOGIN!)
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at
)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin@gmail.com',
    crypt('Admin123!', gen_salt('bf')),
    now(),
    now(),
    now()
);

INSERT INTO public.users (
    id,
    first_name,
    last_name,
    pronouns,
    user_role,
    email,
    created_at,
    updated_at
)
SELECT 
    id,
    'Admin',
    'User',
    'They/Them',
    'admin',
    'admin@gmail.com',
    now(),
    now()
FROM auth.users
WHERE email = 'admin@gmail.com';