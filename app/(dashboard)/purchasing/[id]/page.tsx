import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { requirePageRole } from '@/lib/auth'
import {
  purchaseOrderRepo, supplierRepo, productRepo, categoryRepo, branchRepo, companyRepo, userRepo,
} from '@/lib/repositories'
import { getVatConfig, computeVat } from '@/lib/vat'
import { POForm } from '@/components/purchasing/POForm'
import { POActions } from '@/components/purchasing/POActions'
import { POSignature } from '@/components/purchasing/POSignature'
import { ReceiveForm, type ReceiveLine } from '@/components/purchasing/ReceiveForm'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatPoNo, formatDateTime, formatBaht } from '@/lib/format'
import { lineTotal } from '@/lib/money'
import { PO_STATUS_LABEL, PO_STATUS_VARIANT } from '@/lib/labels'
import type { PurchaseOrderStatus } from '@/types/database'

export const metadata: Metadata = {
  title: 'ใบสั่งซื้อ | SEA-POS',
}

export default async function PODetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { me } = await requirePageRole(['admin', 'manager', 'purchasing'])

  const [po, items, suppliers, products, categories, company] = await Promise.all([
    purchaseOrderRepo.getById(id),
    purchaseOrderRepo.listItemsWithProduct(id),
    supplierRepo.list(),
    productRepo.listAll(),
    categoryRepo.list(),
    companyRepo.getCurrent(),
  ])
  const vatConfig = getVatConfig(company)

  if (!po) notFound()
  const supplier = suppliers.find((s) => s.id === po.supplier_id)
  const [branch, companyUsers] = await Promise.all([
    po.branch_id ? branchRepo.getById(po.branch_id) : Promise.resolve(null),
    me.companyId ? userRepo.listByCompany(me.companyId) : Promise.resolve([]),
  ])

  function userName(u: { first_name: string | null; last_name: string | null; full_name: string | null }) {
    return [u.first_name, u.last_name].filter(Boolean).join(' ') || u.full_name || null
  }

  const PURCHASING_ROLES = new Set(['admin', 'manager', 'purchasing'])
  const signerOptions = companyUsers
    .filter((u) => PURCHASING_ROLES.has(u.role) || u.id === po.user_id)
    .map((u) => ({
      id: u.id,
      name: userName(u),
      email: u.email,
    }))

  // For confirmed/received POs, lock the signature to whoever approved it.
  const confirmedByUser = po.confirmed_by_user_id
    ? companyUsers.find((u) => u.id === po.confirmed_by_user_id) ?? null
    : null
  const lockedSignerName = confirmedByUser ? userName(confirmedByUser) : null

  const isDraft    = po.status === 'draft'
  const isOrdered  = po.status === 'ordered'

  // Auto-recalc on VAT config drift for drafts. When a company flips vat_mode
  // or vat_rate after a PO was drafted, the stored breakdown goes stale. Rather
  // than a manual button, we silently recompute with the current config on
  // read and persist if the numbers moved. Ordered/received/cancelled POs are
  // frozen — historical accuracy trumps live recompute.
  if (isDraft && items.length > 0) {
    const exemptMap = await productRepo.vatExemptMap(items.map((i) => i.product_id))
    const expected = computeVat(
      items.map((i) => ({
        price:     Number(i.unit_cost),
        quantity:  i.quantity_ordered,
        vatExempt: Boolean(exemptMap[i.product_id]),
      })),
      vatConfig,
    )
    const drifted =
      Math.abs(expected.total         - Number(po.total_amount))    > 0.005 ||
      Math.abs(expected.subtotalExVat - Number(po.subtotal_ex_vat)) > 0.005 ||
      Math.abs(expected.vatAmount     - Number(po.vat_amount))      > 0.005
    if (drifted) {
      await purchaseOrderRepo.updateHeader(po.id, {
        supplier_id:     po.supplier_id,
        notes:           po.notes,
        total_amount:    expected.total,
        subtotal_ex_vat: expected.subtotalExVat,
        vat_amount:      expected.vatAmount,
      })
      // Reflect the persisted values in this render without a round-trip.
      po.total_amount    = expected.total
      po.subtotal_ex_vat = expected.subtotalExVat
      po.vat_amount      = expected.vatAmount
    }
  }

  // Initial lines for edit form
  const initialLines = items.map((i) => ({
    productId: i.product_id,
    quantity:  i.quantity_ordered,
    unitCost:  Number(i.unit_cost),
  }))

  // Receive lines
  const receiveLines: ReceiveLine[] = items.map((i) => {
    const prod = Array.isArray(i.product) ? i.product[0] : i.product
    return {
      itemId:       i.id,
      productName:  prod?.name ?? '—',
      productSku:   prod?.sku ?? null,
      ordered:      i.quantity_ordered,
      received:     i.quantity_received,
      poUnit:       prod?.po_unit ?? null,
      poConversion: prod?.po_conversion ?? 1,
    }
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/purchasing"
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'print:hidden')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-[26px] font-bold tracking-tight font-mono">
                {formatPoNo(po.po_no)}
              </h1>
              <Badge variant={PO_STATUS_VARIANT[po.status as PurchaseOrderStatus]}>
                {PO_STATUS_LABEL[po.status as PurchaseOrderStatus]}
              </Badge>
              {branch && (
                <span className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2 py-0.5 text-xs">
                  📍 {branch.name}
                  <span className="text-muted-foreground">({branch.code})</span>
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              สร้างเมื่อ {formatDateTime(po.created_at)}
              {branch && <> · สต๊อกจะเข้าที่สาขา <b>{branch.name}</b></>}
            </p>
          </div>
        </div>
        <POActions id={po.id} status={po.status} />
      </div>

      {/* Summary card */}
      <div className="rounded-2xl bg-card shadow-sm ring-1 ring-border/60 p-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">ผู้จำหน่าย</p>
          <p className="font-medium mt-1">{supplier?.name ?? '—'}</p>
          {supplier?.contact_name && (
            <p className="text-xs text-muted-foreground">{supplier.contact_name}</p>
          )}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">สั่งซื้อเมื่อ</p>
          <p className="font-medium mt-1">{formatDateTime(po.ordered_at)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">รับของเมื่อ</p>
          <p className="font-medium mt-1">{formatDateTime(po.received_at)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">ยอดรวม</p>
          <p className="text-xl font-bold tabular-nums mt-1">
            {formatBaht(po.total_amount)}
          </p>
          {po.vat_amount > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
              (ก่อน VAT {formatBaht(po.subtotal_ex_vat)} · VAT ซื้อ {formatBaht(po.vat_amount)})
            </p>
          )}
        </div>
      </div>

      {po.notes && (
        <div className="rounded-xl bg-muted/40 px-4 py-3 text-[14px]">
          <span className="text-muted-foreground">หมายเหตุ:</span> {po.notes}
        </div>
      )}

      {/* Body: edit form for drafts, read-only lines for other statuses */}
      {isDraft ? (
        <div className="print:hidden">
          <h2 className="text-[15px] font-semibold tracking-tight mb-3">แก้ไขใบสั่งซื้อ</h2>
          <POForm
            suppliers={suppliers}
            products={products}
            categories={categories}
            vatConfig={vatConfig}
            initial={{
              id: po.id,
              supplierId: po.supplier_id,
              notes: po.notes,
              lines: initialLines,
            }}
          />
        </div>
      ) : (
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight mb-3">รายการสินค้า</h2>
          <div className="rounded-2xl overflow-hidden bg-card shadow-sm ring-1 ring-border/60">
            <table className="w-full text-[14px]">
              <thead className="border-b border-border/60 bg-muted/20 text-left">
                <tr>
                  <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">สินค้า</th>
                  <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground text-right w-20">สั่ง</th>
                  <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground w-16">หน่วย</th>
                  <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground text-right w-24">รับแล้ว</th>
                  <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground text-right w-32">ราคาทุน/หน่วย</th>
                  <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground text-right w-32">รวม</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => {
                  const prod = Array.isArray(i.product) ? i.product[0] : i.product
                  const poUnit = prod?.po_unit || prod?.unit || null
                  const hasConversion = prod?.po_unit && prod.po_conversion && prod.po_conversion !== 1
                  return (
                    <tr key={i.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2.5">
                        <div className="font-medium">{prod?.name ?? '—'}</div>
                        {prod?.sku && (
                          <div className="text-[12px] text-muted-foreground">{prod.sku}</div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{i.quantity_ordered}</td>
                      <td className="px-3 py-2.5 text-sm text-muted-foreground">
                        {poUnit ?? '—'}
                        {hasConversion && (
                          <div className="text-[10px]">×{prod!.po_conversion} {prod!.unit}</div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {i.quantity_received}
                        {i.quantity_received < i.quantity_ordered && (
                          <span className="text-destructive ml-1">
                            (-{i.quantity_ordered - i.quantity_received})
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {formatBaht(i.unit_cost)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {formatBaht(lineTotal(i.unit_cost, i.quantity_ordered))}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="border-t border-border/60 bg-muted/20 text-[14px]">
                {po.vat_amount > 0 ? (
                  <>
                    <tr className="text-muted-foreground">
                      <td colSpan={4} className="px-3 py-1.5 text-right text-[12px]">ยอดก่อน VAT</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-[12px]">
                        {formatBaht(po.subtotal_ex_vat)}
                      </td>
                    </tr>
                    <tr className="text-muted-foreground">
                      <td colSpan={4} className="px-3 py-1.5 text-right text-[12px]">VAT ซื้อ</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-[12px]">
                        {formatBaht(po.vat_amount)}
                      </td>
                    </tr>
                    <tr className="border-t border-border/60">
                      <td colSpan={4} className="px-3 py-2.5 text-right font-medium">รวมทั้งสิ้น</td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-semibold">
                        {formatBaht(po.total_amount)}
                      </td>
                    </tr>
                  </>
                ) : (
                  <tr>
                    <td colSpan={4} className="px-3 py-2.5 text-right font-medium">ยอดรวม</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-semibold">
                      {formatBaht(po.total_amount)}
                    </td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Receive UI: only when status = ordered */}
      {isOrdered && (
        <div className="print:hidden">
          <h2 className="text-[15px] font-semibold tracking-tight mb-3">รับของ</h2>
          <ReceiveForm id={po.id} lines={receiveLines} />
        </div>
      )}

      <POSignature
        poId={po.id}
        creatorId={po.user_id}
        signerOptions={signerOptions}
        lockedSignerName={lockedSignerName}
      />
    </div>
  )
}
