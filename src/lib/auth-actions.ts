"use server"

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export interface LoginFormData {
  email: string
  password: string
  rememberMe?: boolean
}

export async function login(formData: LoginFormData) {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.email,
    password: formData.password,
  })

  if (error) {
    return { error: error.message }
  }

  await supabase.auth.getSession()
  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signInWithGoogle() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback` },
  })
  if (error) return { error: error.message }
  if (data.url) redirect(data.url)
}

export async function signInWithFacebook() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'facebook',
    options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback` },
  })
  if (error) return { error: error.message }
  if (data.url) redirect(data.url)
}

export async function signInWithLinkedIn() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'linkedin_oidc',
    options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback` },
  })
  if (error) return { error: error.message }
  if (data.url) redirect(data.url)
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  await supabase.auth.getSession()
  redirect('/login')
}

// Families server actions
import { computeFamilyStats } from '@/lib/families'

export async function createFamilyAction(name: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: family, error } = await supabase
    .from('families')
    .insert([{ name, created_by: user?.id || null }])
    .select('id,name,created_at,created_by')
    .single()
  if (error || !family) return { error: error?.message || 'Failed to create family' }

  // Add creator to memberships automatically (owner)
  if (user?.id) {
    await supabase.from('family_memberships')
      .insert([{ user_id: user.id, family_id: family.id, role: 'owner' }])
  }

  const stats = await computeFamilyStats(family.id)
  return { family: { ...family, ...stats }, familyId: family.id }
}

// Join by family UUID (no separate invite table)
export async function joinFamilyAction(familyId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.id) return { error: 'Not authenticated' }

  // Validate family exists and you are not the creator
  const { data: fam, error: famErr } = await supabase
    .from('families')
    .select('id, created_by')
    .eq('id', familyId)
    .single()
  if (famErr) return { error: famErr.message }
  if (!fam) return { error: 'Family not found' }
  if (fam.created_by === user.id) return { error: 'You cannot join a family you created' }

  // Insert membership (idempotent behavior is not guaranteed without RLS/UPSERT)
  const { error: memErr } = await supabase
    .from('family_memberships')
    .insert([{ user_id: user.id, family_id: familyId, role: 'member' }])
  if (memErr) return { error: memErr.message }

  const stats = await computeFamilyStats(familyId)
  return { familyId, stats }
}

export async function deleteFamiliesAction(ids: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.id) return { error: 'Not authenticated' }

  // Fetch ownership for provided families
  const { data: fams, error: fetchErr } = await supabase
    .from('families')
    .select('id, created_by')
    .in('id', ids)
  if (fetchErr) return { error: fetchErr.message }

  const ownedIds = (fams || []).filter(f => f.created_by === user.id).map(f => f.id)
  const otherIds = ids.filter(id => !ownedIds.includes(id))

  // Delete owned families (cascades to members and memberships via FK)
  if (ownedIds.length > 0) {
    const { error: delErr } = await supabase
      .from('families')
      .delete()
      .in('id', ownedIds)
    if (delErr) return { error: delErr.message }
  }

  // For families not owned, just remove membership for current user
  if (otherIds.length > 0) {
    const { error: leaveErr } = await supabase
      .from('family_memberships')
      .delete()
      .eq('user_id', user.id)
      .in('family_id', otherIds)
    if (leaveErr) return { error: leaveErr.message }
  }

  return { success: true, deletedIds: ownedIds, leftIds: otherIds }
}
