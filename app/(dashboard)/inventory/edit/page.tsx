'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { productRepo, categoryRepo, optionRepo, productCostItemRepo, productStockRepo } from '@/lib/repositories'
import { EditProductForm } from '@/components/inventory/EditProductForm'
import { ProductImageUpload } from '@/components/inventory/ProductImageUpload'
import { OptionGroupManager } from '@/components/inventory/OptionGroupManager'
import { CostStructureEditor } from '@/components/inventory/CostStructureEditor'
import { ConvertStockUnitForm } from '@/components/inventory/ConvertStockUnitForm'
import { Separator } from '@/components/ui/separator'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Product, Category } from '@/types/database'

type OptionGroup = Awaited<ReturnType<typeof optionRepo.listForProduct>>[number]
type CostItem = Awaited<ReturnType<typeof productCostItemRepo.listForProduct>>[number]
type BranchStock = Awaited<ReturnType<typeof productStockRepo.listForProduct>>[number]

export default function EditProductPage() {
  const id = useSearchParams().get('id') ?? ''

  const [product, setProduct] = useState<Product | null | undefined>(undefined)
  const [categories, setCategories] = useState<Category[]>([])
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [costItems, setCostItems] = useState<CostItem[]>([])
  const [branchStocks, setBranchStocks] = useState<BranchStock[]>([])

  useEffect(() => {
    if (!id) return

    Promise.all([
      productRepo.getById(id),
      categoryRepo.list(),
      optionRepo.listForProduct(id),
      productRepo.listAll(),
      productCostItemRepo.listForProduct(id),
    ]).then(async ([prod, cats, opts, allProds, costs]) => {
      setProduct(prod ?? null)
      setCategories(cats)
      setOptionGroups(opts)
      setAllProducts(allProds)
      setCostItems(costs)
      if (prod?.track_stock) {
        const stocks = await productStockRepo.listForProduct(id)
        setBranchStocks(stocks)
      }
    })
  }, [id])

  if (product === undefined) return null  // loading
  if (!product) notFound()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/inventory/" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
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
