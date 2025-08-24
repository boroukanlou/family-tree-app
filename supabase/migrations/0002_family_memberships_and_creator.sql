-- Add created_by to families to track the owner of the family
alter table if exists public.families
  add column if not exists created_by uuid references auth.users(id);

-- Table for invitation tokens (used in join links)
create table if not exists public.family_invites (
  token text primary key,
  family_id uuid not null references public.families(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists idx_family_invites_family_id on public.family_invites(family_id);

-- Table mapping users to families they created or joined
create table if not exists public.family_memberships (
  user_id uuid not null references auth.users(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (user_id, family_id)
);
create index if not exists idx_family_memberships_user on public.family_memberships(user_id);
create index if not exists idx_family_memberships_family on public.family_memberships(family_id);

