import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
const OLLAMA_GENERATE_MODEL = process.env.OLLAMA_GENERATE_MODEL || 'llama3.1:8b'
const OLLAMA_EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text'

export async function POST(req: NextRequest) {
  try {
    const { question, familyId, topK = 5 } = await req.json()
    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'Invalid question' }, { status: 400 })
    }

    // 1) Embed the question via Ollama embeddings
    const embedRes = await fetch(`${OLLAMA_BASE}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: OLLAMA_EMBED_MODEL, prompt: question })
    })
    if (!embedRes.ok) {
      const t = await embedRes.text()
      return NextResponse.json({ error: 'Failed to get embeddings', details: t }, { status: 500 })
    }
    const embedJson: any = await embedRes.json()
    const queryEmbedding: number[] = embedJson.embedding

    // 2) Retrieve top-k similar chunks from Supabase
    const supabase = await createClient()
    const { data: matches, error: matchErr } = await supabase
      .rpc('match_family_embeddings', {
        query_embedding: queryEmbedding as any,
        match_threshold: 0.2, // low threshold; we already limit by topK
        match_count: Math.min(10, Math.max(1, topK)),
        family: familyId || null,
      })
    if (matchErr) {
      return NextResponse.json({ error: matchErr.message }, { status: 500 })
    }

    const contextText = (matches || [])
      .map((m: any) => `- ${m.content}`)
      .join('\n')

    const augmented = `You are an expert genealogy assistant. Use ONLY the information in the Info section to answer. If the answer is not present, say you don't know.\n\nInfo:\n${contextText || '(no info)'}\n\nQuestion: ${question}\n\nAnswer:`

    // 3) Generate answer via Ollama
    const genRes = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: OLLAMA_GENERATE_MODEL, prompt: augmented, stream: false })
    })
    if (!genRes.ok) {
      const t = await genRes.text()
      return NextResponse.json({ error: 'Failed to generate answer', details: t }, { status: 500 })
    }
    const genJson: any = await genRes.json()
    const answer: string = genJson.response || genJson.answer || ''

    return NextResponse.json({ answer, sources: matches || [] })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}
