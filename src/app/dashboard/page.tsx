import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardClient from './ui/DashboardClient'
import { getFamiliesWithStats } from '@/lib/families'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }
  const families = await getFamiliesWithStats()
  return <DashboardClient initialFamilies={families} />
}
