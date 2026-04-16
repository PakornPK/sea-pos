'use client'

import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { PlatformInvoice } from '@/types/database'

function fmt(n: number) {
  return n.toLocaleString('th-TH', { minimumFractionDigits: 2 })
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('th-TH', { dateStyle: 'long' })
}

export function InvoicePrint({ invoice }: { invoice: PlatformInvoice }) {
  return (
    <>
      {/* Print button — hidden when printing */}
      <div className="print:hidden mb-6 flex items-center gap-3">
        <Button onClick={() => window.print()} variant="outline">
          <Printer className="h-4 w-4" />
          พิมพ์ / บันทึก PDF
        </Button>
        {invoice.status === 'void' && (
          <Badge variant="destructive">ยกเลิกแล้ว</Badge>
        )}
      </div>

      {/* A4 invoice sheet */}
      <div
        className={cn(
          'mx-auto bg-white text-gray-900 font-sans',
          'w-full max-w-[210mm] min-h-[297mm]',
          'p-10 shadow-lg print:shadow-none print:p-8',
          invoice.status === 'void' && 'opacity-60',
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-[22px] font-bold tracking-tight">{invoice.seller_name}</h1>
            {invoice.seller_tax_id && (
              <p className="text-[13px] text-gray-500 mt-0.5">เลขผู้เสียภาษี: {invoice.seller_tax_id}</p>
            )}
            {invoice.seller_address && <p className="text-[13px] text-gray-500">{invoice.seller_address}</p>}
            {invoice.seller_phone && <p className="text-[13px] text-gray-500">โทร: {invoice.seller_phone}</p>}
            {invoice.seller_email && <p className="text-[13px] text-gray-500">อีเมล: {invoice.seller_email}</p>}
          </div>
          <div className="text-right">
            <div className="text-[11px] text-gray-400 uppercase tracking-widest mb-1">ใบกำกับภาษีเต็มรูปแบบ</div>
            <div className="text-[24px] font-bold font-mono tracking-tight">{invoice.invoice_no}</div>
            <div className="text-[13px] text-gray-500 mt-1">วันที่: {fmtDate(invoice.issued_at)}</div>
            {invoice.due_at && (
              <div className="text-[13px] text-gray-500">ครบกำหนด: {fmtDate(invoice.due_at)}</div>
            )}
            {invoice.status === 'void' && (
              <div className="mt-2 text-[13px] font-bold text-red-600 border border-red-400 rounded px-2 py-0.5">
                ยกเลิกแล้ว
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <hr className="border-gray-200 mb-6" />

        {/* Buyer */}
        <div className="mb-6">
          <div className="text-[11px] text-gray-400 uppercase tracking-widest mb-1">ผู้ซื้อ / ลูกค้า</div>
          <p className="font-semibold text-[15px]">{invoice.buyer_name}</p>
          {invoice.buyer_tax_id && <p className="text-[13px] text-gray-500">เลขผู้เสียภาษี: {invoice.buyer_tax_id}</p>}
          {invoice.buyer_address && <p className="text-[13px] text-gray-500">{invoice.buyer_address}</p>}
          {invoice.buyer_contact_email && <p className="text-[13px] text-gray-500">อีเมล: {invoice.buyer_contact_email}</p>}
          {invoice.buyer_contact_phone && <p className="text-[13px] text-gray-500">โทร: {invoice.buyer_contact_phone}</p>}
        </div>

        {/* Line items */}
        <table className="w-full text-[13px] mb-6">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="pb-2 text-left font-semibold text-gray-600 w-8">#</th>
              <th className="pb-2 text-left font-semibold text-gray-600">รายการ</th>
              <th className="pb-2 text-right font-semibold text-gray-600 w-16">จำนวน</th>
              <th className="pb-2 text-right font-semibold text-gray-600 w-28">ราคาต่อหน่วย</th>
              <th className="pb-2 text-right font-semibold text-gray-600 w-28">จำนวนเงิน</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {invoice.lines.map((line, i) => (
              <tr key={i}>
                <td className="py-2 text-gray-400">{i + 1}</td>
                <td className="py-2">{line.description}</td>
                <td className="py-2 text-right tabular-nums">{line.qty}</td>
                <td className="py-2 text-right tabular-nums">฿{fmt(line.unit_price_baht)}</td>
                <td className="py-2 text-right tabular-nums font-medium">฿{fmt(line.amount_baht)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-6">
          <div className="w-64 space-y-1.5 text-[13px]">
            <div className="flex justify-between">
              <span className="text-gray-500">ยอดก่อน VAT</span>
              <span className="tabular-nums font-medium">฿{fmt(invoice.subtotal_baht)}</span>
            </div>
            {invoice.vat_rate_pct > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">VAT ({invoice.vat_rate_pct}%)</span>
                <span className="tabular-nums">฿{fmt(invoice.vat_baht)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-gray-200 pt-1.5">
              <span className="font-bold text-[15px]">ยอดรวมทั้งสิ้น</span>
              <span className="tabular-nums font-bold text-[15px]">฿{fmt(invoice.total_baht)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="text-[12px] text-gray-500 border-t border-gray-100 pt-4">
            <span className="font-medium">หมายเหตุ:</span> {invoice.notes}
          </div>
        )}
        {invoice.void_reason && (
          <div className="text-[12px] text-red-500 border-t border-gray-100 pt-4">
            <span className="font-medium">เหตุผลการยกเลิก:</span> {invoice.void_reason}
          </div>
        )}

        {/* Footer */}
        <div className="mt-16 grid grid-cols-2 gap-8 text-[12px] text-gray-400">
          <div className="border-t border-gray-200 pt-2 text-center">ลายมือชื่อผู้รับเงิน</div>
          <div className="border-t border-gray-200 pt-2 text-center">ลายมือชื่อผู้จ่ายเงิน</div>
        </div>
      </div>
    </>
  )
}
