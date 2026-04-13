'use client'

import { useActionState, useEffect, useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import { ImagePlus, X, Loader2 } from 'lucide-react'
import { uploadCompanyAsset, removeCompanyAsset } from '@/lib/actions/storage'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Props = {
  kind: 'logo' | 'letterhead'
  label: string
  hint: string
  currentUrl: string | null
  aspect?: 'square' | 'wide'
}

export function CompanyLogoUpload({ kind, label, hint, currentUrl, aspect = 'square' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const uploadWith = uploadCompanyAsset.bind(null, kind)
  const [state, formAction, pending] = useActionState(uploadWith, undefined)
  const [preview, setPreview] = useState<string | null>(currentUrl)
  const [removing, startRemove] = useTransition()

  useEffect(() => { setPreview(currentUrl) }, [currentUrl])
  useEffect(() => { if (state?.url) setPreview(state.url) }, [state])

  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPreview(URL.createObjectURL(file))
    e.target.form?.requestSubmit()
  }

  function onRemove() {
    if (!currentUrl) return
    if (!confirm(`ลบ${label}?`)) return
    startRemove(async () => {
      await removeCompanyAsset(kind)
      setPreview(null)
    })
  }

  const disabled = pending || removing
  const boxClass = aspect === 'wide' ? 'h-20 w-48' : 'h-24 w-24'

  return (
    <form action={formAction} className="flex items-start gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className={cn(
          'relative shrink-0 overflow-hidden rounded-lg border bg-muted',
          'grid place-items-center transition-colors',
          'hover:border-primary hover:bg-accent',
          disabled && 'opacity-60 cursor-not-allowed',
          boxClass
        )}
      >
        {preview ? (
          <Image
            src={preview}
            alt={label}
            fill
            className="object-contain p-1"
            sizes="200px"
            unoptimized
          />
        ) : (
          <ImagePlus className="h-6 w-6 text-muted-foreground" />
        )}
        {pending && (
          <div className="absolute inset-0 grid place-items-center bg-background/70">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        name="file"
        accept="image/jpeg,image/png,image/webp,image/svg+xml"
        onChange={onFileSelected}
        disabled={disabled}
        className="hidden"
      />

      <div className="flex flex-col gap-1 text-xs">
        <div className="text-sm font-medium text-foreground">{label}</div>
        <p className="text-muted-foreground">{hint}</p>
        <div className="mt-1 flex gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
          >
            {pending ? 'กำลังอัปโหลด...' : preview ? 'เปลี่ยน' : 'เลือกไฟล์'}
          </Button>
          {preview && !pending && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onRemove}
              disabled={disabled}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="mr-1 h-3 w-3" /> ลบ
            </Button>
          )}
        </div>
        {state?.error && <p className="text-destructive">{state.error}</p>}
      </div>
    </form>
  )
}
