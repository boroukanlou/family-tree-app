"use client"

import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/lib/auth-context'
import { Profile } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { deleteAuthUserAction } from '@/lib/profile-actions'

const schema = z.object({
  first_name: z.string().max(120).optional(),
  last_name: z.string().max(120).optional(),
  // Accept empty string or date in YYYY-MM-DD
  date_of_birth: z.string().regex(/^$|^\d{4}-\d{2}-\d{2}$/).optional(),
})

type FormValues = z.infer<typeof schema>

export default function UserProfileClient({ initialProfile, email }: { initialProfile: Profile | undefined, email: string }) {
  const router = useRouter()
  const { user, signOut } = useAuth()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | undefined | null>(initialProfile?.avatar_url || null)
  const [removePhoto, setRemovePhoto] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: initialProfile?.first_name || '',
      last_name: initialProfile?.last_name || '',
      date_of_birth: initialProfile?.date_of_birth || '',
    }
  })

  const uploadAvatarIfNeeded = async (): Promise<string | null | undefined> => {
    if (removePhoto) return null
    if (!selectedFile || !user?.id) return currentAvatarUrl || undefined
    const file = selectedFile
    const ext = file.name.split('.').pop() || 'png'
    const path = `${user.id}/avatar-${Date.now()}.${ext}`
    const { error: uploadErr } = await supabase.storage
      .from('avatars')
      .upload(path, file, { cacheControl: '3600', upsert: true, contentType: file.type })
    if (uploadErr) throw new Error(uploadErr.message)
    const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
    return pub.publicUrl
  }

  const onSubmit = async (values: FormValues) => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const avatar_url = await uploadAvatarIfNeeded()
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, avatar_url }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update profile')
      setCurrentAvatarUrl(avatar_url)
      setSelectedFile(null)
      setPreviewUrl(null)
      setRemovePhoto(false)
      setSuccess('Profile updated successfully')
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const onDelete = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) return
    setDeleting(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch('/api/profile', { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to delete account')
      }
      // Delete auth user using service role action
      const result = await deleteAuthUserAction()
      if (result?.error) {
        // If admin deletion failed, still sign out the user
        console.error('Admin deletion failed:', result.error)
      }
      // Sign out after deletion
      await signOut()
      router.replace('/login')
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Profile</h1>
          <Button variant="outline" asChild>
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* Avatar & upload stub */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="size-16">
                <AvatarImage src={previewUrl || (currentAvatarUrl || undefined)} />
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
              <div className="text-sm text-gray-500">Picture of the member</div>
            </div>
            <div className="flex gap-2">
              <input
                id="avatar-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null
                  setSelectedFile(file)
                  setRemovePhoto(false)
                  if (file) {
                    const url = URL.createObjectURL(file)
                    setPreviewUrl(url)
                  } else {
                    setPreviewUrl(null)
                  }
                }}
              />
              <Button variant="outline" onClick={() => document.getElementById('avatar-input')?.click()}>
                Choose image
              </Button>
              <Button variant="ghost" onClick={() => { setSelectedFile(null); setPreviewUrl(null); setCurrentAvatarUrl(null); setRemovePhoto(true) }}>
                Remove
              </Button>
            </div>
          </div>

          {success && (
            <div className="p-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded">
              {success}
            </div>
          )}
          {error && (
            <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded">
              {error}
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First</FormLabel>
                    <FormControl>
                      <Input placeholder="First name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last</FormLabel>
                    <FormControl>
                      <Input placeholder="Last name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date_of_birth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-2">
                <label className="text-sm font-medium">Email</label>
                <Input value={email} disabled />
              </div>

              <div className="pt-2">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : 'Update Profile info'}
                </Button>
              </div>
            </form>
          </Form>

          <div className="pt-6">
            <Button variant="destructive" onClick={onDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete Account'}
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
