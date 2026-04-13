import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

type ResettableState = { success?: boolean } | undefined

/**
 * Wires the standard "form submit → reset fields + close panel + refresh"
 * pattern used by CustomerForm, SupplierForm, and AddUserForm.
 *
 * Pass the useActionState() result, the form ref, and what should happen
 * on success. Returns nothing — the effect runs when state.success flips true.
 */
export function useFormReset(
  state: ResettableState,
  opts: {
    resetForm?: boolean
    onSuccess?: () => void
    refreshRouter?: boolean
  } = {}
) {
  const router = useRouter()
  const { resetForm = true, onSuccess, refreshRouter = true } = opts
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (!state?.success) return
    if (resetForm) formRef.current?.reset()
    onSuccess?.()
    if (refreshRouter) router.refresh()
  }, [state, resetForm, onSuccess, refreshRouter, router])

  return formRef
}
