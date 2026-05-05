'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { notFound } from 'next/navigation'
import { billingRepo } from '@/lib/repositories'
import { InvoicePrint } from '@/components/platform/InvoicePrint'
import type { PlatformInvoice } from '@/types/database'

export default function InvoicePage() {
  const id = useSearchParams().get('id') ?? ''

  const [invoice, setInvoice] = useState<PlatformInvoice | null | undefined>(undefined)

  useEffect(() => {
    if (!id) return
    billingRepo.getInvoice(id).then((inv) => setInvoice(inv ?? null))
  }, [id])

  if (invoice === undefined) return null  // loading
  if (!invoice) notFound()

  return <InvoicePrint invoice={invoice} />
}
