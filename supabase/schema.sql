-- Nts: Sign in with Google + sync between phone and computer.
-- Same Supabase project as Gym / Fluent365; Nts only uses its own table and bucket.
-- Run once: Supabase Dashboard → SQL Editor → New query → paste → Run. Safe to run again.

-- One row per saved item. `data` is the item as JSON; when the app lock is on, `enc` holds the
-- encrypted item instead (base64) and `data` is null, so the server never sees the text.
create table if not exists public.nts_items (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id         text not null,
  data       jsonb,
  enc        text,
  updated_at bigint not null default 0,        -- the app's own clock: newest edit wins
  synced_at  timestamptz not null default now(), -- the server's clock: "what changed since" (clock_timestamp: unique per row, so paging works)
  primary key (user_id, id)
);
create index if not exists nts_items_synced on public.nts_items (user_id, synced_at);

create or replace function public.nts_touch() returns trigger
  language plpgsql set search_path = '' as $$ begin new.synced_at = clock_timestamp(); return new; end $$;
drop trigger if exists nts_touch on public.nts_items;
create trigger nts_touch before insert or update on public.nts_items for each row execute function public.nts_touch();

alter table public.nts_items enable row level security;
drop policy if exists "nts own: select" on public.nts_items;
drop policy if exists "nts own: insert" on public.nts_items;
drop policy if exists "nts own: update" on public.nts_items;
drop policy if exists "nts own: delete" on public.nts_items;
create policy "nts own: select" on public.nts_items for select to authenticated using (user_id = auth.uid());
create policy "nts own: insert" on public.nts_items for insert to authenticated with check (user_id = auth.uid());
create policy "nts own: update" on public.nts_items for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "nts own: delete" on public.nts_items for delete to authenticated using (user_id = auth.uid());
revoke all on public.nts_items from anon;
grant select, insert, update, delete on public.nts_items to authenticated;

-- Files (images, PDFs…): private bucket, each user only sees the folder named after their id.
insert into storage.buckets (id, name, public, file_size_limit)
  values ('nts-files', 'nts-files', false, 52428800)
  on conflict (id) do nothing;
drop policy if exists "nts files: select" on storage.objects;
drop policy if exists "nts files: insert" on storage.objects;
drop policy if exists "nts files: update" on storage.objects;
drop policy if exists "nts files: delete" on storage.objects;
create policy "nts files: select" on storage.objects for select to authenticated
  using (bucket_id = 'nts-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "nts files: insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'nts-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "nts files: update" on storage.objects for update to authenticated
  using (bucket_id = 'nts-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "nts files: delete" on storage.objects for delete to authenticated
  using (bucket_id = 'nts-files' and (storage.foldername(name))[1] = auth.uid()::text);
