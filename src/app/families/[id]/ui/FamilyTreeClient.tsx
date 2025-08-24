"use client"

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Info, Pencil, MessageCircle, UserPlus, Bot } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'
import type { RelationshipType } from '@/lib/types'

interface Member {
  id: string
  first_name: string
  last_name: string
  date_of_birth?: string | null
  parent_id?: string | null
  picture_url?: string | null
  biography?: string | null
}

interface FamilyTreeClientProps {
  family: { id: string; name: string; created_at: string }
  initialMembers: Member[]
}

export default function FamilyTreeClient({ family, initialMembers }: FamilyTreeClientProps) {
  const supabase = createClient()
  const [members, setMembers] = useState<Member[]>(initialMembers)
  const [showAdd, setShowAdd] = useState(false)
  const [showEdit, setShowEdit] = useState<Member | null>(null)
  const [showInfo, setShowInfo] = useState<Member | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)

  const levels = useMemo(() => buildLevels(members), [members])
  const selectedMember = members.find(m => m.id === selected) || null

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <h1 className="text-xl font-semibold">{family.name}</h1>
          <Button variant="outline" asChild>
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Simple tree grid rendering by levels */}
        <div className="space-y-8">
          {levels.map((level, idx) => (
            <div key={idx} className="flex flex-wrap items-start justify-center gap-6">
              {level.map((m) => (
                <button key={m.id} onClick={() => setSelected(m.id)} className={`bg-white border rounded-lg shadow p-4 w-64 text-left transition-colors ${selected === m.id ? 'ring-2 ring-blue-500 border-blue-500' : ''}`}>
                  <div className="font-medium text-center">
                    {m.first_name} {m.last_name}
                  </div>
                  <div className="text-xs text-gray-500 text-center">{m.date_of_birth || ''}</div>
                </button>
              ))}
            </div>
          ))}
        </div>
      </main>

      {/* Bottom fixed toolbar */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-2 grid grid-cols-4 gap-2">
          <Button variant="ghost" className="flex flex-col items-center py-4" onClick={() => setShowAdd(true)}>
            <UserPlus className="h-6 w-6" />
          </Button>
          <Button variant="ghost" className="flex flex-col items-center py-4" disabled={!selectedMember} onClick={() => selectedMember && setShowEdit(selectedMember)}>
            <Pencil className="h-6 w-6" />
          </Button>
          <Button variant="ghost" className="flex flex-col items-center py-4" disabled={!selectedMember} onClick={() => selectedMember && setShowInfo(selectedMember)}>
            <Info className="h-6 w-6" />
          </Button>
          <Button variant="ghost" className="flex flex-col items-center py-4" onClick={() => setChatOpen(true)}>
            <Bot className="h-6 w-6" />
          </Button>
        </div>
      </div>

      <ChatOverlay open={chatOpen} onClose={() => setChatOpen(false)} familyId={family.id} />

      <AddMemberModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        members={members}
        onAdded={(m) => setMembers((prev) => [...prev, m])}
        familyId={family.id}
        initialParentId={selected || undefined}
      />

      {selectedMember && showEdit && (
        <EditMemberModal
          member={showEdit}
          members={members}
          onClose={() => setShowEdit(null)}
          onUpdated={(mm) => setMembers((prev) => prev.map((x) => (x.id === mm.id ? mm : x)))}
        />
      )}

      {selectedMember && showInfo && (
        <InfoMemberModal member={showInfo} onClose={() => setShowInfo(null)} />
      )}
    </div>
  )
}

function buildLevels(members: Member[]) {
  // Simple BFS by parent_id; roots have no parent
  const byParent: Record<string, Member[]> = {}
  const roots: Member[] = []
  for (const m of members) {
    if (!m.parent_id) roots.push(m)
    else {
      byParent[m.parent_id] ||= []
      byParent[m.parent_id].push(m)
    }
  }
  const levels: Member[][] = []
  let current = roots
  while (current.length) {
    levels.push(current)
    const next: Member[] = []
    for (const m of current) {
      next.push(...(byParent[m.id] || []))
    }
    current = next
  }
  return levels
}

function AddMemberModal({ open, onClose, onAdded, familyId, members, initialParentId }: { open: boolean; onClose: () => void; onAdded: (m: Member) => void; familyId: string; members: Member[]; initialParentId?: string }) {
  const supabase = createClient()
  const { user } = useAuth()
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [dob, setDob] = useState('')
  const [bio, setBio] = useState('')
  const [parentId, setParentId] = useState<string | undefined>(initialParentId)
  const [photo, setPhoto] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [relation, setRelation] = useState<RelationshipType | 'none'>('none')
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (open) setParentId(initialParentId)
  }, [open, initialParentId])

  const submit = async () => {
    setLoading(true)
    setFormError(null)
    try {
      // If a direct member is chosen, require a relation
      if (parentId && relation === 'none') {
        setFormError('Please choose a member relation')
        setLoading(false)
        return
      }
      let picture_url: string | null = null
      if (photo) {
        if (!user?.id) throw new Error('Not authenticated')
        const ext = photo.name.split('.').pop() || 'jpg'
        const path = `${user.id}/${familyId}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: upErr } = await supabase.storage.from('member-photos').upload(path, photo, { contentType: photo.type, upsert: true })
        if (upErr) throw upErr
        const { data: pub } = supabase.storage.from('member-photos').getPublicUrl(path)
        picture_url = pub.publicUrl
      }
      const { data: inserted, error } = await supabase
        .from('members')
        .insert({ family_id: familyId, first_name: first, last_name: last, date_of_birth: dob || null, biography: bio || null, parent_id: relation === 'child' && parentId ? parentId : null, picture_url })
        .select('id, first_name, last_name, date_of_birth, parent_id, picture_url, biography')
        .single()
      if (error) throw error

      // If relation provided, try to store it in relationships table (best effort)
      if (parentId && relation !== 'none') {
        try {
          await supabase.from('relationships').insert([{ member_id: inserted.id, related_member_id: parentId, relationship_type: relation }])
        } catch {}
      }

      onAdded(inserted as any)
      onClose()
      setFirst(''); setLast(''); setDob(''); setBio(''); setParentId(undefined); setPhoto(null)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a family member</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="First name" value={first} onChange={(e) => setFirst(e.target.value)} />
          <Input placeholder="Last name" value={last} onChange={(e) => setLast(e.target.value)} />
          <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
          <Textarea placeholder="Biography" value={bio} onChange={(e) => setBio(e.target.value)} />
          <div className="grid gap-2">
            <label className="text-sm font-medium">Choose a direct family member</label>
            <Select value={parentId ?? 'none'} onValueChange={(v) => setParentId(v === 'none' ? undefined : v)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="None (root)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Choose a member relation</label>
            <Select value={relation} onValueChange={(v) => setRelation(v as RelationshipType | 'none')}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select relation" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="parent">Parent</SelectItem>
                <SelectItem value="child">Child</SelectItem>
                <SelectItem value="spouse">Spouse</SelectItem>
                <SelectItem value="sibling">Sibling</SelectItem>
                <SelectItem value="uncle">Uncle</SelectItem>
                <SelectItem value="aunt">Aunt</SelectItem>
                <SelectItem value="cousin">Cousin</SelectItem>
                <SelectItem value="nephew">Nephew</SelectItem>
                <SelectItem value="niece">Niece</SelectItem>
                <SelectItem value="grandparent">Grandparent</SelectItem>
                <SelectItem value="grandchild">Grandchild</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Photo</label>
            <Input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
          </div>
          {formError && (
            <div className="text-sm text-red-600">{formError}</div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={submit} disabled={loading || !first.trim() || !last.trim()}>{loading ? 'Saving...' : 'Add Member'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function EditMemberModal({ member, onClose, onUpdated, members }: { member: Member; onClose: () => void; onUpdated: (m: Member) => void; members: Member[] }) {
  const supabase = createClient()
  const { user } = useAuth()
  const [first, setFirst] = useState(member.first_name)
  const [last, setLast] = useState(member.last_name)
  const [dob, setDob] = useState(member.date_of_birth || '')
  const [bio, setBio] = useState(member.biography || '')
  const [parentId, setParentId] = useState<string | undefined>(member.parent_id || undefined)
  const [photo, setPhoto] = useState<File | null>(null)
  const [removePhoto, setRemovePhoto] = useState(false)
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setLoading(true)
    try {
      let picture_url: string | null | undefined = undefined
      if (removePhoto) picture_url = null
      else if (photo) {
        if (!user?.id) throw new Error('Not authenticated')
        const ext = photo.name.split('.').pop() || 'jpg'
        const path = `${user.id}/member-${member.id}-${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from('member-photos').upload(path, photo, { contentType: photo.type, upsert: true })
        if (upErr) throw upErr
        const { data: pub } = supabase.storage.from('member-photos').getPublicUrl(path)
        picture_url = pub.publicUrl
      }
      const update: any = { first_name: first, last_name: last, date_of_birth: dob || null, biography: bio || null, parent_id: parentId || null }
      if (picture_url !== undefined) update.picture_url = picture_url
      const { data, error } = await supabase
        .from('members')
        .update(update)
        .eq('id', member.id)
        .select('id, first_name, last_name, date_of_birth, parent_id, picture_url, biography')
        .single()
      if (error) throw error
      onUpdated(data as any)
      onClose()
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update info {member.first_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="First name" value={first} onChange={(e) => setFirst(e.target.value)} />
          <Input placeholder="Last name" value={last} onChange={(e) => setLast(e.target.value)} />
          <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
          <div className="grid gap-2">
            <label className="text-sm font-medium">Choose a direct family member</label>
            <Select value={parentId ?? 'none'} onValueChange={(v) => setParentId(v === 'none' ? undefined : v)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="None (root)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {members.filter(x => x.id !== member.id).map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Textarea placeholder="Biography" value={bio} onChange={(e) => setBio(e.target.value)} />
          <div className="grid gap-2">
            <label className="text-sm font-medium">Photo</label>
            <Input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
            <div className="flex items-center gap-2">
              <input type="checkbox" id="remove-photo" checked={removePhoto} onChange={(e) => setRemovePhoto(e.target.checked)} />
              <label htmlFor="remove-photo" className="text-sm">Remove existing photo</label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={submit} disabled={loading || !first.trim() || !last.trim()}>{loading ? 'Saving...' : 'Update Member'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function InfoMemberModal({ member, onClose }: { member: Member; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Info {member.first_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            <div className="space-y-2">
              <div className="text-sm"><strong>First Name:</strong> {member.first_name}</div>
              <div className="text-sm"><strong>Last Name:</strong> {member.last_name}</div>
              <div className="text-sm"><strong>Date of Birth:</strong> {member.date_of_birth || '-'}</div>
            </div>
            <div className="flex items-center justify-center">
              {member.picture_url ? (
                <img
                  src={member.picture_url}
                  alt={`${member.first_name} ${member.last_name}`}
                  className="w-28 h-28 rounded border object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-28 h-28 rounded border bg-gray-50 text-gray-400 text-xs flex items-center justify-center">
                  No image
                </div>
              )}
            </div>
          </div>

          <div className="text-sm"><strong>Biography:</strong></div>
          <div className="text-sm whitespace-pre-wrap bg-gray-50 p-3 rounded border min-h-24">{member.biography || '—'}</div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ChatOverlay({ open, onClose, familyId }: { open: boolean; onClose: () => void; familyId?: string }) {
  const [messages, setMessages] = useState<{ role: 'agent' | 'user'; content: string }[]>([
    { role: 'agent', content: 'Welcome to the family history! Ask me about members or relationships.' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const send = async () => {
    const text = input.trim()
    if (!text) return
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text, familyId })
      })
      if (res.ok) {
        const data = await res.json()
        setMessages((prev) => [...prev, { role: 'agent', content: data.answer || '(no answer)' }])
      } else {
        setMessages((prev) => [...prev, { role: 'agent', content: 'Sorry, I had trouble answering that.' }])
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'agent', content: 'Network error contacting the assistant.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agent</DialogTitle>
        </DialogHeader>
        <div className="h-72 overflow-y-auto rounded border p-3 bg-white space-y-2">
          {messages.map((m, i) => (
            <div key={i} className={m.role === 'agent' ? 'text-left' : 'text-right'}>
              <span className={m.role === 'agent' ? 'bg-gray-100 text-gray-800 inline-block px-3 py-1 rounded' : 'bg-blue-600 text-white inline-block px-3 py-1 rounded'}>
                {m.content}
              </span>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask something..." />
          <Button onClick={send} disabled={loading}>{loading ? '...' : 'Send'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
