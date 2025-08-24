'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Check } from 'lucide-react'
import { FamilyWithStats, CreateFamilyData } from '@/lib/types'
import { createFamilyAction } from '@/lib/auth-actions'

interface CreateFamilyModalProps {
  isOpen: boolean
  onClose: () => void
  onFamilyCreated: (family: FamilyWithStats) => void
}

export function CreateFamilyModal({ isOpen, onClose, onFamilyCreated }: CreateFamilyModalProps) {
  const [step, setStep] = useState<'create' | 'success'>('create')
  const [familyName, setFamilyName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [createdFamilyId, setCreatedFamilyId] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!familyName.trim()) return

    setIsLoading(true)
    try {
      const result = await createFamilyAction(familyName)
      if (result?.error) throw new Error(result.error)

      const newId = (result as any)?.familyId ?? (result.family as any)?.id
      if (newId) setCreatedFamilyId(newId)
      if (result.family) {
        onFamilyCreated(result.family as unknown as FamilyWithStats)
      }
      setStep('success')
    } catch (error) {
      console.error('Failed to create family:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setStep('create')
    setFamilyName('')
    setCreatedFamilyId('')
    onClose()
  }

  const copyId = () => {
    if (createdFamilyId) navigator.clipboard.writeText(createdFamilyId)
  }

  if (step === 'success') {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <DialogTitle>Family Created Successfully!</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-center text-gray-600">Family ID (UUID):</p>
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <code className="font-mono text-sm break-all">{createdFamilyId}</code>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={copyId} variant="outline" className="flex-1">
                Copy ID
              </Button>
              <Button onClick={handleClose} className="flex-1">
                Done
              </Button>
            </div>
            
            <p className="text-xs text-gray-500 text-center">
              Save this ID for future reference.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create a new family</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="familyName">Enter the name of the family</Label>
            <Input
              id="familyName"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              placeholder="Family name..."
              required
            />
          </div>
          
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
              disabled={!familyName.trim() || isLoading}
              className="flex-1"
            >
              {isLoading ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
