import { createClient } from '@/lib/supabase/server'
import { FamilyWithStats } from '@/lib/types'

// Compute both member count and generation levels based on parent-child chain depth.
// We consider roots as members with no parent_id; generation count is 1 + max depth.
export async function computeFamilyStats(familyId: string) {
  const supabase = await createClient()
  const { data: members, error } = await supabase
    .from('members')
    .select('id,parent_id')
    .eq('family_id', familyId)

  if (error || !members) return { member_count: 0, generation_count: 0 }
  if (members.length === 0) return { member_count: 0, generation_count: 0 }

  const byId = new Map(members.map(m => [m.id, m.parent_id as string | null]))

  // Memoized DFS to compute depth for each member
  const memo = new Map<string, number>()
  const visiting = new Set<string>()

  const depthOf = (id: string): number => {
    if (memo.has(id)) return memo.get(id)!
    if (visiting.has(id)) return 1 // break cycles defensively
    visiting.add(id)
    const parent = byId.get(id)
    const depth = parent ? 1 + depthOf(parent) : 1
    visiting.delete(id)
    memo.set(id, depth)
    return depth
  }

  let maxDepth = 1
  for (const m of members) {
    maxDepth = Math.max(maxDepth, depthOf(m.id))
  }
  return { member_count: members.length, generation_count: maxDepth }
}

export async function getFamiliesWithStats(): Promise<FamilyWithStats[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.id) return []

  // Fetch families where the user is a member (created or joined)
  const { data: memberships, error: memErr } = await supabase
    .from('family_memberships')
    .select('family_id')
    .eq('user_id', user.id)
  if (memErr || !memberships || memberships.length === 0) return []

  const familyIds = memberships.map(m => m.family_id)
  const { data: families, error } = await supabase
    .from('families')
    .select('id,name,created_at')
    .in('id', familyIds)
    .order('created_at', { ascending: true })

  if (error || !families) return []

  // Compute stats per family (sequentially for simplicity)
  const results: FamilyWithStats[] = []
  for (const f of families) {
    const { member_count, generation_count } = await computeFamilyStats(f.id)
    results.push({
      id: f.id,
      name: f.name,
      created_at: f.created_at,
      member_count,
      generation_count,
    })
  }

  return results
}

