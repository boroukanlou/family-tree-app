import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import UserProfileClient from './ui/UserProfileClient'

export default async function UserProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Fetch existing profile (optional SSR warm data)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, date_of_birth, avatar_url')
    .eq('id', user!.id)
    .single()

  return (
    <UserProfileClient initialProfile={profile || { id: user!.id, first_name: user!.user_metadata?.first_name, last_name: user!.user_metadata?.last_name }} email={user!.email || ''} />
  )
}
