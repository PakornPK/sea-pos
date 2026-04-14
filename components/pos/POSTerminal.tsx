'use client'

import { useEffect, useState, useActionState, useTransition, useRef } from 'react'
import Image from 'next/image'
import {
  Search, ShoppingCart, Plus, Minus, Trash2, ImageOff, Info,
  ChevronLeft, ChevronRight, Loader2,
} from 'lucide-react'
import { ProductDetailDialog } from '@/components/pos/ProductDetailDialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { createSale, searchInStockProducts, findProductByCode } from '@/lib/actions/pos'
import { holdSale } from '@/lib/actions/heldSales'
import { formatBaht } from '@/lib/format'
import { CustomerPicker, type PickerCustomer } from '@/components/customers/CustomerPicker'
import { HeldSalesDrawer } from '@/components/pos/HeldSalesDrawer'
import { PAYMENT_LABEL, type PaymentMethod } from '@/lib/labels'
import type { HeldSale, ProductWithStock } from '@/types/database'
import { computeVat, type VatConfig } from '@/lib/vat'
import { lineTotal } from '@/lib/money'

type CartItem = {
  productId:  string
  name:       string
  price:      number
  quantity:   number
  vatExempt:  boolean
}

type POSTerminalProps = {
  initialProducts: ProductWithStock[]
  initialTotal:    number
  initialPage:     number
  pageSize:        number
  customers:       PickerCustomer[]
  vatConfig:       VatConfig
}

/** Build a compact page list with ellipsis: [1, …, 4, 5, 6, …, 12]. */
function buildPageList(current: number, total: number): Array<number | '…'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const set = new Set<number>([1, total, current, current - 1, current + 1])
  const pages = [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b)
  const out: Array<number | '…'> = []
  for (let i = 0; i < pages.length; i++) {
    if (i > 0 && pages[i] - pages[i - 1] > 1) out.push('…')
    out.push(pages[i])
  }
  return out
}

const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string }> =
  (Object.keys(PAYMENT_LABEL) as PaymentMethod[]).map((value) => ({
    value,
    label: PAYMENT_LABEL[value],
  }))

export function POSTerminal({
  initialProducts, initialTotal, initialPage, pageSize, customers, vatConfig,
}: POSTerminalProps) {
  // ── Cart (unchanged — user loves this part) ────────────────────
  const [cart, setCart] = useState<CartItem[]>([])
  const [payment, setPayment] = useState('cash')
  const [customer, setCustomer] = useState<PickerCustomer | null>(null)
  const [detailProduct, setDetailProduct] = useState<ProductWithStock | null>(null)
  const [state, formAction, isPending] = useActionState(createSale, undefined)

  // ── Server-driven product grid ─────────────────────────────────
  const [products, setProducts] = useState<ProductWithStock[]>(initialProducts)
  const [total, setTotal]       = useState(initialTotal)
  const [page, setPage]         = useState(initialPage)
  const [search, setSearch]     = useState('')
  const [loading, startLoading] = useTransition()

  // ── Barcode / SKU scan ─────────────────────────────────────────
  // Keyboard-wedge scanners type the SKU then press Enter. The search input
  // IS the scan target — we auto-focus it on mount and after each add-to-cart
  // so consecutive scans work without the cashier touching the screen.
  const searchRef = useRef<HTMLInputElement>(null)
  const [scanState, setScanState] = useState<'idle' | 'hit' | 'miss'>('idle')
  useEffect(() => { searchRef.current?.focus() }, [])
  useEffect(() => {
    if (scanState === 'idle') return
    const t = setTimeout(() => setScanState('idle'), 600)
    return () => clearTimeout(t)
  }, [scanState])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  // Debounced refetch on search change; immediate fetch on page change.
  useEffect(() => {
    const handle = setTimeout(() => {
      startLoading(async () => {
        const res = await searchInStockProducts({ page, search: search.trim() })
        setProducts(res.rows)
        setTotal(res.totalCount)
      })
    }, search ? 250 : 0)
    return () => clearTimeout(handle)
  }, [page, search])

  function goPrev() { if (page > 1) setPage(page - 1) }
  function goNext() { if (page < totalPages) setPage(page + 1) }

  // Reset to page 1 when search changes
  function onSearchChange(v: string) {
    setSearch(v)
    setPage(1)
  }

  // ── Held sales ─────────────────────────────────────────────────
  const [holding, setHolding] = useState(false)
  const [heldRefresh, setHeldRefresh] = useState(0)
  async function handleHold() {
    if (cart.length === 0 || holding) return
    const note = window.prompt('ใส่ชื่อบิล (ถ้ามี) — เช่น "คุณสมชาย" หรือ "โต๊ะ 3"', '')
    if (note === null) return  // cancelled
    setHolding(true)
    try {
      const fd = new FormData()
      fd.append('items',      JSON.stringify(cart))
      fd.append('customerId', customer?.id ?? '')
      fd.append('note',       note.trim())
      const res = await holdSale(undefined, fd)
      if (res?.error) {
        alert(res.error)
        return
      }
      // Success — blank the live cart so the cashier can serve the next
      // customer, and tell the drawer to refetch its list + count.
      setCart([])
      setCustomer(null)
      setHeldRefresh((n) => n + 1)
    } finally {
      setHolding(false)
    }
  }

  function handleResume(snapshot: HeldSale) {
    setCart(
      snapshot.items.map((i) => ({
        productId: i.productId,
        name:      i.name,
        price:     i.price,
        quantity:  i.quantity,
        vatExempt: Boolean(i.vatExempt),
      })),
    )
    // Customer on the held bill is re-selected from the picker list if present.
    const c = snapshot.customer_id
      ? customers.find((x) => x.id === snapshot.customer_id) ?? null
      : null
    setCustomer(c)
  }

  // Enter in search = scan commit. Look up exact SKU at the active branch;
  // on hit, add to cart and clear. On miss, flash red but keep the term so
  // the cashier can see what was typed and correct it.
  async function onSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    // Read from the DOM — scanners fire 13 chars + Enter faster than React
    // commits state, so `search` can still be stale at this point.
    const term = (e.currentTarget.value ?? search).trim()
    if (!term) return
    const product = await findProductByCode(term)
    if (product) {
      addToCart(product)
      setSearch('')
      setPage(1)
      setScanState('hit')
    } else {
      setScanState('miss')
    }
    searchRef.current?.focus()
  }

  // ── Cart handlers ──────────────────────────────────────────────
  function addToCart(product: ProductWithStock) {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id)
      if (existing) {
        if (existing.quantity >= product.stock) return prev
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      if (product.stock < 1) return prev
      return [
        ...prev,
        {
          productId: product.id,
          name:      product.name,
          price:     product.price,
          quantity:  1,
          vatExempt: Boolean(product.vat_exempt),
        },
      ]
    })
  }

  function updateQty(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((i) => (i.productId === productId ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    )
  }

  function removeItem(productId: string) {
    setCart((prev) => prev.filter((i) => i.productId !== productId))
  }

  const totalQty = cart.reduce((s, i) => s + i.quantity, 0)
  const breakdown = computeVat(
    cart.map((i) => ({ price: i.price, quantity: i.quantity, vatExempt: i.vatExempt })),
    vatConfig,
  )
  const showVatRow = vatConfig.mode !== 'none' && breakdown.vatAmount > 0

  return (
    <div className="flex h-full gap-4 overflow-hidden">
      {/* ── Product grid ──────────────────────────────────────── */}
      <div className="flex flex-1 flex-col gap-3 overflow-hidden">
        {/* Search */}
        <div className="relative shrink-0">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          {/*
            Native <input> instead of our shadcn/base-ui Input wrapper — the
            wrapper's built-in key handling eats Enter before our onKeyDown
            fires, so barcode scanners never commit the scan.
          */}
          <input
            ref={searchRef}
            type="text"
            placeholder="ค้นหาสินค้า หรือ สแกน SKU / บาร์โค้ด แล้วกด Enter"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={onSearchKeyDown}
            className={cn(
              'flex h-8 w-full rounded-lg border border-input bg-transparent pl-9 pr-3 py-1 text-base md:text-sm placeholder:text-muted-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
              scanState === 'hit'  && 'border-emerald-500 ring-1 ring-emerald-500',
              scanState === 'miss' && 'border-destructive ring-1 ring-destructive',
            )}
          />
          {scanState === 'miss' && (
            <p className="absolute -bottom-5 left-1 text-xs text-destructive">
              ไม่พบ SKU หรือสินค้าหมดสต๊อก
            </p>
          )}
        </div>

        {/* Grid — big tap-friendly tiles */}
        <div
          className="relative grid flex-1 auto-rows-min grid-cols-3 gap-3 overflow-y-auto content-start md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
          style={{ scrollbarGutter: 'stable' }}
        >
          {loading && (
            <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-background/40 backdrop-blur-[1px]">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}

          {products.map((product, idx) => {
            const inCart = cart.find((i) => i.productId === product.id)
            const inCartQty = inCart?.quantity ?? 0
            const lowStock = product.stock <= product.min_stock
            return (
              <div
                key={product.id}
                className={cn(
                  'relative flex h-36 flex-col overflow-hidden rounded-lg border bg-card transition-colors',
                  inCartQty > 0
                    ? 'border-primary bg-primary/5'
                    : 'hover:border-primary/50 hover:bg-accent'
                )}
              >
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setDetailProduct(product) }}
                  aria-label="ดูรายละเอียด"
                  className="absolute right-1.5 top-1.5 z-10 grid h-6 w-6 place-items-center rounded-full bg-background/80 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:bg-background hover:text-primary"
                >
                  <Info className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => addToCart(product)}
                  className="flex h-full w-full flex-col text-left"
                >
                  <div className="relative h-20 shrink-0 bg-muted">
                    {product.image_url ? (
                      <Image
                        src={product.image_url}
                        alt={product.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 16vw"
                        unoptimized
                        priority={idx < 12}
                      />
                    ) : (
                      <div className="absolute inset-0 grid place-items-center">
                        <ImageOff className="h-6 w-6 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col justify-between p-2 min-w-0">
                    <p className="line-clamp-2 text-xs font-medium leading-tight break-words">
                      {product.name}
                    </p>
                    <div className="flex items-center justify-between gap-1 min-w-0">
                      <span className="truncate text-sm font-semibold tabular-nums">
                        {formatBaht(product.price)}
                      </span>
                      <Badge
                        variant={lowStock ? 'destructive' : 'outline'}
                        className="shrink-0 whitespace-nowrap text-[10px] px-1.5 py-0"
                      >
                        {inCartQty > 0 ? `${inCartQty}/${product.stock}` : product.stock}
                      </Badge>
                    </div>
                  </div>
                </button>
              </div>
            )
          })}

          {!loading && products.length === 0 && (
            <p className="col-span-full py-12 text-center text-sm text-muted-foreground">
              ไม่พบสินค้า
            </p>
          )}
        </div>

        {/* Pagination */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-md border bg-card px-3 py-2">
          <span className="text-xs text-muted-foreground tabular-nums">
            หน้า {page} / {totalPages} · {total} รายการ
          </span>
          <div className="flex items-center gap-1">
            <Button
              type="button" size="sm" variant="outline"
              onClick={goPrev} disabled={page <= 1 || loading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {buildPageList(page, totalPages).map((item, idx) =>
              item === '…' ? (
                <span key={`gap-${idx}`} className="px-1.5 text-xs text-muted-foreground">…</span>
              ) : (
                <Button
                  key={item}
                  type="button" size="sm"
                  variant={item === page ? 'default' : 'outline'}
                  onClick={() => setPage(item)}
                  disabled={loading}
                  className="min-w-8 px-2 tabular-nums"
                >
                  {item}
                </Button>
              )
            )}
            <Button
              type="button" size="sm" variant="outline"
              onClick={goNext} disabled={page >= totalPages || loading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Cart (unchanged structure) ────────────────────────── */}
      <div className="flex w-80 shrink-0 flex-col overflow-hidden rounded-xl border bg-card">
        {/* Header */}
        <div className="flex shrink-0 items-center gap-2 border-b px-4 py-3">
          <ShoppingCart className="h-4 w-4" />
          <span className="font-semibold">รายการสั่ง</span>
          {totalQty > 0 && <Badge className="text-xs">{totalQty} รายการ</Badge>}
          <div className="ml-auto">
            <HeldSalesDrawer
              onResume={handleResume}
              currentCartHasItems={cart.length > 0}
              refreshKey={heldRefresh}
            />
          </div>
        </div>

        {/* Items */}
        <div className="flex-1 space-y-3 overflow-y-auto p-3">
          {cart.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              กดเลือกสินค้าทางซ้าย
            </p>
          ) : (
            cart.map((item) => (
              <div key={item.productId} className="space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="flex-1 text-sm font-medium leading-snug">{item.name}</p>
                  <button
                    onClick={() => removeItem(item.productId)}
                    className="mt-0.5 shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQty(item.productId, -1)}
                      className="flex h-6 w-6 items-center justify-center rounded border hover:bg-accent"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-7 text-center text-sm tabular-nums">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item.productId, 1)}
                      className="flex h-6 w-6 items-center justify-center rounded border hover:bg-accent"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <span className="text-sm font-medium tabular-nums">
                    {formatBaht(lineTotal(item.price, item.quantity))}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Checkout */}
        <div className="shrink-0 space-y-3 border-t p-4">
          {showVatRow && (
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>ยอดก่อน VAT</span>
                <span className="tabular-nums">{formatBaht(breakdown.subtotalExVat)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>VAT {vatConfig.rate}%</span>
                <span className="tabular-nums">{formatBaht(breakdown.vatAmount)}</span>
              </div>
            </div>
          )}
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">รวมทั้งสิ้น</span>
            <span className="text-2xl font-bold tabular-nums">{formatBaht(breakdown.total)}</span>
          </div>

          <Separator />

          <form action={formAction} className="space-y-3">
            <input type="hidden" name="cart" value={JSON.stringify(cart)} />
            <input type="hidden" name="paymentMethod" value={payment} />
            <input type="hidden" name="customerId" value={customer?.id ?? ''} />

            <CustomerPicker
              customers={customers}
              selected={customer}
              onChange={setCustomer}
            />

            <div className="grid grid-cols-3 gap-1.5">
              {PAYMENT_METHODS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPayment(value)}
                  className={cn(
                    'rounded-md border py-2 text-xs font-medium transition-colors',
                    payment === value
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'hover:bg-accent'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {state?.error && (
              <p className="text-center text-xs text-destructive">{state.error}</p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={cart.length === 0 || isPending}
            >
              {isPending ? 'กำลังบันทึก...' : 'ชำระเงิน'}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={cart.length === 0 || isPending || holding}
              onClick={handleHold}
            >
              {holding ? 'กำลังพัก...' : 'พักบิล'}
            </Button>

            {cart.length > 0 && (
              <button
                type="button"
                onClick={() => setCart([])}
                className="w-full py-1 text-center text-xs text-muted-foreground hover:text-destructive"
              >
                ล้างรายการทั้งหมด
              </button>
            )}
          </form>
        </div>
      </div>

      <ProductDetailDialog
        product={detailProduct}
        category={null}
        open={detailProduct !== null}
        onOpenChange={(open) => { if (!open) setDetailProduct(null) }}
        onAddToCart={addToCart}
        inCartQty={detailProduct ? cart.find((i) => i.productId === detailProduct.id)?.quantity ?? 0 : 0}
      />
    </div>
  )
}
