'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { FamilyWithStats, ExportFormat } from '@/lib/types'

interface ExportFamilyModalProps {
  isOpen: boolean
  onClose: () => void
  selectedFamilies: FamilyWithStats[]
}

export function ExportFamilyModal({ isOpen, onClose, selectedFamilies }: ExportFamilyModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('json')
  const [isLoading, setIsLoading] = useState(false)

  const handleExport = async () => {
    setIsLoading(true)

    try {
      // Pull fresh stats from the server in case counts changed
      const fresh = await Promise.all(
        selectedFamilies.map(async (family) => {
          const res = await fetch(`/api/families/${family.id}/stats`, { cache: 'no-store' })
          if (!res.ok) return family
          const stats = await res.json()
          return { ...family, ...stats }
        })
      )

      const familyData = fresh.map(family => ({
        name: family.name,
        members: family.member_count,
        generations: family.generation_count,
        created_at: family.created_at
      }))

      // Create export data based on format
      let exportData: string
      let filename: string
      let mimeType: string

      switch (selectedFormat) {
        case 'json':
          exportData = JSON.stringify(familyData, null, 2)
          filename = `family-export-${Date.now()}.json`
          mimeType = 'application/json'
          break
        case 'csv':
          const headers = ['Name', 'Members', 'Generations', 'Created At']
          const csvRows = [
            headers.join(','),
            ...familyData.map(family => 
              [family.name, family.members, family.generations, family.created_at].join(',')
            )
          ]
          exportData = csvRows.join('\n')
          filename = `family-export-${Date.now()}.csv`
          mimeType = 'text/csv'
          break
        case 'pdf':
          // For PDF, we'd typically use a library like jsPDF
          exportData = `Family Export Report\n\n${familyData.map(f => 
            `Family: ${f.name}\nMembers: ${f.members}\nGenerations: ${f.generations}\nCreated: ${f.created_at}\n\n`
          ).join('')}`
          filename = `family-export-${Date.now()}.txt`
          mimeType = 'text/plain'
          break
      }

      // Create download
      const blob = new Blob([exportData], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      onClose()
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateToken = () => {
    return selectedFamilies.map(f => f.name).join('-') + Date.now().toString(36)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export a family</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              Token: {generateToken()}
            </p>
          </div>

          <div className="space-y-3">
            <Label>Select the form of exportation</Label>
            <RadioGroup value={selectedFormat} onValueChange={(value) => setSelectedFormat(value as ExportFormat)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="json" id="json" />
                <Label htmlFor="json">JSON</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv">CSV</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pdf" id="pdf" />
                <Label htmlFor="pdf">TXT</Label>
              </div>
            </RadioGroup>
          </div>
          
          <div className="text-sm text-gray-600">
            <p>Selected families ({selectedFamilies.length}):</p>
            <ul className="mt-1 ml-4">
              {selectedFamilies.map(family => (
                <li key={family.id} className="list-disc">{family.name}: {family.id}</li>
              ))}
            </ul>
          </div>
          
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleExport}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? 'Exporting...' : 'Export'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
