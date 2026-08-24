-- Run this after creating the Supabase Auth user.
-- Replace YOUR_ADMIN_EMAIL with the email used in Supabase Authentication.

insert into public.wedding_admins (user_id)
select id from auth.users where email = 'YOUR_ADMIN_EMAIL'
on conflict (user_id) do nothing;
