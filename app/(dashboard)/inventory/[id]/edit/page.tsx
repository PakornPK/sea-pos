import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { requirePageRole } from '@/lib/auth'
import { productRepo, categoryRepo, optionRepo, productCostItemRepo, productStockRepo } from '@/lib/repositories'
import { EditProductForm } from '@/components/inventory/EditProductForm'
import { ProductImageUpload } from '@/components/inventory/ProductImageUpload'
import { OptionGroupManager } from '@/components/inventory/OptionGroupManager'
import { CostStructureEditor } from '@/components/inventory/CostStructureEditor'
import { ConvertStockUnitForm } from '@/components/inventory/ConvertStockUnitForm'
import { Separator } from '@/components/ui/separator'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'แก้ไขสินค้า | SEA-POS',
}

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requirePageRole(['admin', 'manager'])
  const { id } = await params

  const [product, categories, optionGroups, allProducts, costItems] = await Promise.all([
    productRepo.getById(id),
    categoryRepo.list(),
    optionRepo.listForProduct(id),
    productRepo.listAll(),
    productCostItemRepo.listForProduct(id),
  ])

  const branchStocks = product?.track_stock
    ? await productStockRepo.listForProduct(id)
    : []

  if (!product) notFound()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/inventory" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-[26px] font-bold tracking-tight">แก้ไขสินค้า</h1>
      </div>

      <div className="flex flex-col gap-6 max-w-md">
        <ProductImageUpload productId={product.id} currentUrl={product.image_url} />
        <EditProductForm product={product} categories={categories} />
        <Separator />
        <CostStructureEditor productId={product.id} items={costItems} allProducts={allProducts} categories={categories} />
        <Separator />
        <OptionGroupManager productId={product.id} groups={optionGroups} allProducts={allProducts} categories={categories} />
        {product.track_stock && (
          <>
            <Separator />
            <div className="space-y-2">
              <h2 className="text-[15px] font-semibold tracking-tight">แปลงหน่วยสต๊อก</h2>
              <p className="text-[13px] text-muted-foreground">
                เปลี่ยนหน่วยและคูณจำนวนสต๊อกในทุกสาขาด้วยตัวคูณที่ระบุ
              </p>
              <ConvertStockUnitForm
                productId={product.id}
                currentUnit={product.unit ?? 'หน่วย'}
                minStock={product.min_stock ?? 0}
                branchStocks={branchStocks}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
