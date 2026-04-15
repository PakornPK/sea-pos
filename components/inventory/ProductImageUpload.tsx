'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { ImagePlus, X, Loader2 } from 'lucide-react'
import { uploadProductImage, removeProductImage } from '@/lib/actions/storage'
import { validateImageUpload } from '@/lib/storage-validation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Props = {
  productId: string
  currentUrl: string | null
  className?: string
}

export function ProductImageUpload({ productId, currentUrl, className }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const uploadWith = uploadProductImage.bind(null, productId)
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
    const v = validateImageUpload(file, 'product')
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
    if (!confirm('ลบรูปสินค้านี้?')) return
    setRemoveError(null)
    setRemoving(true)
    try {
      await removeProductImage(productId)
      stablePreview.current = null
      setPreview(null)
    } catch (e) {
      setRemoveError(e instanceof Error ? e.message : 'ลบไม่สำเร็จ กรุณาลองใหม่')
    } finally {
      setRemoving(false)
    }
  }

  const disabled = pending || removing
  const error = clientError ?? state?.error ?? removeError

  return (
    <form action={formAction} className={cn('flex items-center gap-3', className)}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className={cn(
          'relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border bg-muted',
          'flex items-center justify-center transition-colors',
          'hover:border-primary hover:bg-accent',
          error && 'border-destructive',
          disabled && 'opacity-60 cursor-not-allowed'
        )}
      >
        {preview ? (
          <Image
            src={preview}
            alt="product"
            fill
            className="object-cover"
            sizes="80px"
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
        accept="image/jpeg,image/png,image/webp"
        onChange={onFileSelected}
        disabled={disabled}
        className="hidden"
      />

      <div className="flex flex-col gap-1 text-xs">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
        >
          {pending ? 'กำลังอัปโหลด...' : preview ? 'เปลี่ยนรูป' : 'เลือกรูป'}
        </Button>
        {preview && !pending && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onRemove}
            disabled={disabled}
            className="text-muted-foreground hover:text-destructive h-7 px-2"
          >
            {removing ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <X className="mr-1 h-3 w-3" />}
            ลบรูป
          </Button>
        )}
        <p className="text-muted-foreground">JPG / PNG / WebP · สูงสุด 5MB</p>
        {error && <p className="text-destructive">{error}</p>}
      </div>
    </form>
  )
}
