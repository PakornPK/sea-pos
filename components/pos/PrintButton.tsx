'use client'

import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'

type PrintButtonProps = {
  className?: string
}

export function PrintButton({ className }: PrintButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      className={className}
      onClick={() => window.print()}
    >
      <Printer className="h-4 w-4 mr-2" />
      พิมพ์ใบเสร็จ
    </Button>
  )
}
