'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { User, UserPlus, X, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { quickCreateCustomer } from '@/lib/actions/customers'

export type PickerCustomer = {
  id: string
  name: string
  phone: string | null
}

type Props = {
  customers: PickerCustomer[]
  selected: PickerCustomer | null
  onChange: (customer: PickerCustomer | null) => void
}

export function CustomerPicker({ customers, selected, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [localCustomers, setLocalCustomers] = useState(customers)
  const [popoverRect, setPopoverRect] = useState<{ top: number; left: number; width: number } | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setLocalCustomers(customers) }, [customers])

  // Recompute popover position: anchored above the button
  useEffect(() => {
    if (!open) return
    function updatePosition() {
      const btn = btnRef.current
      if (!btn) return
      const r = btn.getBoundingClientRect()
      const estimatedH = 360
      setPopoverRect({
        top: Math.max(8, r.top - estimatedH - 4),
        left: r.left,
        width: r.width,
      })
    }
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      const inTrigger = ref.current?.contains(target)
      const inPopover = popRef.current?.contains(target)
      if (!inTrigger && !inPopover) {
        setOpen(false)
        setCreating(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const q = search.trim().toLowerCase()
  const filtered = q
    ? localCustomers.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone ?? '').toLowerCase().includes(q)
      )
    : localCustomers.slice(0, 30)

  function pick(c: PickerCustomer | null) {
    onChange(c)
    setOpen(false)
    setCreating(false)
    setSearch('')
  }

  function handleCreate() {
    setError(null)
    startTransition(async () => {
      const res = await quickCreateCustomer(newName, newPhone || null)
      if ('error' in res) {
        setError(res.error)
        return
      }
      const added = { id: res.id, name: res.name, phone: res.phone }
      setLocalCustomers((prev) => [added, ...prev])
      pick(added)
      setNewName('')
      setNewPhone('')
    })
  }

  return (
    <div ref={ref} className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 rounded-xl ring-1 ring-border/70 bg-background px-3 py-2 text-sm hover:bg-accent transition-colors"
      >
        <User className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="flex-1 text-left truncate">
          {selected ? (
            <>
              {selected.name}
              {selected.phone && (
                <span className="text-muted-foreground ml-1">· {selected.phone}</span>
              )}
            </>
          ) : (
            <span className="text-muted-foreground">ลูกค้าทั่วไป (walk-in)</span>
          )}
        </span>
        {selected && (
          <X
            className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation()
              pick(null)
            }}
          />
        )}
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      {open && popoverRect && typeof window !== 'undefined' && createPortal(
        <div
          ref={popRef}
          style={{
            position: 'fixed',
            top: popoverRect.top,
            left: popoverRect.left,
            width: popoverRect.width,
            zIndex: 50,
          }}
          className="rounded-xl ring-1 ring-border/70 bg-popover shadow-lg"
        >
          {!creating ? (
            <>
              <div className="p-2 border-b">
                <Input
                  placeholder="ค้นหา ชื่อ / เบอร์โทร..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="max-h-64 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => pick(null)}
                  className={cn(
                    'w-full text-left px-3 py-2 text-sm hover:bg-accent italic text-muted-foreground',
                    !selected && 'bg-accent'
                  )}
                >
                  ลูกค้าทั่วไป (walk-in)
                </button>
                {filtered.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => pick(c)}
                    className={cn(
                      'w-full text-left px-3 py-2 text-sm hover:bg-accent',
                      selected?.id === c.id && 'bg-accent'
                    )}
                  >
                    <div className="font-medium">{c.name}</div>
                    {c.phone && (
                      <div className="text-xs text-muted-foreground">{c.phone}</div>
                    )}
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    ไม่พบลูกค้า
                  </p>
                )}
              </div>
              <div className="border-t p-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setCreating(true)}
                >
                  <UserPlus className="mr-1 h-3.5 w-3.5" />
                  เพิ่มลูกค้าใหม่
                </Button>
              </div>
            </>
          ) : (
            <div className="p-3 space-y-2">
              <div>
                <Label htmlFor="new-name" className="text-xs">ชื่อลูกค้า *</Label>
                <Input
                  id="new-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  disabled={pending}
                  autoFocus
                />
              </div>
              <div>
                <Label htmlFor="new-phone" className="text-xs">เบอร์โทร</Label>
                <Input
                  id="new-phone"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  disabled={pending}
                />
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCreate}
                  disabled={pending || !newName.trim()}
                >
                  {pending ? 'กำลังบันทึก...' : 'บันทึก'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => { setCreating(false); setError(null) }}
                  disabled={pending}
                >
                  ยกเลิก
                </Button>
              </div>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}
