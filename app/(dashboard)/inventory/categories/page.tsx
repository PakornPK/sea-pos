import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronLeft, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { addCategory, deleteCategory } from '@/lib/actions/categories'
import { AddCategoryForm } from '@/components/inventory/AddCategoryForm'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Category } from '@/types/database'

export const metadata: Metadata = {
  title: 'จัดการหมวดหมู่ | SEA-POS',
}

export default async function CategoriesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!['admin', 'manager'].includes(profile?.role ?? '')) redirect('/inventory')

  const { data } = await supabase
    .from('categories')
    .select('*')
    .order('name')

  const categories = (data ?? []) as Category[]

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <div className="flex items-center gap-3">
        <Link href="/inventory" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-semibold">จัดการหมวดหมู่</h1>
      </div>

      {/* Add form */}
      <AddCategoryForm />

      {/* Category list */}
      <div className="flex flex-col gap-2">
        {categories.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4">ยังไม่มีหมวดหมู่</p>
        ) : (
          categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between rounded-lg border px-4 py-3"
            >
              <span className="font-medium">{cat.name}</span>
              <form
                action={async () => {
                  'use server'
                  await deleteCategory(cat.id)
                }}
              >
                <button
                  type="submit"
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  title="ลบหมวดหมู่"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </form>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
