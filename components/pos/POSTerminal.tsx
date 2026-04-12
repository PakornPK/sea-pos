'use client'

import { useState, useActionState } from 'react'
import { Search, ShoppingCart, Plus, Minus, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { createSale } from '@/lib/actions/pos'
import type { Category, Product } from '@/types/database'

type CartItem = {
  productId: string
  name: string
  price: number
  quantity: number
}

type POSTerminalProps = {
  products: Product[]
  categories: Category[]
}

const PAYMENT_METHODS = [
  { value: 'cash',     label: 'เงินสด' },
  { value: 'card',     label: 'บัตร' },
  { value: 'transfer', label: 'โอนเงิน' },
]

export function POSTerminal({ products, categories }: POSTerminalProps) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState('')
  const [payment, setPayment] = useState('cash')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [state, formAction, isPending] = useActionState(createSale, undefined)

  const filtered = products.filter(
    (p) =>
      p.stock > 0 &&
      (selectedCategory === null || p.category_id === selectedCategory) &&
      (p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.sku ?? '').toLowerCase().includes(search.toLowerCase()))
  )

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id)
      if (existing) {
        const cartQty = existing.quantity
        if (cartQty >= product.stock) return prev   // don't exceed stock
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      if (product.stock < 1) return prev
      return [
        ...prev,
        { productId: product.id, name: product.name, price: product.price, quantity: 1 },
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
  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0)

  return (
    <div className="flex gap-4" style={{ height: 'calc(100vh - 8.5rem)' }}>
      {/* ── Product grid ─────────────────────────────────────── */}
      <div className="flex flex-col flex-1 gap-3 overflow-hidden">
        <div className="relative shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ค้นหาสินค้า หรือ SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Category tabs */}
        {categories.length > 0 && (
          <div className="flex gap-1.5 flex-wrap shrink-0">
            <button
              onClick={() => setSelectedCategory(null)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap',
                selectedCategory === null
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'hover:bg-accent'
              )}
            >
              ทั้งหมด
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap',
                  selectedCategory === cat.id
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'hover:bg-accent'
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        <div className="overflow-y-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 content-start">
          {filtered.map((product) => {
            const inCart = cart.find((i) => i.productId === product.id)
            return (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className={cn(
                  'rounded-lg border bg-card p-3 text-left transition-colors cursor-pointer',
                  inCart
                    ? 'border-primary bg-primary/5'
                    : 'hover:border-primary/50 hover:bg-accent'
                )}
              >
                <p className="font-medium text-sm leading-tight line-clamp-2 min-h-[2.5rem]">
                  {product.name}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{product.sku || '—'}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-semibold">฿{product.price.toFixed(2)}</span>
                  <Badge
                    variant={product.stock <= product.min_stock ? 'destructive' : 'outline'}
                    className="text-xs"
                  >
                    {inCart ? `${inCart.quantity}/${product.stock}` : `เหลือ ${product.stock}`}
                  </Badge>
                </div>
              </button>
            )
          })}

          {filtered.length === 0 && (
            <p className="col-span-full text-center text-muted-foreground py-12 text-sm">
              ไม่พบสินค้า
            </p>
          )}
        </div>
      </div>

      {/* ── Cart ─────────────────────────────────────────────── */}
      <div className="w-80 shrink-0 flex flex-col border rounded-xl bg-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0">
          <ShoppingCart className="h-4 w-4" />
          <span className="font-semibold">รายการสั่ง</span>
          {totalQty > 0 && (
            <Badge className="ml-auto text-xs">{totalQty} รายการ</Badge>
          )}
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {cart.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-10">
              กดเลือกสินค้าทางซ้าย
            </p>
          ) : (
            cart.map((item) => (
              <div key={item.productId} className="space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium leading-snug flex-1">{item.name}</p>
                  <button
                    onClick={() => removeItem(item.productId)}
                    className="text-muted-foreground hover:text-destructive mt-0.5 shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQty(item.productId, -1)}
                      className="h-6 w-6 rounded border flex items-center justify-center hover:bg-accent"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-7 text-center text-sm tabular-nums">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item.productId, 1)}
                      className="h-6 w-6 rounded border flex items-center justify-center hover:bg-accent"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <span className="text-sm tabular-nums font-medium">
                    ฿{(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Checkout */}
        <div className="border-t p-4 space-y-3 shrink-0">
          <div className="flex justify-between items-baseline">
            <span className="text-muted-foreground text-sm">รวมทั้งสิ้น</span>
            <span className="text-2xl font-bold tabular-nums">฿{total.toFixed(2)}</span>
          </div>

          <Separator />

          <form action={formAction} className="space-y-3">
            <input type="hidden" name="cart" value={JSON.stringify(cart)} />
            <input type="hidden" name="paymentMethod" value={payment} />

            {/* Payment method selector */}
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
              <p className="text-xs text-destructive text-center">{state.error}</p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={cart.length === 0 || isPending}
            >
              {isPending ? 'กำลังบันทึก...' : 'ชำระเงิน'}
            </Button>

            {cart.length > 0 && (
              <button
                type="button"
                onClick={() => setCart([])}
                className="w-full text-xs text-muted-foreground hover:text-destructive text-center py-1"
              >
                ล้างรายการทั้งหมด
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
