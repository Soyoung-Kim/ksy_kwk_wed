-- Run once in the Supabase SQL Editor after guestbook.sql.
-- Contact and account values are publicly visible on the invitation page.

create table if not exists public.wedding_contacts (
  id bigint generated always as identity primary key,
  side text not null default 'groom' check (side in ('groom', 'bride')),
  role_label text not null check (char_length(btrim(role_label)) between 1 and 30),
  name text not null check (char_length(btrim(name)) between 1 and 50),
  phone text not null check (char_length(btrim(phone)) between 8 and 30),
  display_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Existing installations created before contact grouping need this migration too.
alter table public.wedding_contacts add column if not exists side text;
update public.wedding_contacts
set side = case when role_label like '%신부%' then 'bride' else 'groom' end
where side is null;
alter table public.wedding_contacts alter column side set default 'groom';
alter table public.wedding_contacts alter column side set not null;
alter table public.wedding_contacts drop constraint if exists wedding_contacts_side_check;
alter table public.wedding_contacts
  add constraint wedding_contacts_side_check check (side in ('groom', 'bride'));

create table if not exists public.wedding_accounts (
  id bigint generated always as identity primary key,
  side text not null check (side in ('groom', 'bride')),
  side_label text not null check (char_length(btrim(side_label)) between 1 and 30),
  bank_name text not null check (char_length(btrim(bank_name)) between 1 and 50),
  account_holder text not null check (char_length(btrim(account_holder)) between 1 and 50),
  account_number text not null check (char_length(btrim(account_number)) between 4 and 50),
  display_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists wedding_contacts_visible_order_idx on public.wedding_contacts (is_visible, display_order);
create index if not exists wedding_accounts_visible_order_idx on public.wedding_accounts (is_visible, display_order);

create or replace function public.set_wedding_directory_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_wedding_contacts_updated_at on public.wedding_contacts;
create trigger trg_wedding_contacts_updated_at before update on public.wedding_contacts
for each row execute function public.set_wedding_directory_updated_at();
drop trigger if exists trg_wedding_accounts_updated_at on public.wedding_accounts;
create trigger trg_wedding_accounts_updated_at before update on public.wedding_accounts
for each row execute function public.set_wedding_directory_updated_at();

alter table public.wedding_contacts enable row level security;
alter table public.wedding_accounts enable row level security;
drop policy if exists "wedding contacts public read" on public.wedding_contacts;
create policy "wedding contacts public read" on public.wedding_contacts
for select to anon, authenticated using (is_visible = true);
drop policy if exists "wedding accounts public read" on public.wedding_accounts;
create policy "wedding accounts public read" on public.wedding_accounts
for select to anon, authenticated using (is_visible = true);

grant usage on schema public to anon, authenticated;
revoke all on public.wedding_contacts, public.wedding_accounts from anon, authenticated;
grant select (id, side, role_label, name, phone, display_order, is_visible)
  on public.wedding_contacts to anon, authenticated;
grant select (id, side, side_label, bank_name, account_holder, account_number, display_order, is_visible)
  on public.wedding_accounts to anon, authenticated;

-- Replace sample values with real information. Add parent accounts as additional rows.
insert into public.wedding_contacts (side, role_label, name, phone, display_order)
select 'groom', '신랑', '김우경', '010-3202-8328', 10
where not exists (select 1 from public.wedding_contacts);
insert into public.wedding_contacts (side, role_label, name, phone, display_order)
select 'bride', '신부', '김소영', '010-4112-6269', 20
where not exists (select 1 from public.wedding_contacts where display_order = 20);
insert into public.wedding_accounts (side, side_label, bank_name, account_holder, account_number, display_order)
select 'groom', '신랑측', '국민은행', '김우경', '123456-78-901234', 10
where not exists (select 1 from public.wedding_accounts);
insert into public.wedding_accounts (side, side_label, bank_name, account_holder, account_number, display_order)
select 'bride', '신부측', '우리은행', '김소영', '1002-283-110119', 20
where not exists (select 1 from public.wedding_accounts where display_order = 20);

-- Example parent account:
-- insert into public.wedding_accounts (side, side_label, bank_name, account_holder, account_number, display_order)
-- values ('groom', '신랑 혼주', '은행명', '예금주', '계좌번호', 30);
