'use client'

import { useState, useTransition } from 'react'
import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'
import { runSubscriptionTick } from '@/lib/actions/billing'
import { Button } from '@/components/ui/button'
import type { TickResult } from '@/lib/actions/billing'

export function SubscriptionTickButton() {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<TickResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    setResult(null)
    setError(null)
    startTransition(async () => {
      const res = await runSubscriptionTick()
      if (res.error) {
        setError(res.error)
      } else {
        setResult(res.data)
      }
    })
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Button
        size="sm"
        variant="outline"
        onClick={handleClick}
        disabled={pending}
        className="gap-1.5"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${pending ? 'animate-spin' : ''}`} />
        {pending ? 'กำลังประมวลผล...' : 'Run subscription tick'}
      </Button>

      {result && (
        <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
          <span>
            ประมวลผล {result.processed} รายการ ·
            past_due {result.newly_past_due} ·
            suspended {result.newly_suspended}
          </span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1.5 text-[12px] text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
