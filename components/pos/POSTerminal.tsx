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
import type { HeldSaleListRow } from '@/lib/repositories'
import { computeVat, type VatConfig } from '@/lib/vat'
import { lineTotal } from '@/lib/money'

type CartItem = {
  productId:  string
  name:       string
  price:      number
  quantity:   number
  vatExempt:  boolean
  stock:      number   // -1 = untracked (infinite)
}

type POSTerminalProps = {
  initialProducts:  ProductWithStock[]
  initialTotal:     number
  initialPage:      number
  pageSize:         number
  customers:        PickerCustomer[]
  vatConfig:        VatConfig
  initialHeldSales: HeldSaleListRow[]
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
  initialProducts, initialTotal, initialPage, pageSize, customers, vatConfig, initialHeldSales,
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
        stock:     -1,  // held sale snapshot has no live stock; server validates at checkout
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
    const tracked = product.track_stock !== false
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id)
      if (existing) {
        // Cap quantity at stock only for tracked products.
        if (tracked && existing.quantity >= product.stock) return prev
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      // Block adding tracked products with no stock.
      if (tracked && product.stock < 1) return prev
      return [
        ...prev,
        {
          productId: product.id,
          name:      product.name,
          price:     product.price,
          quantity:  1,
          vatExempt: Boolean(product.vat_exempt),
          stock:     product.track_stock === false ? -1 : product.stock,
        },
      ]
    })
  }

  function updateQty(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.productId !== productId) return i
          const next = i.quantity + delta
          // Cap at available stock for tracked products (stock >= 0).
          if (delta > 0 && i.stock >= 0 && next > i.stock) return i
          return { ...i, quantity: next }
        })
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
    <div className="flex h-full gap-3 overflow-hidden">

      {/* ── LEFT: Product grid ─────────────────────────────────── */}
      <div className="flex flex-1 flex-col gap-3 overflow-hidden">

        {/* Search bar — Apple-style tall input */}
        <div className="relative shrink-0">
          <Search className={cn(
            'absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors',
            scanState === 'hit'  ? 'text-[oklch(0.719_0.188_145)]' :
            scanState === 'miss' ? 'text-destructive' :
            'text-muted-foreground'
          )} />
          <input
            ref={searchRef}
            type="text"
            placeholder="ค้นหาสินค้า หรือสแกน SKU / บาร์โค้ด แล้วกด Enter"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={onSearchKeyDown}
            className={cn(
              'flex h-10 w-full rounded-xl border bg-card pl-10 pr-4 text-[14px] placeholder:text-muted-foreground outline-none transition-all',
              'focus:border-primary focus:ring-3 focus:ring-primary/20 focus:shadow-sm',
              scanState === 'hit'  && 'border-[oklch(0.719_0.188_145)] ring-2 ring-[oklch(0.719_0.188_145)]/20',
              scanState === 'miss' && 'border-destructive ring-2 ring-destructive/20',
              scanState === 'idle' && 'border-border',
            )}
          />
          {scanState === 'miss' && (
            <p className="absolute -bottom-5 left-1 text-xs text-destructive">
              ไม่พบ SKU หรือสินค้าหมดสต๊อก
            </p>
          )}
        </div>

        {/* Product grid — App Store–style cards */}
        <div
          className="relative grid flex-1 auto-rows-min grid-cols-3 gap-2.5 overflow-y-auto content-start md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
          style={{ scrollbarGutter: 'stable' }}
        >
          {loading && (
            <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-2xl bg-background/50 backdrop-blur-sm">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}

          {products.map((product, idx) => {
            const inCart = cart.find((i) => i.productId === product.id)
            const inCartQty = inCart?.quantity ?? 0
            const tracked = product.track_stock !== false
            const remaining = tracked ? product.stock - inCartQty : Infinity
            const lowStock = tracked && product.stock > 0 && product.stock <= product.min_stock
            return (
              <div
                key={product.id}
                className={cn(
                  'group relative rounded-2xl bg-card shadow-sm transition-all duration-150',
                  inCartQty > 0
                    ? 'ring-2 ring-primary shadow-primary/10'
                    : 'ring-1 ring-border/70 hover:shadow-md hover:ring-border'
                )}
              >
                {/* Detail info button — outside inner overflow-hidden so it always shows */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setDetailProduct(product) }}
                  aria-label="ดูรายละเอียด"
                  className="absolute right-2 top-2 z-10 grid h-6 w-6 place-items-center rounded-full bg-black/25 text-white/90 backdrop-blur-sm transition-opacity opacity-0 group-hover:opacity-100"
                >
                  <Info className="h-3 w-3" />
                </button>

                {/* In-cart quantity badge */}
                {inCartQty > 0 && (
                  <div className="absolute left-2 top-2 z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-white shadow">
                    {inCartQty}
                  </div>
                )}

                {/* Inner button: overflow-hidden + scale here so ring is unaffected */}
                <button
                  type="button"
                  onClick={() => addToCart(product)}
                  className="flex h-full w-full flex-col overflow-hidden rounded-2xl bg-card text-left active:scale-[0.97] transition-transform duration-100"
                >
                  {/* Image */}
                  <div className="relative aspect-square w-full shrink-0 bg-muted">
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
                        <ImageOff className="h-7 w-7 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex flex-col gap-1 p-2.5">
                    <p className="line-clamp-2 text-[12px] font-medium leading-tight text-foreground break-words">
                      {product.name}
                    </p>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[13px] font-semibold tabular-nums text-foreground">
                        {formatBaht(product.price)}
                      </span>
                      {tracked ? (
                        <span className={cn(
                          'text-[10px] tabular-nums font-medium',
                          remaining <= 0 ? 'text-destructive' :
                          lowStock ? 'text-[oklch(0.574_0.170_65)]' : 'text-muted-foreground'
                        )}>
                          {remaining}
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/60">∞</span>
                      )}
                    </div>
                  </div>
                </button>
              </div>
            )
          })}

          {!loading && products.length === 0 && (
            <p className="col-span-full py-16 text-center text-[14px] text-muted-foreground">
              ไม่พบสินค้า
            </p>
          )}
        </div>

        {/* Pagination */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-xl bg-card px-3 py-2 shadow-sm ring-1 ring-border/70">
          <span className="text-[12px] text-muted-foreground tabular-nums">
            {total} รายการ · หน้า {page}/{totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button type="button" size="icon-sm" variant="ghost" onClick={goPrev} disabled={page <= 1 || loading}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {buildPageList(page, totalPages).map((item, idx) =>
              item === '…' ? (
                <span key={`gap-${idx}`} className="px-1 text-xs text-muted-foreground">…</span>
              ) : (
                <Button
                  key={item}
                  type="button"
                  size="icon-sm"
                  variant={item === page ? 'default' : 'ghost'}
                  onClick={() => setPage(item)}
                  disabled={loading}
                  className="tabular-nums"
                >
                  {item}
                </Button>
              )
            )}
            <Button type="button" size="icon-sm" variant="ghost" onClick={goNext} disabled={page >= totalPages || loading}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── RIGHT: Cart ────────────────────────────────────────── */}
      <div className="flex w-[320px] shrink-0 flex-col overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border/70">

        {/* Cart header */}
        <div className="flex shrink-0 items-center gap-2 border-b px-4 py-3">
          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          <span className="text-[14px] font-semibold">รายการสั่ง</span>
          {totalQty > 0 && (
            <Badge className="text-[10px] h-[18px] px-1.5">{totalQty}</Badge>
          )}
          <div className="ml-auto">
            <HeldSalesDrawer
              onResume={handleResume}
              currentCartHasItems={cart.length > 0}
              refreshKey={heldRefresh}
              initialRows={initialHeldSales}
            />
          </div>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <ShoppingCart className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-[13px] text-muted-foreground">เลือกสินค้าทางซ้าย</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.productId} className="rounded-xl bg-muted/40 px-3 py-2.5 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="flex-1 text-[13px] font-medium leading-snug">{item.name}</p>
                  <button
                    onClick={() => removeItem(item.productId)}
                    className="mt-0.5 shrink-0 text-muted-foreground/50 hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => updateQty(item.productId, -1)}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-background shadow-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-8 text-center text-[13px] font-semibold tabular-nums">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item.productId, 1)}
                      disabled={item.stock >= 0 && item.quantity >= item.stock}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <span className="text-[13px] font-semibold tabular-nums">
                    {formatBaht(lineTotal(item.price, item.quantity))}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Checkout */}
        <div className="shrink-0 border-t px-4 pt-3 pb-4 space-y-3">
          {/* VAT breakdown */}
          {showVatRow && (
            <div className="space-y-1">
              <div className="flex justify-between text-[12px] text-muted-foreground">
                <span>ยอดก่อน VAT</span>
                <span className="tabular-nums">{formatBaht(breakdown.subtotalExVat)}</span>
              </div>
              <div className="flex justify-between text-[12px] text-muted-foreground">
                <span>VAT {vatConfig.rate}%</span>
                <span className="tabular-nums">{formatBaht(breakdown.vatAmount)}</span>
              </div>
            </div>
          )}

          {/* Total */}
          <div className="flex items-baseline justify-between">
            <span className="text-[13px] text-muted-foreground">รวมทั้งสิ้น</span>
            <span className="text-[26px] font-bold tabular-nums tracking-tight">
              {formatBaht(breakdown.total)}
            </span>
          </div>

          <Separator />

          <form action={formAction} className="space-y-2.5">
            <input type="hidden" name="cart" value={JSON.stringify(cart)} />
            <input type="hidden" name="paymentMethod" value={payment} />
            <input type="hidden" name="customerId" value={customer?.id ?? ''} />

            <CustomerPicker customers={customers} selected={customer} onChange={setCustomer} />

            {/* Payment method selector */}
            <div className="grid grid-cols-3 gap-1.5">
              {PAYMENT_METHODS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPayment(value)}
                  className={cn(
                    'rounded-xl py-2 text-[12px] font-medium transition-all',
                    payment === value
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-muted text-muted-foreground hover:bg-muted/70'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {state?.error && (
              <p className="text-center text-[12px] text-destructive">{state.error}</p>
            )}

            {/* Pay — the most important button on screen */}
            <Button
              type="submit"
              size="xl"
              className="w-full"
              disabled={cart.length === 0 || isPending}
            >
              {isPending
                ? <><Loader2 className="h-4 w-4 animate-spin" /> กำลังบันทึก...</>
                : `ชำระเงิน ${cart.length > 0 ? formatBaht(breakdown.total) : ''}`
              }
            </Button>

            <Button
              type="button"
              variant="outline"
              size="lg"
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
                className="w-full py-1 text-center text-[12px] text-muted-foreground hover:text-destructive transition-colors"
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
