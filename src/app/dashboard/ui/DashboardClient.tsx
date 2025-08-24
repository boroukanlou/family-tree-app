"use client"

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { logout } from '@/lib/auth-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Checkbox } from '@/components/ui/checkbox'
import { Search, User, LogOut, Plus, UserPlus, Download, Trash2 } from 'lucide-react'
import { FamilyWithStats } from '@/lib/types'
import Link from 'next/link'
import { CreateFamilyModal } from '@/components/modals/CreateFamilyModal'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { JoinFamilyModal } from '@/components/modals/JoinFamilyModal'
import { ExportFamilyModal } from '@/components/modals/ExportFamilyModal'
import { DeleteFamilyModal } from '@/components/modals/DeleteFamilyModal'

export default function DashboardClient({ initialFamilies }: { initialFamilies: FamilyWithStats[] }) {
  const { user, loading, signOut } = useAuth()
  const [families, setFamilies] = useState<FamilyWithStats[]>(initialFamilies)
  const [selectedFamilies, setSelectedFamilies] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined)

  useEffect(() => {
    // no-op: families are provided from the server for SSR
  }, [])

  useEffect(() => {
    // Optimistic avatar: use auth metadata first (e.g., OAuth picture)
    const metaUrl = (user as any)?.user_metadata?.avatar_url || (user as any)?.user_metadata?.picture
    if (metaUrl && !avatarUrl) setAvatarUrl(metaUrl)
    // Fetch user profile avatar for header from profiles table
    const loadProfile = async () => {
      try {
        const res = await fetch('/api/profile', { cache: 'no-store' })
        if (res.ok) {
          const p = await res.json()
          if (p?.avatar_url) setAvatarUrl(p.avatar_url)
        }
      } catch {}
    }
    loadProfile()
  }, [user])

  const handleSelectFamily = (familyId: string, checked: boolean) => {
    if (checked) {
      setSelectedFamilies([...selectedFamilies, familyId])
    } else {
      setSelectedFamilies(selectedFamilies.filter(id => id !== familyId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedFamilies(filteredFamilies.map(f => f.id))
    } else {
      setSelectedFamilies([])
    }
  }

  const filteredFamilies = families.filter(family =>
    family.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleFamilyCreated = (newFamily: FamilyWithStats) => {
    setFamilies(prev => [...prev, newFamily])
    // Do not close the modal here; let the success step remain until user clicks Done
  }

  const handleFamilyJoined = async (familyId: string) => {
    try {
      const res = await fetch(`/api/families/${familyId}/stats`, { cache: 'no-store' })
      if (res.ok) {
        const fam = await res.json()
        setFamilies(prev => {
          const exists = prev.some(f => f.id === fam.id)
          return exists ? prev.map(f => (f.id === fam.id ? { ...f, ...fam } : f)) : [...prev, fam]
        })
      }
    } catch {}
    setIsJoinModalOpen(false)
  }

  // Show loading while checking authentication or redirecting
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-gray-900">
              GESTION HISTORIQUE DE LA FAMILLE
            </h1>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
                  <Avatar className="size-8">
                    <AvatarImage src={avatarUrl || undefined} alt="avatar" referrerPolicy="no-referrer" />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuItem asChild>
                  <Link href="/user-profile" className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={async () => {
                  // Clear client session, then clear server cookies and redirect
                  try { await signOut() } finally { await logout() }
                }}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Actions */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          
          <div className="flex gap-2">
            <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create
            </Button>
            <Button variant="outline" onClick={() => setIsJoinModalOpen(true)} className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Join
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setIsExportModalOpen(true)}
              disabled={selectedFamilies.length === 0}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => setIsDeleteModalOpen(true)}
              disabled={selectedFamilies.length === 0}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>

        {/* Family Table (hidden on small screens) */}
        <div className="hidden md:block bg-white rounded-lg shadow">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox 
                    checked={selectedFamilies.length === filteredFamilies.length && filteredFamilies.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-center">Members</TableHead>
                <TableHead className="text-center">Generations</TableHead>
                <TableHead className="text-center">Access</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFamilies.map((family) => (
                <TableRow key={family.id}>
                  <TableCell>
                    <Checkbox 
                      checked={selectedFamilies.includes(family.id)}
                      onCheckedChange={(checked) => handleSelectFamily(family.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{family.name}</TableCell>
                  <TableCell className="text-center">{family.member_count}</TableCell>
                  <TableCell className="text-center">{family.generation_count}</TableCell>
                  <TableCell className="text-center">
                    <Button asChild size="sm">
                      <Link href={`/families/${family.id}`}>View</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden mt-6 space-y-4">
          {filteredFamilies.map((family) => (
            <div key={family.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    checked={selectedFamilies.includes(family.id)}
                    onCheckedChange={(checked) => handleSelectFamily(family.id, checked as boolean)}
                  />
                  <h3 className="font-medium">{family.name}</h3>
                </div>
                <Button asChild size="sm">
                  <Link href={`/families/${family.id}`}>View</Link>
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Members:</span> {family.member_count}
                </div>
                <div>
                  <span className="text-gray-500">Generations:</span> {family.generation_count}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Info Note */}
        {selectedFamilies.length > 0 && (
          <div className="mt-6 p-4 bg-yellow-50 border-l-4 border-yellow-400">
            <p className="text-sm text-yellow-700">
              Export et delete sont uniquement accessible lorsque une ou plusieurs familles sont
              sélectionnées et seul la personne ayant créer la famille peut la supprimer.
            </p>
          </div>
        )}
      </main>

      {/* Modals */}
      <CreateFamilyModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onFamilyCreated={handleFamilyCreated}
      />
      
      <JoinFamilyModal 
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        onFamilyJoined={handleFamilyJoined}
      />
      
      <ExportFamilyModal 
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        selectedFamilies={selectedFamilies.map(id => filteredFamilies.find(f => f.id === id)!).filter(Boolean)}
      />
      
      <DeleteFamilyModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        selectedFamilies={selectedFamilies.map(id => filteredFamilies.find(f => f.id === id)!).filter(Boolean)}
        onFamiliesDeleted={(deletedIds) => {
          setFamilies(families.filter(f => !deletedIds.includes(f.id)))
          setSelectedFamilies([])
        }}
      />
    </div>
  )
}

