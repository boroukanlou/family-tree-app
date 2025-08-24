export interface User {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface Family {
  id: string
  name: string
  created_at: string
  member_count?: number
  generation_count?: number
}

export interface Member {
  id: string
  family_id: string
  first_name: string
  last_name: string
  date_of_birth?: string
  picture_url?: string
  biography?: string
  parent_id?: string
  created_at: string
}

export interface Relationship {
  member_id: string
  related_member_id: string
  relationship_type: RelationshipType
}

export interface FamilyWithStats extends Family {
  member_count: number
  generation_count: number
}

export type RelationshipType = 
  | 'parent'
  | 'child'
  | 'spouse'
  | 'sibling'
  | 'uncle'
  | 'aunt'
  | 'cousin'
  | 'nephew'
  | 'niece'
  | 'grandparent'
  | 'grandchild'

export type ExportFormat = 'json' | 'csv' | 'pdf'

export interface CreateFamilyData {
  name: string
}

export interface JoinFamilyData {
  token: string
}

// User profile stored in the `profiles` table (id matches auth.user id)
export interface Profile {
  id: string
  first_name?: string
  last_name?: string
  date_of_birth?: string | null
  avatar_url?: string | null
}
