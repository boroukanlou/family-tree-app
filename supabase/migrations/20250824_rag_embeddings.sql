-- Enable pgvector if needed
create extension if not exists vector;

-- Table to store family-related embeddings
create table if not exists public.family_embeddings (
  id bigserial primary key,
  family_id uuid references public.families(id) on delete cascade,
  content text not null,
  metadata jsonb,
  embedding vector(1536) not null,
  created_at timestamptz not null default now()
);

-- Optional index for faster similarity (cosine distance) queries
-- Adjust lists based on data size
create index if not exists family_embeddings_embedding_ivfflat
  on public.family_embeddings using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- RLS
alter table public.family_embeddings enable row level security;
-- Simple policy: allow authenticated users to read/write (adjust as needed)
create policy if not exists family_embeddings_select
  on public.family_embeddings for select to authenticated using (true);
create policy if not exists family_embeddings_insert
  on public.family_embeddings for insert to authenticated with check (true);

-- Matching function: returns top-k rows with similarity
create or replace function public.match_family_embeddings(
  query_embedding vector(1536),
  match_threshold float,   -- similarity threshold 0..1 (1 is very similar)
  match_count int,
  family uuid default null
)
returns table (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
language sql stable as $$
  select
    fe.id,
    fe.content,
    fe.metadata,
    1 - (fe.embedding <=> query_embedding) as similarity
  from public.family_embeddings fe
  where (family is null or fe.family_id = family)
  order by fe.embedding <=> query_embedding asc
  limit match_count;
$$;
