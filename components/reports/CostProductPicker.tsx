'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'

type Option = { id: string; name: string; sku: string }

type Props = {
  products: Option[]
  currentId: string | null
}

export function CostProductPicker({ products, currentId }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  function handleChange(id: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (id) params.set('cost_product', id)
    else params.delete('cost_product')
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  return (
    <select
      value={currentId ?? ''}
      onChange={(e) => handleChange(e.target.value)}
      className="h-9 rounded-xl border border-input bg-background px-3 text-sm min-w-[220px] focus:outline-none focus:ring-2 focus:ring-ring"
    >
      <option value="">— เลือกสินค้า —</option>
      {products.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}{p.sku ? ` (${p.sku})` : ''}
        </option>
      ))}
    </select>
  )
}
