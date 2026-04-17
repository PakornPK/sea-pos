'use client'

import { useState } from 'react'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CSVImportWizard, type ImportType } from '@/components/import/CSVImportWizard'

export function ImportButton({ type }: { type: ImportType }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Upload className="mr-1 h-4 w-4" />
        นำเข้า CSV
      </Button>
      <CSVImportWizard type={type} open={open} onClose={() => setOpen(false)} />
    </>
  )
}
