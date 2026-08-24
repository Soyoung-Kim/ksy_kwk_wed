-- Run this after creating the Supabase Auth user:
-- email: soyoung@wedding-admin.local
-- password: choose the password supplied for the admin login.

insert into public.wedding_admins (user_id)
select id from auth.users where email = 'soyoung@wedding-admin.local'
on conflict (user_id) do nothing;
