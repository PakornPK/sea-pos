'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { ImagePlus, X, Loader2 } from 'lucide-react'
import { uploadCompanyAsset, removeCompanyAsset } from '@/lib/actions/storage'
import { validateImageUpload } from '@/lib/storage-validation'
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
  const [removing, setRemoving] = useState(false)
  const [removeError, setRemoveError] = useState<string | null>(null)
  const [clientError, setClientError] = useState<string | null>(null)
  // Holds the last confirmed-good URL so we can revert on upload failure.
  const stablePreview = useRef<string | null>(currentUrl)

  useEffect(() => {
    setPreview(currentUrl)
    stablePreview.current = currentUrl
  }, [currentUrl])

  useEffect(() => {
    if (!state) return
    if (state.url) {
      // Upload succeeded — lock in the new URL.
      stablePreview.current = state.url
      setPreview(state.url)
    } else if (state.error) {
      // Upload failed — revert optimistic preview and clear the input.
      setPreview(stablePreview.current)
      if (inputRef.current) inputRef.current.value = ''
    }
  }, [state])

  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setClientError(null)
    setRemoveError(null)
    // 'letterhead' follows the same rules as 'logo' (2 MB, same types)
    const v = validateImageUpload(file, 'logo')
    if (!v.ok) {
      setClientError(v.error)
      if (inputRef.current) inputRef.current.value = ''
      return
    }
    setPreview(URL.createObjectURL(file))
    e.target.form?.requestSubmit()
  }

  async function onRemove() {
    if (!currentUrl) return
    if (!confirm(`ลบ${label}?`)) return
    setRemoveError(null)
    setRemoving(true)
    try {
      await removeCompanyAsset(kind)
      stablePreview.current = null
      setPreview(null)
    } catch (e) {
      setRemoveError(e instanceof Error ? e.message : 'ลบไม่สำเร็จ กรุณาลองใหม่')
    } finally {
      setRemoving(false)
    }
  }

  const disabled = pending || removing
  const boxClass = aspect === 'wide' ? 'h-20 w-48' : 'h-24 w-24'
  const error = clientError ?? state?.error ?? removeError

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
          error && 'border-destructive',
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
              {removing ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <X className="mr-1 h-3 w-3" />}
              ลบ
            </Button>
          )}
        </div>
        {error && <p className="text-destructive">{error}</p>}
      </div>
    </form>
  )
}
