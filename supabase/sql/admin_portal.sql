-- Run this once in the Supabase SQL Editor.
-- It creates the administrator role, editable gallery data, and RLS policies.

-- Support existing invitation installations created before contact grouping.
alter table public.wedding_contacts add column if not exists side text;
alter table public.wedding_contacts add column if not exists contact_type text;
update public.wedding_contacts
set side = case when role_label like '%신부%' then 'bride' else 'groom' end
where side is null;
update public.wedding_contacts
set contact_type = case when role_label in ('신랑', '신부') then 'couple' else 'guardian' end
where contact_type is null;
alter table public.wedding_contacts alter column side set default 'groom';
alter table public.wedding_contacts alter column side set not null;
alter table public.wedding_contacts alter column contact_type set default 'guardian';
alter table public.wedding_contacts alter column contact_type set not null;
alter table public.wedding_contacts drop constraint if exists wedding_contacts_side_check;
alter table public.wedding_contacts
  add constraint wedding_contacts_side_check check (side in ('groom', 'bride'));
alter table public.wedding_contacts drop constraint if exists wedding_contacts_contact_type_check;
alter table public.wedding_contacts
  add constraint wedding_contacts_contact_type_check check (contact_type in ('couple', 'guardian'));

create table if not exists public.wedding_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.wedding_admins enable row level security;

drop policy if exists "wedding admins read own" on public.wedding_admins;
create policy "wedding admins read own"
on public.wedding_admins
for select to authenticated
using (auth.uid() = user_id);

create or replace function public.is_wedding_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.wedding_admins where user_id = auth.uid()
  );
$$;

revoke all on function public.is_wedding_admin() from public;
grant execute on function public.is_wedding_admin() to authenticated;

grant usage on schema public to authenticated;
grant select on public.wedding_admins to authenticated;
grant select (id, side, contact_type, role_label, name, phone, display_order, is_visible)
  on public.wedding_contacts to authenticated;
grant select (id, side, side_label, bank_name, account_holder, account_number, display_order, is_visible)
  on public.wedding_accounts to authenticated;

drop policy if exists "wedding contacts admin update" on public.wedding_contacts;
create policy "wedding contacts admin update"
on public.wedding_contacts
for update to authenticated
using (public.is_wedding_admin())
with check (public.is_wedding_admin());

drop policy if exists "wedding contacts admin read" on public.wedding_contacts;
create policy "wedding contacts admin read"
on public.wedding_contacts
for select to authenticated
using (public.is_wedding_admin());

drop policy if exists "wedding accounts admin update" on public.wedding_accounts;
create policy "wedding accounts admin update"
on public.wedding_accounts
for update to authenticated
using (public.is_wedding_admin())
with check (public.is_wedding_admin());

drop policy if exists "wedding accounts admin read" on public.wedding_accounts;
create policy "wedding accounts admin read"
on public.wedding_accounts
for select to authenticated
using (public.is_wedding_admin());

grant update (side, contact_type, role_label, name, phone, display_order, is_visible)
  on public.wedding_contacts to authenticated;
grant update (side, side_label, bank_name, account_holder, account_number, display_order, is_visible)
  on public.wedding_accounts to authenticated;

create table if not exists public.wedding_gallery (
  id bigint generated always as identity primary key,
  image_url text not null check (char_length(btrim(image_url)) between 1 and 1000),
  storage_path text unique,
  alt text not null default '웨딩 사진' check (char_length(btrim(alt)) between 1 and 100),
  display_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists wedding_gallery_visible_order_idx
  on public.wedding_gallery (is_visible, display_order);

drop trigger if exists trg_wedding_gallery_updated_at on public.wedding_gallery;
create trigger trg_wedding_gallery_updated_at before update on public.wedding_gallery
for each row execute function public.set_wedding_directory_updated_at();

alter table public.wedding_gallery enable row level security;

drop policy if exists "wedding gallery public read" on public.wedding_gallery;
create policy "wedding gallery public read"
on public.wedding_gallery
for select to anon, authenticated using (is_visible = true);

drop policy if exists "wedding gallery admin manage" on public.wedding_gallery;
create policy "wedding gallery admin manage"
on public.wedding_gallery
for all to authenticated
using (public.is_wedding_admin())
with check (public.is_wedding_admin());

grant select on public.wedding_gallery to anon, authenticated;
grant insert, update, delete on public.wedding_gallery to authenticated;
grant usage, select on sequence public.wedding_gallery_id_seq to authenticated;

insert into storage.buckets (id, name, public)
values ('wedding-gallery', 'wedding-gallery', true)
on conflict (id) do update set public = true;

drop policy if exists "wedding gallery files public read" on storage.objects;
create policy "wedding gallery files public read"
on storage.objects
for select to public
using (bucket_id = 'wedding-gallery');

drop policy if exists "wedding gallery files admin manage" on storage.objects;
create policy "wedding gallery files admin manage"
on storage.objects
for all to authenticated
using (bucket_id = 'wedding-gallery' and public.is_wedding_admin())
with check (bucket_id = 'wedding-gallery' and public.is_wedding_admin());

-- Seed the current GitHub-hosted photos once. After this, the admin page can
-- manage the same list and add uploaded Storage images.
insert into public.wedding_gallery (image_url, alt, display_order)
select source.image_url, source.alt, source.display_order
from (
  values
    ('./assets/photos/main_logo.png', '웨딩 사진', 10),
    ('./assets/photos/wed_ring.jpg', '웨딩 반지', 20),
    ('./assets/photos/b (1).jpg', '웨딩 사진 1', 30),
    ('./assets/photos/b (2).jpg', '웨딩 사진 2', 40),
    ('./assets/photos/b (3).jpg', '웨딩 사진 3', 50),
    ('./assets/photos/b (4).jpg', '웨딩 사진 4', 60),
    ('./assets/photos/b (5).jpg', '웨딩 사진 5', 70),
    ('./assets/photos/b (6).jpg', '웨딩 사진 6', 80),
    ('./assets/photos/b (7).jpg', '웨딩 사진 7', 90),
    ('./assets/photos/b (8).jpg', '웨딩 사진 8', 100),
    ('./assets/photos/c (1).jpg', '웨딩 사진 9', 110),
    ('./assets/photos/c (2).jpg', '웨딩 사진 10', 120),
    ('./assets/photos/c (3).jpg', '웨딩 사진 11', 130),
    ('./assets/photos/wed_day.png', '웨딩 day', 140)
) as source(image_url, alt, display_order)
where not exists (select 1 from public.wedding_gallery);
