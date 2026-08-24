-- Run once in the Supabase SQL Editor.
-- A NULL or blank bank name hides that account row from the invitation.

alter table public.wedding_accounts
  alter column bank_name drop not null;
