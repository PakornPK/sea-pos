'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { FileText, Printer, XCircle } from 'lucide-react'
import { voidInvoice } from '@/lib/actions/billing'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { InvoiceListRow } from '@/lib/repositories'

function statusLabel(s: InvoiceListRow['status']): { label: string; variant: 'default' | 'outline' | 'destructive' | 'secondary' } {
  if (s === 'issued') return { label: 'ออกแล้ว', variant: 'default' }
  if (s === 'void')   return { label: 'ยกเลิก',  variant: 'destructive' }
  return { label: 'ร่าง', variant: 'outline' }
}

function VoidButton({ invoiceId }: { invoiceId: string }) {
  const [state, formAction, pending] = useActionState(voidInvoice, undefined)
  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={invoiceId} />
      <Button
        type="submit"
        size="sm"
        variant="ghost"
        disabled={pending}
        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 px-2"
        onClick={(e) => {
          if (!confirm('ยืนยันการยกเลิกใบกำกับภาษีนี้?')) e.preventDefault()
        }}
      >
        <XCircle className="h-3.5 w-3.5" />
        <span className="sr-only">ยกเลิก</span>
      </Button>
      {state?.error && <p className="text-[11px] text-destructive mt-1">{state.error}</p>}
    </form>
  )
}

export function InvoiceList({
  invoices,
  showCompany = true,
}: {
  invoices: InvoiceListRow[]
  showCompany?: boolean
}) {
  if (invoices.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-border/50 bg-muted/20 px-5 py-8 text-center text-[13px] text-muted-foreground">
        ยังไม่มีใบกำกับภาษี
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-card shadow-sm ring-1 ring-border/60 overflow-hidden">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-border/50 bg-muted/30">
            <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">เลขที่</th>
            {showCompany && <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">บริษัท</th>}
            <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">วันที่ออก</th>
            <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">ยอด</th>
            <th className="px-4 py-2.5 text-center font-medium text-muted-foreground">สถานะ</th>
            <th className="px-4 py-2.5 text-right font-medium text-muted-foreground"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {invoices.map((inv) => {
            const { label, variant } = statusLabel(inv.status)
            return (
              <tr key={inv.id} className={cn('hover:bg-muted/20', inv.status === 'void' && 'opacity-50')}>
                <td className="px-4 py-2.5 font-mono text-[12px]">
                  <Link href={`/platform/invoices/${inv.id}`} className="text-primary hover:underline">
                    {inv.invoice_no}
                  </Link>
                </td>
                {showCompany && <td className="px-4 py-2.5 truncate max-w-[160px]">{inv.buyer_name}</td>}
                <td className="px-4 py-2.5 tabular-nums text-muted-foreground">
                  {new Date(inv.issued_at).toLocaleDateString('th-TH', { dateStyle: 'medium' })}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                  ฿{inv.total_baht.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-2.5 text-center">
                  <Badge variant={variant} className="text-[11px]">{label}</Badge>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/platform/invoices/${inv.id}`} target="_blank">
                      <Button size="sm" variant="ghost" className="h-7 px-2">
                        <Printer className="h-3.5 w-3.5" />
                        <span className="sr-only">พิมพ์</span>
                      </Button>
                    </Link>
                    {inv.status !== 'void' && <VoidButton invoiceId={inv.id} />}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
