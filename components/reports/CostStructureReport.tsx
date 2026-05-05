'use client'

import { useState, useEffect } from 'react'
import { productRepo, productCostItemRepo, optionRepo } from '@/lib/repositories'
import { formatBaht } from '@/lib/format'
import { CostProductPicker } from '@/components/reports/CostProductPicker'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import type { Product } from '@/types/database'
import type { ProductCostItem } from '@/types/database'

type OptionGroupWithOptions = Awaited<ReturnType<typeof optionRepo.listForProduct>>[number]

interface Props {
  selectedProductId: string | null
}

export function CostStructureReport({ selectedProductId }: Props) {
  const [products, setProducts] = useState<Product[]>([])
  const [costItems, setCostItems] = useState<ProductCostItem[]>([])
  const [optionGroups, setOptionGroups] = useState<OptionGroupWithOptions[]>([])

  useEffect(() => {
    productRepo.listAll().then(setProducts).catch(() => {})
  }, [])

  useEffect(() => {
    if (!products.length) return
    productCostItemRepo.listForProducts(products.map((p) => p.id)).then(setCostItems).catch(() => {})
  }, [products])

  useEffect(() => {
    if (!selectedProductId) { setOptionGroups([]); return }
    optionRepo.listForProduct(selectedProductId).then(setOptionGroups).catch(() => {})
  }, [selectedProductId])

  const itemsByProduct = new Map<string, ProductCostItem[]>()
  for (const item of costItems) {
    const list = itemsByProduct.get(item.product_id) ?? []
    list.push(item)
    itemsByProduct.set(item.product_id, list)
  }

  const productCostMap = new Map(products.map((p) => [p.id, p.cost]))
  const productNameMap = new Map(products.map((p) => [p.id, p.name]))
  const sortedProducts = [...products].sort((a, b) => a.name.localeCompare(b.name, 'th'))

  const selected = selectedProductId
    ? (products.find((p) => p.id === selectedProductId) ?? null)
    : null

  const selectedItems = selected ? (itemsByProduct.get(selected.id) ?? []) : []
  const hasBom = selectedItems.length > 0
  const groupsWithLinks = optionGroups

  return (
    <div className="rounded-2xl bg-card shadow-sm ring-1 ring-border/60 p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h3 className="font-semibold text-sm">โครงสร้างต้นทุนสินค้า (BOM)</h3>
        <CostProductPicker
          products={sortedProducts.map((p) => ({ id: p.id, name: p.name, sku: p.sku }))}
          currentId={selectedProductId}
        />
      </div>

      {!selected ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          เลือกสินค้าด้านบนเพื่อดูโครงสร้างต้นทุน
        </p>
      ) : (!hasBom && groupsWithLinks.length === 0) ? (
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{selected.name}</span> ยังไม่ได้กำหนดส่วนประกอบต้นทุน
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            ตั้งค่าได้ที่หน้าแก้ไขสินค้า → ส่วน &quot;โครงสร้างต้นทุน&quot; หรือ &quot;ตัวเลือกสินค้า&quot;
          </p>
        </div>
      ) : (() => {
        const bomTotal = selectedItems.reduce((acc, it) => acc + it.quantity * it.unit_cost, 0)
        const requiredGroups = groupsWithLinks.filter((g) => g.required)
        let minMargin: number | null = null
        let maxMargin: number | null = null
        if (requiredGroups.length > 0 && selected.price > 0) {
          for (const g of requiredGroups) {
            for (const o of g.options) {
              const ingCost = o.linked_product_id
                ? (productCostMap.get(o.linked_product_id) ?? 0) * (o.quantity_per_use ?? 1)
                : 0
              const totalCost = bomTotal + ingCost
              const sellPrice = selected.price + (o.price_delta ?? 0)
              const m = sellPrice > 0 ? ((sellPrice - totalCost) / sellPrice) * 100 : 0
              if (minMargin === null || m < minMargin) minMargin = m
              if (maxMargin === null || m > maxMargin) maxMargin = m
            }
          }
        } else if (selected.price > 0) {
          const m = ((selected.price - bomTotal) / selected.price) * 100
          minMargin = m
          maxMargin = m
        }
        const hasRange = minMargin !== null && maxMargin !== null && Math.abs(maxMargin - minMargin) > 0.01

        return (
          <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b">
              <div>
                <span className="font-semibold">{selected.name}</span>
                {selected.sku && (
                  <span className="ml-2 text-xs text-muted-foreground font-mono">{selected.sku}</span>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm tabular-nums flex-wrap">
                <span className="text-muted-foreground">
                  ราคาขาย {hasRange ? `${formatBaht(selected.price)}+` : formatBaht(selected.price)}
                </span>
                {hasBom && <span>BOM {formatBaht(bomTotal)}</span>}
                {minMargin !== null && maxMargin !== null && (
                  <span className={`font-semibold ${(minMargin > 0 ? minMargin : maxMargin) > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    Margin {hasRange ? `${minMargin.toFixed(1)}–${maxMargin.toFixed(1)}%` : `${maxMargin.toFixed(1)}%`}
                  </span>
                )}
              </div>
            </div>

            {hasBom && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  ต้นทุนคงที่ (BOM)
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ส่วนประกอบ</TableHead>
                      <TableHead className="text-right">จำนวน</TableHead>
                      <TableHead className="text-right">ราคาทุน/หน่วย</TableHead>
                      <TableHead className="text-right">รวม</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedItems.map((item) => {
                      const subtotal = item.quantity * item.unit_cost
                      const linkedName = item.linked_product_id
                        ? productNameMap.get(item.linked_product_id)
                        : null
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="text-sm">
                            {item.name}
                            {linkedName && linkedName !== item.name && (
                              <span className="ml-1.5 text-xs text-muted-foreground">({linkedName})</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-sm">
                            {item.quantity % 1 === 0 ? item.quantity : item.quantity.toFixed(3)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-sm">{formatBaht(item.unit_cost)}</TableCell>
                          <TableCell className="text-right tabular-nums text-sm font-medium">{formatBaht(subtotal)}</TableCell>
                        </TableRow>
                      )
                    })}
                    <TableRow className="border-t-2 font-semibold bg-muted/30">
                      <TableCell colSpan={3} className="text-sm">รวม BOM</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{formatBaht(bomTotal)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}

            {groupsWithLinks.length === 0 && (
              <p className="text-xs text-muted-foreground pt-2">ไม่มีตัวเลือก</p>
            )}
            {groupsWithLinks.map((group) => (
              <div key={group.id}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  ตัวเลือก: {group.name}
                  <span className="ml-2 normal-case font-normal">
                    ({group.required ? 'จำเป็น' : 'ไม่จำเป็น'} · {group.multi_select ? 'เลือกหลาย' : 'เลือกเดียว'})
                  </span>
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ตัวเลือก</TableHead>
                      <TableHead>วัตถุดิบ</TableHead>
                      <TableHead className="text-right">ปริมาณ</TableHead>
                      <TableHead className="text-right">ต้นทุน/หน่วย</TableHead>
                      <TableHead className="text-right">ต้นทุนตัวเลือก</TableHead>
                      <TableHead className="text-right">ต้นทุนรวม</TableHead>
                      <TableHead className="text-right">ราคาขาย</TableHead>
                      <TableHead className="text-right">Margin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.options.map((opt) => {
                      const unitCost = opt.linked_product_id
                        ? (productCostMap.get(opt.linked_product_id) ?? 0)
                        : 0
                      const ingCost = unitCost * (opt.quantity_per_use ?? 1)
                      const noCostConfigured = opt.linked_product_id && unitCost === 0
                      const totalWithOpt = bomTotal + ingCost
                      const sellPrice = selected.price + (opt.price_delta ?? 0)
                      const margin = sellPrice > 0 ? ((sellPrice - totalWithOpt) / sellPrice) * 100 : null
                      const marginColor = margin === null ? '' : margin > 0 ? 'text-emerald-600' : 'text-red-600'
                      const ingName = opt.linked_product_id ? productNameMap.get(opt.linked_product_id) : null
                      return (
                        <TableRow key={opt.id}>
                          <TableCell className="text-sm font-medium">{opt.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{ingName ?? '—'}</TableCell>
                          <TableCell className="text-right tabular-nums text-sm">
                            {opt.linked_product_id
                              ? ((opt.quantity_per_use ?? 1) % 1 === 0
                                ? opt.quantity_per_use ?? 1
                                : (opt.quantity_per_use ?? 1).toFixed(3))
                              : '—'}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-sm">
                            {opt.linked_product_id ? (
                              <span className={noCostConfigured ? 'text-amber-500' : ''}>
                                {formatBaht(unitCost)}
                                {noCostConfigured && <span className="ml-1 text-[10px]">(!)</span>}
                              </span>
                            ) : '—'}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-sm">
                            {opt.linked_product_id ? formatBaht(ingCost) : '—'}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-sm font-medium">
                            {formatBaht(totalWithOpt)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-sm">
                            {formatBaht(sellPrice)}
                            {opt.price_delta !== 0 && (
                              <span className="ml-1 text-[10px] text-muted-foreground">
                                ({opt.price_delta > 0 ? '+' : ''}{formatBaht(opt.price_delta)})
                              </span>
                            )}
                          </TableCell>
                          <TableCell className={`text-right tabular-nums text-sm font-semibold ${marginColor}`}>
                            {margin !== null ? `${margin.toFixed(1)}%` : '—'}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        )
      })()}
    </div>
  )
}
