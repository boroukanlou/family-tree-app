# Family Tree App

Collaborative web application to build and navigate family trees with AI assistance.

- Next.js App Router + TypeScript + Tailwind + Shadcn UI
- Supabase (Auth, Postgres, Storage, RLS)
- AI: Ollama (local LLM) + RAG via Supabase Vector
- Deploy: Docker + Coolify (GitHub Actions CI/CD)

---

## Current State (as of today)

Implemented
- Auth: login/signup (email/password + OAuth), client provider, logout
- Dashboard: list families with stats; create/join/export/delete modals; avatar in header
- Profile: /user-profile page to view/update profile (first/last/DOB/email) + optional avatar upload; delete account (profile + memberships) + server action for auth user deletion
- Families
  - Tree view: /families/[id] renders members grouped by generation (parent_id). Click to select.
  - Bottom toolbar (mobile/desktop): Add member (always) / Edit / Info / Chat.
  - Add Member modal: first/last/DOB/biography/photo (Storage bucket member-photos). Optional direct parent. If parent is chosen, relation must be chosen; stores both parent_id (for child) and a row in relationships.
  - Edit Member modal: update fields; re-upload or remove photo.
  - Info modal: shows fields and member picture.
  - Chat overlay: calls /api/chatbot with RAG.
- RAG
  - Table family_embeddings + RPC match_family_embeddings(query_embedding,…)
  - /api/chatbot: embeds question via Ollama, retrieves top-k matches, augments prompt, and generates answer with Ollama.
  - scripts/index-embeddings.mjs: CLI to build embeddings from members.
- Storage buckets
  - avatars (profile pics) and member-photos (member pics) with RLS; uploads path uses `${auth.uid()}/…` to satisfy policies.

Known gaps / WIP
- Tree rendering uses simple level grid (no connectors/edges/zoom). Can be upgraded to react-d3-tree or custom SVG connectors.
- RLS for families/members may need tightening to restrict by membership (current examples are permissive in places).
- Relationships beyond parent/child are stored but not visualized.
- No automated tests yet (we add a basic Playwright + Jest setup below).

---

## Optimizations and Next Steps

- Tree UX
  - Add connectors/edges, pan/zoom, and collapse/expand.
  - Virtualize large trees.
- Data integrity
  - Enforce inverse relationships and constraints (e.g., parent/child consistency) via triggers.
  - Add RLS policies tied to family_memberships for all tables (families, members, relationships, embeddings).
- API
  - Batch index embeddings endpoint; background job on member changes.
  - Signed Storage URLs for private buckets.
- Performance
  - SSR caching of families/stats; SWR for client updates.
  - Use storage signed URLs with caching headers.
- DX
  - Add Storybook for components.
  - Stronger Zod validation for forms.

---

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase project
- (Optional) Ollama running locally or reachable at OLLAMA_BASE_URL

### Install & Run
```bash
npm install
cp .env.example .env.local
# edit .env.local with your values
npm run dev
```

Environment (.env.local):
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key # server only
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_GENERATE_MODEL=llama3.1:8b
OLLAMA_EMBED_MODEL=nomic-embed-text
```

---

## Database & Storage

Run SQL migrations in Supabase SQL editor:
- supabase/migrations/20250824_profiles_and_storage.sql
- supabase/migrations/20250824_rag_embeddings.sql

Ensure storage buckets exist: avatars (public) and member-photos (public with RLS allowing users to write to `${auth.uid()}/*`).

---

## RAG Indexing (CLI)

Build embeddings for a family:
```bash
# put env into .env.local or export them beforehand
node scripts/index-embeddings.mjs --family <FAMILY_ID> --rebuild
```

---

## Testing

We include a minimal Jest + Playwright setup to validate critical flows:
- Unit: basic utilities
- E2E: login page renders, dashboard requires auth

Run tests locally:
```bash
npm test
npm run test:e2e
```

Run tests in Docker (see docker-compose.yml):
```bash
docker compose -f docker-compose.yml run --rm test
docker compose -f docker-compose.yml run --rm e2e
```

---

## CI/CD (GitHub Actions + Docker + Coolify)

We use a containerized build and deploy pipeline suitable for Coolify:
- Dockerfile builds a production image (Next.js standalone output).
- docker-compose.yml provides services:
  - web: app container
  - test: unit tests
  - e2e: Playwright tests (headed off by xvfb)
- .github/workflows/cicd.yml:
  - on push to main: run unit tests; build & push image to GitHub Container Registry (GHCR) or Docker Hub; notify Coolify to deploy (webhook) or rely on Coolify’s auto-deploy on image update.

Coolify setup:
- Create an “Application > Docker Image” project pointing to your image (ghcr.io/owner/repo:latest or docker.io/owner/repo:latest).
- Configure environment variables in Coolify UI.
- Set the GitHub Action to push the image tag Coolify watches (e.g., latest or sha-tag).

---

## Docker

### Dockerfile
```Dockerfile
# syntax=docker/dockerfile:1.7
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Next.js standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

### docker-compose.yml
```yaml
version: "3.9"
services:
  web:
    build: .
    image: ghcr.io/OWNER/REPO:latest # or docker.io/OWNER/REPO:latest
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL}
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}
      SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY}
      OLLAMA_BASE_URL: ${OLLAMA_BASE_URL}
      OLLAMA_GENERATE_MODEL: ${OLLAMA_GENERATE_MODEL}
      OLLAMA_EMBED_MODEL: ${OLLAMA_EMBED_MODEL}

  test:
    build: .
    command: ["npm", "test"]
    environment:
      NODE_ENV: test

  e2e:
    build: .
    command: ["npm", "run", "test:e2e"]
    environment:
      NODE_ENV: test
```

### GitHub Actions (CI/CD)
```yaml
name: CI/CD
on:
  push:
    branches: [ main ]

jobs:
  test-build-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm test
      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - name: Build and push
        uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: ghcr.io/${{ github.repository }}:latest
      # Optional: call Coolify webhook to force deploy
      #- name: Trigger Coolify Deploy
      #  run: |
      #    curl -X POST "${{ secrets.COOLIFY_WEBHOOK_URL }}"
```

---

## Scripts

- `npm run dev` – start dev server
- `npm run build` – build Next.js app
- `npm start` – start production server (standalone)
- `npm test` – Jest unit tests (add as needed)
- `npm run test:e2e` – Playwright E2E (add as needed)

---

## License
MIT
