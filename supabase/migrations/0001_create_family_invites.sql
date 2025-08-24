-- Create invite tokens table for families
create table if not exists family_invites (
  token text primary key,
  family_id uuid not null references families(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Helpful index
create index if not exists idx_family_invites_family_id on family_invites(family_id);

-- Optional RLS setup (uncomment if you use RLS)
-- alter table family_invites enable row level security;
-- create policy "allow read by authenticated users" on family_invites
--   for select to authenticated using (true);
-- create policy "allow insert by authenticated users" on family_invites
--   for insert to authenticated with check (true);

