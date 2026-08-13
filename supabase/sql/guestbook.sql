-- =========================================================
-- Guestbook final schema
-- - bcrypt password hash 저장용 password_hash
-- - 소프트 삭제용 del_yn
-- - updated_at 자동 갱신
-- - 공개 조회는 del_yn = false 만 허용
-- =========================================================

create extension if not exists pgcrypto;

-- 기존 데이터/구조를 모두 버리고 새로 시작할 경우
drop table if exists public.guestbook_entries cascade;

create table public.guestbook_entries (
  id uuid primary key default gen_random_uuid(),

  -- Visual identity selected by each guest. No groom/bride-side classification.
  theme text not null default 'pink'
    check (theme in ('pink', 'blue', 'purple', 'green', 'yellow')),

  icon text not null default 'heart'
    check (icon in ('heart', 'flower', 'ribbon', 'sparkle', 'smile', 'leaf')),

  display_name text not null
    check (char_length(btrim(display_name)) between 1 and 20),

  message text not null
    check (char_length(btrim(message)) between 1 and 300),

  -- bcrypt 해시 문자열 저장
  password_hash text not null,

  -- 소프트 삭제 여부
  del_yn boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 조회 성능용 인덱스
create index guestbook_entries_visible_created_at_idx
  on public.guestbook_entries (del_yn, created_at desc);

-- updated_at 자동 갱신 트리거 함수
create or replace function public.set_guestbook_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;

$$;

create trigger trg_guestbook_entries_updated_at
before update on public.guestbook_entries
for each row
execute function public.set_guestbook_updated_at();

-- RLS 활성화
alter table public.guestbook_entries enable row level security;

-- 기존 정책 제거
drop policy if exists "guestbook public read" on public.guestbook_entries;

-- 공개 조회는 삭제되지 않은 글만 허용
create policy "guestbook public read"
on public.guestbook_entries
for select
to anon, authenticated
using (del_yn = false);

-- anon / authenticated 는 읽기만 가능
grant usage on schema public to anon, authenticated;

revoke all on public.guestbook_entries from anon, authenticated;

grant select (
  id,
  theme,
  icon,
  display_name,
  message,
  created_at,
  updated_at
)
on public.guestbook_entries
to anon, authenticated;
