import type { OptionRepository } from '@/lib/repositories/contracts/options'
import type { OptionGroup, OptionGroupWithOptions, ProductOption } from '@/types/database'
import { restGet, restPost, restPatchById, restDeleteById } from '@/lib/api/rest'

export const fetchOptionRepo: OptionRepository = {
  async listForProduct(productId: string): Promise<OptionGroupWithOptions[]> {
    const data = await restGet<Array<OptionGroup & { options?: ProductOption[] }>>('option_groups', {
      select:    '*,options(*)',
      product_id: `eq.${productId}`,
      order:     'sort_order.asc',
    })
    return data.map((g) => ({
      ...g,
      options: ((g.options ?? []) as ProductOption[])
        .filter((o) => o.is_active)
        .sort((a, b) => a.sort_order - b.sort_order),
    }))
  },

  async listForProducts(productIds: string[]): Promise<Record<string, OptionGroupWithOptions[]>> {
    if (!productIds.length) return {}
    const data = await restGet<Array<OptionGroup & { options?: ProductOption[] }>>('option_groups', {
      select:     '*,options(*)',
      product_id: `in.(${productIds.join(',')})`,
      order:      'sort_order.asc',
    })
    const map: Record<string, OptionGroupWithOptions[]> = {}
    for (const g of data) {
      const group: OptionGroupWithOptions = {
        ...g,
        options: ((g.options ?? []) as ProductOption[])
          .filter((o) => o.is_active)
          .sort((a, b) => a.sort_order - b.sort_order),
      }
      if (!map[g.product_id]) map[g.product_id] = []
      map[g.product_id].push(group)
    }
    return map
  },

  async saveGroup(productId, companyId, input): Promise<OptionGroup> {
    if (input.id) {
      const row = await restPatchById<OptionGroup>('option_groups', input.id!, {
        name:         input.name,
        required:     input.required,
        multi_select: input.multi_select,
        sort_order:   input.sort_order ?? 0,
      })
      if (!row) throw new Error('บันทึกไม่สำเร็จ')
      return row
    }
    const rows = await restPost<Array<OptionGroup>>('option_groups', {
      company_id:   companyId,
      product_id:   productId,
      name:         input.name,
      required:     input.required,
      multi_select: input.multi_select,
      sort_order:   input.sort_order ?? 0,
    })
    const row = Array.isArray(rows) ? rows[0] : rows as OptionGroup
    if (!row) throw new Error('บันทึกไม่สำเร็จ')
    return row
  },

  async deleteGroup(groupId: string): Promise<void> {
    await restDeleteById('option_groups', groupId)
  },

  async saveOption(groupId, input): Promise<ProductOption> {
    const payload = {
      group_id:          groupId,
      name:              input.name,
      price_delta:       input.price_delta,
      sort_order:        input.sort_order ?? 0,
      linked_product_id: input.linked_product_id ?? null,
      quantity_per_use:  input.quantity_per_use ?? 1,
    }
    if (input.id) {
      const row = await restPatchById<ProductOption>('options', input.id!, payload)
      return row!
    }
    const rows = await restPost<Array<ProductOption>>('options', payload)
    return Array.isArray(rows) ? rows[0] : rows as ProductOption
  },

  async deleteOption(optionId: string): Promise<void> {
    await restDeleteById('options', optionId)
  },

  async listLinkedStockForSale(saleId: string): Promise<Array<{ linked_product_id: string; total_quantity: number }>> {
    // Join sale_item_options → sale_items for the given sale
    const data = await restGet<Array<{
      linked_product_id: string | null
      sale_items: { quantity: number; sale_id: string } | Array<{ quantity: number; sale_id: string }> | null
    }>>('sale_item_options', {
      select:          'linked_product_id,sale_items!inner(quantity,sale_id)',
      'sale_items.sale_id': `eq.${saleId}`,
    })

    const map = new Map<string, number>()
    for (const row of data) {
      if (!row.linked_product_id) continue
      const si = Array.isArray(row.sale_items) ? row.sale_items[0] : row.sale_items
      const qty = si?.quantity ?? 0
      map.set(row.linked_product_id, (map.get(row.linked_product_id) ?? 0) + Number(qty))
    }
    return Array.from(map.entries()).map(([linked_product_id, total_quantity]) => ({
      linked_product_id,
      total_quantity,
    }))
  },

  async insertSaleItemOptions(saleItemId, options): Promise<void> {
    if (!options.length) return
    await restPost('sale_item_options', options.map((o) => ({
      sale_item_id:      saleItemId,
      option_id:         o.option_id,
      group_name:        o.group_name,
      option_name:       o.option_name,
      price_delta:       o.price_delta,
      linked_product_id: o.linked_product_id ?? null,
    })))
  },
}
