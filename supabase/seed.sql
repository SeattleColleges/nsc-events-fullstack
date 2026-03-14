
-- 1. Insert into auth.users (Supabase Auth table)
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
)
VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin@gmail.com',
    crypt('Admin123!', gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"],"role":"admin"}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
);

-- 2. Insert matching row in public.users
-- Uses the same id as the auth user above
INSERT INTO public.users (
    id,
    first_name,
    last_name,
    pronouns,
    role,          
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
WHERE email = 'admin@gmail.com'
ON CONFLICT (id) DO UPDATE
SET 
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    pronouns = EXCLUDED.pronouns,
    role = EXCLUDED.role,
    updated_at = now();