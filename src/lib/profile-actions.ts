"use server"

import { createClient as createServerAnon } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function deleteAuthUserAction() {
  const supabase = await createServerAnon()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.id) return { error: 'Not authenticated' }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) return { error: error.message }
  return { success: true }
}
