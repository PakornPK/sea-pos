'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { ImagePlus, Loader2 } from 'lucide-react'
import { uploadProductImage } from '@/lib/actions/storage'
import { cn } from '@/lib/utils'

type Props = {
  productId: string
  imageUrl: string | null
  productName: string
  canEdit?: boolean
  size?: number  // pixels
}

/**
 * A square product thumbnail that doubles as an inline upload target.
 * Click → opens file picker → uploads → server action writes URL to DB
 * and revalidates the page (Next.js re-renders with the new URL).
 * When `canEdit` is false, it's a read-only thumbnail.
 */
export function ProductThumb({
  productId, imageUrl, productName, canEdit = false, size = 40,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const uploadWith = uploadProductImage.bind(null, productId)
  const [state, formAction, pending] = useActionState(uploadWith, undefined)
  const [preview, setPreview] = useState<string | null>(imageUrl)

  useEffect(() => { setPreview(imageUrl) }, [imageUrl])
  useEffect(() => {
    if (state?.url) setPreview(state.url)
  }, [state])

  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPreview(URL.createObjectURL(file))
    e.target.form?.requestSubmit()
  }

  const body = (
    <div
      className={cn(
        'relative overflow-hidden rounded-md border bg-muted grid place-items-center',
        canEdit && 'cursor-pointer hover:border-primary'
      )}
      style={{ width: size, height: size }}
    >
      {preview ? (
        <Image
          src={preview}
          alt={productName}
          fill
          className="object-cover"
          sizes={`${size}px`}
          unoptimized
        />
      ) : (
        <ImagePlus className="h-4 w-4 text-muted-foreground" />
      )}
      {pending && (
        <div className="absolute inset-0 grid place-items-center bg-background/70">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
        </div>
      )}
    </div>
  )

  if (!canEdit) return body

  return (
    <form action={formAction}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={pending}
        className="block disabled:opacity-60"
        title="คลิกเพื่อเปลี่ยนรูป"
      >
        {body}
      </button>
      <input
        ref={inputRef}
        type="file"
        name="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onFileSelected}
        disabled={pending}
        className="hidden"
      />
      {state?.error && (
        <p className="mt-1 text-[10px] text-destructive max-w-[100px]">{state.error}</p>
      )}
    </form>
  )
}
