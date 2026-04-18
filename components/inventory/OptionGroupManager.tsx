'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, ChevronDown, ChevronUp, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { formatBaht } from '@/lib/format'
import {
  saveOptionGroup, deleteOptionGroup,
  saveOption, deleteOption,
} from '@/lib/actions/options'
import type { OptionGroupWithOptions, Product, Category } from '@/types/database'

type Props = {
  productId:   string
  groups:      OptionGroupWithOptions[]
  allProducts: Product[]
  categories:  Category[]
}

export function OptionGroupManager({ productId, groups: initial, allProducts, categories }: Props) {
  const optionCatIds = new Set(
    categories
      .filter((c) => c.category_type === 'option' || c.category_type === 'both' || c.category_type === 'cost')
      .map((c) => c.id)
  )
  // Products eligible for stock linking: in an option/both/cost category, or uncategorized
  const linkableProducts = allProducts.filter(
    (p) => p.id !== productId && (!p.category_id || optionCatIds.has(p.category_id))
  )
  const [groups, setGroups]     = useState(initial)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [, startT]              = useTransition()
  const router                  = useRouter()

  // Sync local state when server re-renders with fresh props after router.refresh()
  useEffect(() => { setGroups(initial) }, [initial])

  // ── Group form state ──────────────────────────────────────────
  const [newGroupName, setNewGroupName]           = useState('')
  const [newGroupRequired, setNewGroupRequired]   = useState(true)
  const [newGroupMulti, setNewGroupMulti]         = useState(false)
  const [addingGroup, setAddingGroup]             = useState(false)

  // ── Option form state per group ───────────────────────────────
  const [optForms, setOptForms] = useState<Record<string, { name: string; delta: string; linkedProductId: string; quantityPerUse: string }>>({})

  async function handleAddGroup() {
    const name = newGroupName.trim()
    if (!name) return
    const fd = new FormData()
    fd.set('product_id',   productId)
    fd.set('name',         name)
    fd.set('required',     String(newGroupRequired))
    fd.set('multi_select', String(newGroupMulti))
    fd.set('sort_order',   String(groups.length))
    const res = await saveOptionGroup(undefined, fd)
    if (res?.error) { alert(res.error); return }
    setNewGroupName('')
    setNewGroupRequired(true)
    setNewGroupMulti(false)
    setAddingGroup(false)
    // Refresh via server revalidation — just reload the data optimistically
    router.refresh()
  }

  async function handleDeleteGroup(groupId: string) {
    if (!confirm('ลบกลุ่มตัวเลือกนี้และตัวเลือกทั้งหมดด้วย?')) return
    startT(async () => {
      await deleteOptionGroup(groupId, productId)
      setGroups((prev) => prev.filter((g) => g.id !== groupId))
      router.refresh()
    })
  }

  async function handleAddOption(groupId: string) {
    const form = optForms[groupId] ?? { name: '', delta: '0', linkedProductId: '', quantityPerUse: '1' }
    const name  = form.name.trim()
    if (!name) return
    const fd = new FormData()
    fd.set('group_id',          groupId)
    fd.set('product_id',        productId)
    fd.set('name',              name)
    fd.set('price_delta',       form.delta || '0')
    fd.set('sort_order',        String(groups.find((g) => g.id === groupId)?.options.length ?? 0))
    fd.set('linked_product_id', form.linkedProductId || '')
    fd.set('quantity_per_use',  form.quantityPerUse || '1')
    const res = await saveOption(undefined, fd)
    if (res?.error) { alert(res.error); return }
    setOptForms((prev) => ({ ...prev, [groupId]: { name: '', delta: '0', linkedProductId: '', quantityPerUse: '1' } }))
    router.refresh()
  }

  async function handleDeleteOption(optionId: string, groupId: string) {
    startT(async () => {
      await deleteOption(optionId, productId)
      setGroups((prev) => prev.map((g) =>
        g.id === groupId
          ? { ...g, options: g.options.filter((o) => o.id !== optionId) }
          : g
      ))
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold">ตัวเลือกสินค้า</h2>
        {!addingGroup && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAddingGroup(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            เพิ่มกลุ่มตัวเลือก
          </Button>
        )}
      </div>

      {/* New group form */}
      {addingGroup && (
        <div className="rounded-2xl border border-dashed border-border p-4 space-y-3">
          <p className="text-[13px] font-medium">กลุ่มตัวเลือกใหม่</p>
          <div className="space-y-1">
            <Label className="text-[12px]">ชื่อกลุ่ม เช่น "ความหวาน"</Label>
            <Input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="เมล็ดกาแฟ, อุณหภูมิ, ขนาด ..."
              className="h-8 text-[13px]"
              onKeyDown={(e) => e.key === 'Enter' && handleAddGroup()}
              autoFocus
            />
          </div>
          <div className="flex gap-4 text-[13px]">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newGroupRequired}
                onChange={(e) => setNewGroupRequired(e.target.checked)}
                className="rounded"
              />
              จำเป็นต้องเลือก
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newGroupMulti}
                onChange={(e) => setNewGroupMulti(e.target.checked)}
                className="rounded"
              />
              เลือกได้หลายอย่าง
            </label>
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={handleAddGroup}>บันทึก</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setAddingGroup(false)}>ยกเลิก</Button>
          </div>
        </div>
      )}

      {groups.length === 0 && !addingGroup && (
        <p className="text-[13px] text-muted-foreground">
          ยังไม่มีตัวเลือก — เพิ่มเพื่อให้แคชเชียร์เลือกได้ในหน้าขาย
        </p>
      )}

      {/* Existing groups */}
      {groups.map((group) => {
        const open     = expanded[group.id] ?? true
        const optForm  = optForms[group.id] ?? { name: '', delta: '0', linkedProductId: '', quantityPerUse: '1' }
        return (
          <div key={group.id} className="rounded-2xl border border-border overflow-hidden">
            {/* Group header */}
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/30">
              <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-[13px] font-semibold">{group.name}</span>
                <span className="ml-2 text-[11px] text-muted-foreground">
                  {group.required ? 'จำเป็น' : 'ไม่จำเป็น'}
                  {group.multi_select ? ' · เลือกหลาย' : ' · เลือกเดียว'}
                  {' · '}
                  {group.options.length} ตัวเลือก
                </span>
              </div>
              <button
                type="button"
                onClick={() => setExpanded((p) => ({ ...p, [group.id]: !open }))}
                className="text-muted-foreground hover:text-foreground"
              >
                {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteGroup(group.id)}
                className="text-muted-foreground/40 hover:text-destructive transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {open && (
              <div className="px-4 py-3 space-y-3">
                {/* Options list */}
                {group.options.length > 0 && (
                  <div className="space-y-1.5">
                    {group.options.map((opt) => {
                      const linked = opt.linked_product_id
                        ? allProducts.find((p) => p.id === opt.linked_product_id)
                        : null
                      return (
                        <div key={opt.id} className="flex items-center gap-2 text-[13px]">
                          <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
                          <span className="flex-1">{opt.name}</span>
                          {linked && (
                            <span className="text-[11px] text-muted-foreground border rounded px-1.5 py-0.5">
                              📦 {linked.name}{opt.quantity_per_use !== 1 ? ` ×${opt.quantity_per_use}` : ''}
                            </span>
                          )}
                          {opt.price_delta !== 0 && (
                            <span className={cn(
                              'tabular-nums text-[12px]',
                              opt.price_delta > 0 ? 'text-primary' : 'text-destructive'
                            )}>
                              {opt.price_delta > 0 ? '+' : ''}{formatBaht(opt.price_delta)}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteOption(opt.id, group.id)}
                            className="text-muted-foreground/30 hover:text-destructive transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}

                <Separator />

                {/* Add option */}
                <div className="flex gap-2 items-end flex-wrap">
                  <div className="flex-1 min-w-[120px] space-y-1">
                    <Label className="text-[11px] text-muted-foreground">ชื่อ</Label>
                    <Input
                      value={optForm.name}
                      onChange={(e) => setOptForms((p) => ({
                        ...p, [group.id]: { ...optForm, name: e.target.value },
                      }))}
                      placeholder="เช่น Arabica, ไม่หวาน, ร้อน"
                      className="h-8 text-[13px]"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddOption(group.id)}
                    />
                  </div>
                  <div className="w-24 space-y-1">
                    <Label className="text-[11px] text-muted-foreground">ราคา +/-</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={optForm.delta}
                      onChange={(e) => setOptForms((p) => ({
                        ...p, [group.id]: { ...optForm, delta: e.target.value },
                      }))}
                      className="h-8 text-[13px]"
                    />
                  </div>
                  <div className="flex-1 min-w-[140px] space-y-1">
                    <Label className="text-[11px] text-muted-foreground">ตัดสต๊อกจาก (ถ้ามี)</Label>
                    <select
                      value={optForm.linkedProductId}
                      onChange={(e) => setOptForms((p) => ({
                        ...p, [group.id]: { ...optForm, linkedProductId: e.target.value },
                      }))}
                      className="h-8 w-full rounded-md border border-input bg-background px-2 text-[13px]"
                    >
                      <option value="">— ไม่ตัดสต๊อก —</option>
                      {linkableProducts.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  {optForm.linkedProductId && (
                    <div className="w-20 space-y-1">
                      <Label className="text-[11px] text-muted-foreground">ปริมาณ/ครั้ง</Label>
                      <Input
                        type="number"
                        step="0.001"
                        min="0.001"
                        value={optForm.quantityPerUse}
                        onChange={(e) => setOptForms((p) => ({
                          ...p, [group.id]: { ...optForm, quantityPerUse: e.target.value },
                        }))}
                        className="h-8 text-[13px]"
                        placeholder="1"
                      />
                    </div>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddOption(group.id)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
