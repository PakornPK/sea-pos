import type { OptionRepository } from '@/lib/repositories/contracts/options'
import type { OptionGroup, OptionGroupWithOptions, ProductOption } from '@/types/database'
import { getDb } from './db'

export const supabaseOptionRepo: OptionRepository = {
  async listForProduct(productId: string): Promise<OptionGroupWithOptions[]> {
    const db = await getDb()
    const { data } = await db
      .from('option_groups')
      .select('*, options(*)')
      .eq('product_id', productId)
      .order('sort_order', { ascending: true })
    if (!data) return []
    return data.map((g) => ({
      ...g,
      options: ((g.options ?? []) as ProductOption[])
        .filter((o) => o.is_active)
        .sort((a, b) => a.sort_order - b.sort_order),
    })) as OptionGroupWithOptions[]
  },

  async listForProducts(productIds: string[]): Promise<Record<string, OptionGroupWithOptions[]>> {
    if (!productIds.length) return {}
    const db = await getDb()
    const { data } = await db
      .from('option_groups')
      .select('*, options(*)')
      .in('product_id', productIds)
      .order('sort_order', { ascending: true })
    if (!data) return {}
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
    const db = await getDb()
    if (input.id) {
      const { data, error } = await db
        .from('option_groups')
        .update({
          name:         input.name,
          required:     input.required,
          multi_select: input.multi_select,
          sort_order:   input.sort_order ?? 0,
        })
        .eq('id', input.id)
        .select()
        .single()
      if (error || !data) throw new Error(error?.message ?? 'บันทึกไม่สำเร็จ')
      return data as OptionGroup
    }
    const { data, error } = await db
      .from('option_groups')
      .insert({
        company_id:   companyId,
        product_id:   productId,
        name:         input.name,
        required:     input.required,
        multi_select: input.multi_select,
        sort_order:   input.sort_order ?? 0,
      })
      .select()
      .single()
    if (error || !data) throw new Error(error?.message ?? 'บันทึกไม่สำเร็จ')
    return data as OptionGroup
  },

  async deleteGroup(groupId: string): Promise<void> {
    const db = await getDb()
    await db.from('option_groups').delete().eq('id', groupId)
  },

  async saveOption(groupId, input): Promise<ProductOption> {
    const db = await getDb()
    const payload = {
      group_id:          groupId,
      name:              input.name,
      price_delta:       input.price_delta,
      sort_order:        input.sort_order ?? 0,
      linked_product_id: input.linked_product_id ?? null,
    }
    if (input.id) {
      const { data } = await db
        .from('options')
        .update(payload)
        .eq('id', input.id)
        .select()
        .single()
      return data as ProductOption
    }
    const { data } = await db
      .from('options')
      .insert(payload)
      .select()
      .single()
    return data as ProductOption
  },

  async deleteOption(optionId: string): Promise<void> {
    const db = await getDb()
    await db.from('options').delete().eq('id', optionId)
  },

  async listLinkedStockForSale(saleId: string): Promise<Array<{ linked_product_id: string; total_quantity: number }>> {
    const db = await getDb()
    // Join sale_item_options → sale_items to get the item quantity
    const { data } = await db
      .from('sale_item_options')
      .select('linked_product_id, sale_items!inner(quantity, sale_id)')
      .eq('sale_items.sale_id', saleId)
      .not('linked_product_id', 'is', null)
    if (!data) return []

    // Aggregate by linked_product_id
    const map = new Map<string, number>()
    for (const row of data) {
      const pid = row.linked_product_id as string
      const qty = (row.sale_items as unknown as { quantity: number }).quantity ?? 0
      map.set(pid, (map.get(pid) ?? 0) + qty)
    }
    return Array.from(map.entries()).map(([linked_product_id, total_quantity]) => ({
      linked_product_id,
      total_quantity,
    }))
  },

  async insertSaleItemOptions(saleItemId, options): Promise<void> {
    if (!options.length) return
    const db = await getDb()
    await db.from('sale_item_options').insert(
      options.map((o) => ({
        sale_item_id:      saleItemId,
        option_id:         o.option_id,
        group_name:        o.group_name,
        option_name:       o.option_name,
        price_delta:       o.price_delta,
        linked_product_id: o.linked_product_id ?? null,
      }))
    )
  },
}
