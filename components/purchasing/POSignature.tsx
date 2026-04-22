'use client'

import { useEffect, useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'

type SignerOption = {
  id: string
  name: string | null
  email: string
}

type Props = {
  poId: string
  creatorId: string
  signerOptions: SignerOption[]
  /** When set, the PO is confirmed — signature is locked to this name. */
  lockedSignerName: string | null
}

const CUSTOM_KEY = '__custom__'

function toIsoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

function formatThaiDate(iso: string) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} / ${m} / ${y + 543}`
}

function storageKey(poId: string) {
  return `po-sig:${poId}`
}

type Saved = { selected: string; customName: string; dateIso: string }

function loadSaved(poId: string, defaultSelected: string): Saved {
  try {
    const raw = sessionStorage.getItem(storageKey(poId))
    if (raw) return JSON.parse(raw) as Saved
  } catch { /* ignore */ }
  return { selected: defaultSelected, customName: '', dateIso: toIsoDate(new Date()) }
}

export function POSignature({ poId, creatorId, signerOptions, lockedSignerName }: Props) {
  const isLocked = lockedSignerName !== null
  const defaultSelected = signerOptions.find((o) => o.id === creatorId)?.id ?? CUSTOM_KEY

  const [selected, setSelected] = useState(defaultSelected)
  const [customName, setCustomName] = useState('')
  const [dateIso, setDateIso] = useState(toIsoDate(new Date()))
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    if (isLocked) { setHydrated(true); return }
    const saved = loadSaved(poId, defaultSelected)
    setSelected(saved.selected)
    setCustomName(saved.customName)
    setDateIso(saved.dateIso)
    setHydrated(true)
  }, [poId, defaultSelected, isLocked])

  useEffect(() => {
    if (!hydrated || isLocked) return
    try {
      sessionStorage.setItem(storageKey(poId), JSON.stringify({ selected, customName, dateIso }))
    } catch { /* ignore */ }
  }, [poId, selected, customName, dateIso, hydrated, isLocked])

  const isCustom = selected === CUSTOM_KEY
  const selectedOption = signerOptions.find((o) => o.id === selected)
  const printName = isLocked
    ? (lockedSignerName || '................................')
    : (isCustom ? customName : (selectedOption?.name ?? ''))

  return (
    <div className="mt-4">
      {/* On-screen controls — hidden when printing */}
      <div className="print:hidden rounded-xl bg-muted/40 px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-medium">ลายเซ็นบนใบสั่งซื้อ</p>
          {isLocked && (
            <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              🔒 ล็อกแล้ว — ยืนยันสั่งซื้อโดย {lockedSignerName || '—'}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-3 items-end">

          {!isLocked && (
            <div className="space-y-1">
              <Label className="text-xs">ผู้ลงนาม</Label>
              <NativeSelect
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="min-w-[220px]"
              >
                {signerOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name || o.email}{o.id === creatorId ? ' (ผู้ออกใบ PO)' : ''}
                  </option>
                ))}
                <option value={CUSTOM_KEY}>— พิมพ์ชื่อเอง —</option>
              </NativeSelect>
            </div>
          )}

          {!isLocked && (
            <div className="space-y-1">
              <Label className="text-xs">ชื่อที่จะพิมพ์</Label>
              {isCustom ? (
                <Input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="ระบุชื่อ"
                  className="min-w-[200px]"
                  autoFocus
                />
              ) : (
                <div className="h-9 min-w-[200px] rounded-md border border-input bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                  {selectedOption?.name || <span className="italic">ยังไม่มีชื่อ</span>}
                </div>
              )}
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs">วันที่บนใบ</Label>
            <Input
              type="date"
              value={dateIso}
              onChange={(e) => setDateIso(e.target.value)}
              className="min-w-[160px]"
            />
          </div>

        </div>
      </div>

      {/* Signature block — shown on screen and in print */}
      <div className="mt-6 flex justify-end">
        <div className="w-64 space-y-4">
          <div className="border-b border-dashed border-foreground/40 h-12" />
          <div className="text-center space-y-0.5">
            <p className="text-sm font-medium">{printName}</p>
            <p className="text-xs text-muted-foreground print:text-black">ผู้สั่งซื้อ / Authorized Signature</p>
            <p className="text-xs text-muted-foreground print:text-black mt-1">
              วันที่ {formatThaiDate(dateIso)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
