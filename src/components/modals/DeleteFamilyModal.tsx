'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { X, AlertTriangle } from 'lucide-react'
import { FamilyWithStats } from '@/lib/types'

interface DeleteFamilyModalProps {
  isOpen: boolean
  onClose: () => void
  selectedFamilies: FamilyWithStats[]
  onFamiliesDeleted: (deletedIds: string[]) => void
}

export function DeleteFamilyModal({ 
  isOpen, 
  onClose, 
  selectedFamilies, 
  onFamiliesDeleted 
}: DeleteFamilyModalProps) {
  const [step, setStep] = useState<'confirm' | 'error'>('confirm')
  const [isLoading, setIsLoading] = useState(false)
  const [errorFamilies, setErrorFamilies] = useState<string[]>([])

  const handleDelete = async () => {
    setIsLoading(true)

    try {
      const ids = selectedFamilies.map(f => f.id)
      const { deleteFamiliesAction } = await import('@/lib/auth-actions')
      const result = await deleteFamiliesAction(ids)
      if (result?.error) {
        setErrorFamilies(selectedFamilies.map(f => f.name))
        setStep('error')
      } else {
        onFamiliesDeleted(ids)
        handleClose()
      }
    } catch (error) {
      console.error('Delete failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setStep('confirm')
    setErrorFamilies([])
    onClose()
  }

  if (step === 'error') {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-blue-600" />
            </div>
            <DialogTitle>Cannot Delete Family</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-center text-gray-600">
              You can not delete this family because of:
            </p>
            
            <ul className="space-y-1">
              <li>• Case 1</li>
              <li>• Case 2</li>
              <li>• Case 3</li>
              <li>• etc.</li>
            </ul>
            
            <div className="text-sm text-gray-500">
              <p>Families that could not be deleted:</p>
              <ul className="mt-1">
                {errorFamilies.map(familyName => (
                  <li key={familyName} className="ml-4">• {familyName}</li>
                ))}
              </ul>
            </div>
            
            <Button onClick={handleClose} className="w-full">
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <X className="w-6 h-6 text-red-600" />
          </div>
          <DialogTitle>Delete Family</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-center text-gray-600">
            Are you sure you want to delete this family?
          </p>
          
          <div className="text-sm text-gray-600">
            <p>Selected families ({selectedFamilies.length}):</p>
            <ul className="mt-1 ml-4">
              {selectedFamilies.map(family => (
                <li key={family.id} className="list-disc">{family.name}</li>
              ))}
            </ul>
          </div>
          
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-700">
              This action cannot be undone.
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
