import { NextResponse } from 'next/server'
import { computeFamilyStats } from '@/lib/families'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params

  const supabase = await createClient()
  const { data: family, error } = await supabase
    .from('families')
    .select('id,name,created_at')
    .eq('id', id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!family) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const stats = await computeFamilyStats(id)
  return NextResponse.json({ ...family, ...stats })
}

