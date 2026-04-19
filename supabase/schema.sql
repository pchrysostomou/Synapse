-- ============================================================
-- SYNAPSE — Full Database Setup (W1 + W2)
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- Safe to re-run (uses IF NOT EXISTS + OR REPLACE)
-- ============================================================

-- ── 1. PROFILES ─────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz default now() not null
);

-- ── 2. DOCUMENTS ────────────────────────────────────────────
create table if not exists public.documents (
  id uuid default gen_random_uuid() primary key,
  title text not null default 'Untitled',
  content jsonb,
  owner_id uuid references public.profiles(id) on delete cascade not null,
  is_public boolean default false not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ── 3. DOCUMENT SHARES ──────────────────────────────────────
create table if not exists public.document_shares (
  id uuid default gen_random_uuid() primary key,
  document_id uuid references public.documents(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  permission text check (permission in ('view', 'edit')) default 'view' not null,
  created_at timestamptz default now() not null,
  unique(document_id, user_id)
);

-- ── 4. ROW LEVEL SECURITY ───────────────────────────────────

-- profiles
alter table public.profiles enable row level security;

-- Drop old policy if exists (safe re-run)
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Authenticated users can view all profiles" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

-- W2: All authenticated users can see profiles (needed for sharing/search)
create policy "Authenticated users can view all profiles"
  on public.profiles for select
  using (auth.role() = 'authenticated');

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- documents
alter table public.documents enable row level security;

drop policy if exists "Owner has full access to documents" on public.documents;
drop policy if exists "Public documents are viewable by anyone" on public.documents;
drop policy if exists "Shared users can view documents" on public.documents;
drop policy if exists "Shared editors can update documents" on public.documents;

create policy "Owner has full access to documents"
  on public.documents for all
  using (auth.uid() = owner_id);

create policy "Public documents are viewable by anyone"
  on public.documents for select
  using (is_public = true);

create policy "Shared users can view documents"
  on public.documents for select
  using (
    exists (
      select 1 from public.document_shares
      where document_id = public.documents.id
        and user_id = auth.uid()
    )
  );

create policy "Shared editors can update documents"
  on public.documents for update
  using (
    exists (
      select 1 from public.document_shares
      where document_id = public.documents.id
        and user_id = auth.uid()
        and permission = 'edit'
    )
  );

-- document_shares
alter table public.document_shares enable row level security;

drop policy if exists "Document owners can manage shares" on public.document_shares;
drop policy if exists "Users can see shares they are part of" on public.document_shares;

-- SECURITY DEFINER function breaks the circular RLS reference:
-- documents policy queries document_shares, which would query documents → recursion
-- This function runs as superuser, bypassing RLS on documents table
create or replace function public.is_document_owner(doc_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.documents
    where id = doc_id and owner_id = auth.uid()
  );
$$;

create policy "Document owners can manage shares"
  on public.document_shares for all
  using (public.is_document_owner(document_id));

create policy "Users can see shares they are part of"
  on public.document_shares for select
  using (user_id = auth.uid());

-- Reload PostgREST schema cache
notify pgrst, 'reload schema';


-- ── 6. AUTO-CREATE PROFILE ON SIGNUP ───────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── 7. UPDATED_AT AUTO-UPDATE ───────────────────────────────
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_documents_updated_at on public.documents;
create trigger set_documents_updated_at
  before update on public.documents
  for each row execute procedure public.handle_updated_at();

-- ── 8. INDEXES (performance) ────────────────────────────────
create index if not exists documents_owner_id_idx on public.documents(owner_id);
create index if not exists documents_updated_at_idx on public.documents(updated_at desc);
create index if not exists document_shares_document_id_idx on public.document_shares(document_id);
create index if not exists document_shares_user_id_idx on public.document_shares(user_id);

-- ── 9. BACKFILL EXISTING AUTH USERS → PROFILES ──────────────
-- Inserts profiles for users who signed up before the trigger was created
insert into public.profiles (id, email, full_name, avatar_url)
select
  au.id,
  au.email,
  au.raw_user_meta_data ->> 'full_name',
  au.raw_user_meta_data ->> 'avatar_url'
from auth.users au
where not exists (
  select 1 from public.profiles p where p.id = au.id
);
