'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { joinFamilyAction } from '@/lib/auth-actions'

interface JoinFamilyModalProps {
  isOpen: boolean
  onClose: () => void
  onFamilyJoined: (familyId: string) => void
}

export function JoinFamilyModal({ isOpen, onClose, onFamilyJoined }: JoinFamilyModalProps) {
  const [token, setToken] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token.trim()) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await joinFamilyAction(token)
      if (result?.error) {
        throw new Error(result.error)
      }
      onFamilyJoined(result.familyId)
      handleClose()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setToken('')
    setError(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Join a family</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="token">Enter the family ID (UUID)</Label>
            <Input
              id="token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Family ID (UUID)..."
              required
            />
          </div>
          
          {error && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-700">{error}</p>
            </div>
          )}
          
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!token.trim() || isLoading}
              className="flex-1"
            >
              {isLoading ? 'Joining...' : 'Join'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
