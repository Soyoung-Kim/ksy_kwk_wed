-- Run once in the Supabase SQL Editor.
-- A NULL or blank bank name hides that account row from the invitation.

alter table public.wedding_accounts
  alter column bank_name drop not null;

alter table public.wedding_accounts
  drop constraint if exists wedding_accounts_bank_name_check;

alter table public.wedding_accounts
  add constraint wedding_accounts_bank_name_check
  check (char_length(btrim(coalesce(bank_name, ''))) between 0 and 50);
