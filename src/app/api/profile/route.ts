import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: return current user's profile
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // profiles table keyed by auth user id
  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, date_of_birth, avatar_url')
    .eq('id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data || { id: user.id })
}

// PATCH: update profile
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()

  const cleanString = (v: unknown) => {
    if (v === undefined || v === null) return null
    if (typeof v === 'string') {
      const t = v.trim()
      return t === '' ? null : t
    }
    return v as any
  }

  const payload: any = {
    id: user.id,
    first_name: cleanString(body.first_name),
    last_name: cleanString(body.last_name),
    // If empty string provided for date, cast to null to satisfy Postgres date column
    date_of_birth: cleanString(body.date_of_birth),
    avatar_url: cleanString(body.avatar_url),
  }

  // upsert row
  const { data, error } = await supabase
    .from('profiles')
    .upsert(payload, { onConflict: 'id' })
    .select('id, first_name, last_name, date_of_birth, avatar_url')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

// DELETE: delete user account and profile
export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Best-effort cleanup: remove profile, memberships, etc. Actual auth user deletion
  // requires service role (server-side). Here we delete related rows and sign out.
  await supabase.from('family_memberships').delete().eq('user_id', user.id)
  await supabase.from('profiles').delete().eq('id', user.id)

  // We cannot delete the auth user with anon key; client will sign out after.
  return NextResponse.json({ success: true })
}
