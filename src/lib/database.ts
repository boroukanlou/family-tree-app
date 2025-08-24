import { createClient } from '@/lib/supabase/server'
import { FamilyWithStats, CreateFamilyData } from '@/lib/types'
import { generateToken } from './utils'

export async function getUserFamilies(userId: string): Promise<FamilyWithStats[]> {
  const supabase = await createClient()
  
  // Get families where the user is a member (simplified - assuming all users are admins for now)
  const { data: families, error } = await supabase
    .from('families')
    .select(`
      id,
      name,
      created_at,
      members!inner(id, family_id)
    `)
    .eq('members.id', userId) // This would need a proper user-family relationship table
  
  if (error) {
    console.error('Error fetching families:', error)
    return []
  }

  // Calculate stats for each family
  const familiesWithStats: FamilyWithStats[] = await Promise.all(
    (families || []).map(async (family: any) => {
      const memberCount = await getMemberCount(family.id)
      const generationCount = await getGenerationCount(family.id)
      
      return {
        id: family.id,
        name: family.name,
        created_at: family.created_at,
        member_count: memberCount,
        generation_count: generationCount,
      }
    })
  )

  return familiesWithStats
}

export async function getMemberCount(familyId: string): Promise<number> {
  const supabase = await createClient()
  
  const { count, error } = await supabase
    .from('members')
    .select('*', { count: 'exact', head: true })
    .eq('family_id', familyId)
  
  if (error) {
    console.error('Error counting members:', error)
    return 0
  }
  
  return count || 0
}

export async function getGenerationCount(familyId: string): Promise<number> {
  const supabase = await createClient()
  
  // Get all members with their parent relationships
  const { data: members, error } = await supabase
    .from('members')
    .select('id, parent_id')
    .eq('family_id', familyId)
  
  if (error || !members) {
    console.error('Error fetching members for generation count:', error)
    return 0
  }
  
  // Calculate generations by finding the maximum depth from root members
  const memberMap = new Map(members.map(m => [m.id, m]))
  const generations = new Set<number>()
  
  // Function to calculate generation level for a member
  function getGenerationLevel(memberId: string, visited = new Set<string>()): number {
    if (visited.has(memberId)) return 0 // Avoid circular references
    visited.add(memberId)
    
    const member = memberMap.get(memberId)
    if (!member || !member.parent_id) return 1 // Root member
    
    return getGenerationLevel(member.parent_id, visited) + 1
  }
  
  // Calculate generation for each member
  members.forEach(member => {
    const level = getGenerationLevel(member.id)
    generations.add(level)
  })
  
  return generations.size
}

export async function createFamily(data: CreateFamilyData, userId: string) {
  const supabase = await createClient()
  
  // Create the family
  const { data: family, error: familyError } = await supabase
    .from('families')
    .insert([{
      name: data.name,
    }])
    .select()
    .single()
  
  if (familyError) {
    throw new Error(familyError.message)
  }
  
  // Add the creator as the first member
  const { data: member, error: memberError } = await supabase
    .from('members')
    .insert([{
      family_id: family.id,
      first_name: 'Family',
      last_name: 'Creator',
      // Note: In a real app, you'd want to get user's actual name
    }])
    .select()
    .single()
  
  if (memberError) {
    // Cleanup: delete the family if member creation fails
    await supabase.from('families').delete().eq('id', family.id)
    throw new Error(memberError.message)
  }
  
  // Generate a unique token for joining this family
  const token = generateToken()
  
  return {
    family,
    member,
    token
  }
}

export async function joinFamily(token: string, userId: string) {
  // For now, we'll simulate token validation
  // In a real app, you'd store tokens in a separate table
  
  const supabase = await createClient()
  
  // This is simplified - you'd need a proper token system
  // For demo purposes, we'll just create a member in the first available family
  const { data: families } = await supabase
    .from('families')
    .select('id')
    .limit(1)
  
  if (!families || families.length === 0) {
    throw new Error('Invalid token or family not found')
  }
  
  const familyId = families[0].id
  
  const { data: member, error } = await supabase
    .from('members')
    .insert([{
      family_id: familyId,
      first_name: 'New',
      last_name: 'Member',
    }])
    .select()
    .single()
  
  if (error) {
    throw new Error(error.message)
  }
  
  return { member, familyId }
}
