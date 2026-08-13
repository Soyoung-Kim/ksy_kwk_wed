-- Phase 2: run this only after the updated Edge Functions are deployed
-- and the updated website is published.
-- It removes the now-unused groom/bride-side classification completely.

revoke all on public.guestbook_entries from anon, authenticated;

grant select (id, theme, icon, display_name, message, created_at, updated_at)
  on public.guestbook_entries to anon, authenticated;

alter table public.guestbook_entries drop column if exists side;
