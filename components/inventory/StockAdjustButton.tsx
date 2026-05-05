'use client'

import { useTransition } from 'react'
import { adjustStock } from '@/lib/actions/inventory'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth-client'

type StockAdjustButtonProps = {
  productId:  string
  delta:      number
  disabled?:  boolean
  onAdjusted?: () => void
}

export function StockAdjustButton({ productId, delta, disabled, onAdjusted }: StockAdjustButtonProps) {
  const { user } = useAuth()
  const [pending, startTransition] = useTransition()

  function handleClick() {
    const branchId = user?.activeBranchId ?? ''
    const userId = user?.id ?? ''
    startTransition(async () => {
      await adjustStock(productId, delta, branchId, userId)
      onAdjusted?.()
    })
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={pending || disabled}
      className="h-7 w-7 p-0"
    >
      {delta > 0 ? '+' : '−'}
    </Button>
  )
}
