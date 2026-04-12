'use client'

import { useTransition } from 'react'
import { adjustStock } from '@/lib/actions/inventory'
import { Button } from '@/components/ui/button'

type StockAdjustButtonProps = {
  productId: string
  delta: number
  disabled?: boolean
}

export function StockAdjustButton({ productId, delta, disabled }: StockAdjustButtonProps) {
  const [pending, startTransition] = useTransition()

  function handleClick() {
    startTransition(() => {
      adjustStock(productId, delta)
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
