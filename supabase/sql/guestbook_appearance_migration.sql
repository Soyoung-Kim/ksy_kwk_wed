-- Phase 1: run once in the Supabase SQL Editor before deploying the updated Edge Functions.
-- This safely adds theme/icon data while keeping the legacy `side` column available
-- until the website and functions have been updated.

alter table public.guestbook_entries
  add column if not exists theme text,
  add column if not exists icon text;

update public.guestbook_entries
set theme = case when side = 'groom' then 'blue' else 'pink' end
where theme is null;

update public.guestbook_entries
set icon = case when side = 'groom' then 'sparkle' else 'heart' end
where icon is null;

alter table public.guestbook_entries
  alter column theme set default 'pink',
  alter column icon set default 'heart',
  alter column theme set not null,
  alter column icon set not null;

alter table public.guestbook_entries drop constraint if exists guestbook_entries_theme_check;
alter table public.guestbook_entries
  add constraint guestbook_entries_theme_check
  check (theme in ('pink', 'blue', 'purple', 'green', 'yellow'));

alter table public.guestbook_entries drop constraint if exists guestbook_entries_icon_check;
alter table public.guestbook_entries
  add constraint guestbook_entries_icon_check
  check (icon in ('heart', 'flower', 'ribbon', 'sparkle', 'smile', 'leaf'));

drop policy if exists "guestbook public read" on public.guestbook_entries;
create policy "guestbook public read" on public.guestbook_entries
for select to anon, authenticated using (del_yn = false);

revoke all on public.guestbook_entries from anon, authenticated;
grant select (id, side, theme, icon, display_name, message, created_at, updated_at)
  on public.guestbook_entries to anon, authenticated;
