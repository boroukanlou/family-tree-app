#!/usr/bin/env node
/*
Quick script to index family data into Supabase family_embeddings using Ollama embeddings.

Requirements:
- Node 18+
- Environment variables:
  - NEXT_PUBLIC_SUPABASE_URL
  - SUPABASE_SERVICE_ROLE_KEY (server key)
  - OLLAMA_BASE_URL (e.g., http://localhost:11434)
  - OLLAMA_EMBED_MODEL (default: nomic-embed-text)

Usage (PowerShell):
  $env:NEXT_PUBLIC_SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
  $env:SUPABASE_SERVICE_ROLE_KEY="<SERVICE_ROLE_KEY>"
  $env:OLLAMA_BASE_URL="http://localhost:11434"
  node scripts/index-embeddings.mjs --family <FAMILY_ID> [--rebuild] [--limit 100]
*/

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import fs from 'node:fs'

// Load env from .env and .env.local (local overrides)
if (fs.existsSync('.env')) config({ path: '.env' })
if (fs.existsSync('.env.local')) config({ path: '.env.local', override: true })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
const OLLAMA_EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text'

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars')
  process.exit(1)
}

const args = process.argv.slice(2)
const getArg = (name, def = undefined) => {
  const i = args.findIndex(a => a === name || a.startsWith(name + '='))
  if (i === -1) return def
  const a = args[i]
  if (a.includes('=')) return a.split('=')[1]
  return args[i + 1] ?? def
}

const FAMILY_ID = getArg('--family') || getArg('-f')
const LIMIT = parseInt(getArg('--limit', '0') || '0', 10)
const REBUILD = args.includes('--rebuild')

if (!FAMILY_ID) {
  console.error('Usage: node scripts/index-embeddings.mjs --family <FAMILY_ID> [--rebuild] [--limit N]')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function embed(text) {
  const res = await fetch(`${OLLAMA_BASE}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: OLLAMA_EMBED_MODEL, prompt: text })
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error('Ollama embed failed: ' + t)
  }
  const j = await res.json()
  return j.embedding
}

function memberSummary(member, parentName, familyName) {
  const lines = []
  if (familyName) lines.push(`Family: ${familyName}.`)
  lines.push(`Member: ${member.first_name ?? ''} ${member.last_name ?? ''}`.trim())
  if (member.date_of_birth) lines.push(`Date of birth: ${member.date_of_birth}.`)
  if (parentName) lines.push(`Direct parent: ${parentName}.`)
  if (member.biography) lines.push(`Biography: ${member.biography}`)
  return lines.join(' ')
}

async function main() {
  console.log('Indexing embeddings for family', FAMILY_ID)

  if (REBUILD) {
    console.log('Rebuild enabled: deleting existing embeddings for this family...')
    const { error: delErr } = await supabase
      .from('family_embeddings')
      .delete()
      .eq('family_id', FAMILY_ID)
    if (delErr) throw delErr
  }

  // Fetch family name
  const { data: family, error: famErr } = await supabase
    .from('families')
    .select('id,name')
    .eq('id', FAMILY_ID)
    .single()
  if (famErr) throw famErr

  // Fetch members of the family
  const { data: members, error: memErr } = await supabase
    .from('members')
    .select('id, first_name, last_name, date_of_birth, parent_id, biography')
    .eq('family_id', FAMILY_ID)
    .limit(LIMIT && LIMIT > 0 ? LIMIT : 100000)
  if (memErr) throw memErr

  if (!members || members.length === 0) {
    console.log('No members found for this family.')
    return
  }

  // Map for parent lookup
  const byId = new Map(members.map(m => [m.id, m]))

  // Sequentially index each member
  let inserted = 0
  for (const m of members) {
    const parentName = m.parent_id && byId.get(m.parent_id)
      ? `${byId.get(m.parent_id).first_name ?? ''} ${byId.get(m.parent_id).last_name ?? ''}`.trim()
      : ''
    const content = memberSummary(m, parentName, family?.name)
    try {
      const vector = await embed(content)
      const { error: insErr } = await supabase
        .from('family_embeddings')
        .insert({ family_id: FAMILY_ID, content, metadata: { member_id: m.id }, embedding: vector })
      if (insErr) throw insErr
      inserted++
      console.log(`Indexed member ${m.id}: ${m.first_name ?? ''} ${m.last_name ?? ''}`)
    } catch (e) {
      console.warn('Failed to index member', m.id, e.message)
    }
  }

  console.log(`Done. Inserted ${inserted} embedding rows.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
