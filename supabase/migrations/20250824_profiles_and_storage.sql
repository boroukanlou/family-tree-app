-- Profiles table and RLS + Storage policies for avatars bucket
-- Run this on your Supabase database

-- 1) Create profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  date_of_birth date,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Optional updated_at trigger (requires extensions schema with moddatetime)
create schema if not exists extensions;
create extension if not exists moddatetime with schema extensions;
create or replace trigger set_timestamp
before update on public.profiles
for each row execute function extensions.moddatetime (updated_at);

-- Enable RLS
alter table public.profiles enable row level security;

-- Policies (guard with DO blocks since CREATE POLICY doesn't support IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_select_own'
  ) THEN
    CREATE POLICY profiles_select_own
      ON public.profiles FOR SELECT
      USING (auth.uid() = id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_insert_own'
  ) THEN
    CREATE POLICY profiles_insert_own
      ON public.profiles FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_update_own'
  ) THEN
    CREATE POLICY profiles_update_own
      ON public.profiles FOR UPDATE TO authenticated
      USING (auth.uid() = id);
  END IF;
END
$$;

-- 2) Create avatars storage bucket (public read)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Also create member-photos bucket (public read)
insert into storage.buckets (id, name, public)
values ('member-photos', 'member-photos', true)
on conflict (id) do nothing;

-- Storage RLS policies for avatars bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'avatars_public_read'
  ) THEN
    CREATE POLICY avatars_public_read
      ON storage.objects FOR SELECT
      USING (bucket_id = 'avatars');
  END IF;
END
$$;

-- Storage RLS policies for member-photos bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'member_photos_public_read'
  ) THEN
    CREATE POLICY member_photos_public_read
      ON storage.objects FOR SELECT
      USING (bucket_id = 'member-photos');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'member_photos_insert_own_folder'
  ) THEN
    CREATE POLICY member_photos_insert_own_folder
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'member-photos'
        AND split_part(name, '/', 1) = auth.uid()::text
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'member_photos_update_own_folder'
  ) THEN
    CREATE POLICY member_photos_update_own_folder
      ON storage.objects FOR UPDATE TO authenticated
      USING (
        bucket_id = 'member-photos'
        AND split_part(name, '/', 1) = auth.uid()::text
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'member_photos_delete_own_folder'
  ) THEN
    CREATE POLICY member_photos_delete_own_folder
      ON storage.objects FOR DELETE TO authenticated
      USING (
        bucket_id = 'member-photos'
        AND split_part(name, '/', 1) = auth.uid()::text
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'avatars_insert_own_folder'
  ) THEN
    CREATE POLICY avatars_insert_own_folder
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'avatars'
        AND split_part(name, '/', 1) = auth.uid()::text
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'avatars_update_own_folder'
  ) THEN
    CREATE POLICY avatars_update_own_folder
      ON storage.objects FOR UPDATE TO authenticated
      USING (
        bucket_id = 'avatars'
        AND split_part(name, '/', 1) = auth.uid()::text
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'avatars_delete_own_folder'
  ) THEN
    CREATE POLICY avatars_delete_own_folder
      ON storage.objects FOR DELETE TO authenticated
      USING (
        bucket_id = 'avatars'
        AND split_part(name, '/', 1) = auth.uid()::text
      );
  END IF;
END
$$;

