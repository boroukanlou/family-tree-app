import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FamilyTreeClient from './ui/FamilyTreeClient'

export default async function FamilyTreePage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const familyId = params.id

  const { data: family } = await supabase
    .from('families')
    .select('id,name,created_at')
    .eq('id', familyId)
    .single()

  const { data: members } = await supabase
    .from('members')
    .select('id, first_name, last_name, date_of_birth, parent_id, picture_url, biography')
    .eq('family_id', familyId)

  return (
    <FamilyTreeClient family={{ id: familyId, name: family?.name || 'Family', created_at: family?.created_at || '' }} initialMembers={members || []} />
  )
}

