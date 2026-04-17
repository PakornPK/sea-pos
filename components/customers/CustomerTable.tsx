'use client'

import { useState } from 'react'
import Link from 'next/link'
import { UserPlus } from 'lucide-react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { CustomerForm } from '@/components/customers/CustomerForm'
import { CustomerSearch } from '@/components/customers/CustomerSearch'
import { SortableHeader } from '@/components/ui/SortableHeader'
import { sortRows, type SortDir } from '@/lib/sort'
import { formatBaht, formatDate } from '@/lib/format'
import type { UserRole } from '@/types/database'

export type CustomerRow = {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  created_at: string
  total_spent: number
  order_count: number
  last_order_at: string | null
}

type Props = {
  customers: CustomerRow[]
  canManage: boolean
  role: UserRole
  currentSearch: string
}

type SortCol = 'name' | 'total_spent' | 'order_count' | 'last_order_at'

export function CustomerTable({ customers, canManage, currentSearch }: Props) {
  const [adding, setAdding] = useState(false)
  const [sortCol, setSortCol] = useState<SortCol>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  function toggleSort(col: SortCol) {
    if (col === sortCol) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortCol(col); setSortDir('asc') }
  }

  const sorted = sortRows(customers, sortCol as keyof CustomerRow, sortDir)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <CustomerSearch initial={currentSearch} />
        {canManage && !adding && (
          <Button size="sm" onClick={() => setAdding(true)}>
            <UserPlus className="mr-1 h-4 w-4" />
            เพิ่มลูกค้า
          </Button>
        )}
      </div>

      {adding && <CustomerForm onDone={() => setAdding(false)} />}

      {customers.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          {currentSearch ? 'ไม่พบลูกค้าที่ตรงกับการค้นหา' : 'ยังไม่มีลูกค้าในระบบ'}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortableHeader label="ชื่อ" active={sortCol === 'name'} dir={sortDir} onClick={() => toggleSort('name')} />
              </TableHead>
              <TableHead>เบอร์โทร</TableHead>
              <TableHead>อีเมล</TableHead>
              <TableHead className="text-right">
                <SortableHeader label="จำนวนบิล" active={sortCol === 'order_count'} dir={sortDir} onClick={() => toggleSort('order_count')} />
              </TableHead>
              <TableHead className="text-right">
                <SortableHeader label="ยอดซื้อรวม" active={sortCol === 'total_spent'} dir={sortDir} onClick={() => toggleSort('total_spent')} />
              </TableHead>
              <TableHead>
                <SortableHeader label="ซื้อล่าสุด" active={sortCol === 'last_order_at'} dir={sortDir} onClick={() => toggleSort('last_order_at')} />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((c) => (
              <TableRow key={c.id} className="cursor-pointer">
                <TableCell className="font-medium">
                  <Link href={`/customers/${c.id}`} className="hover:underline">
                    {c.name}
                  </Link>
                </TableCell>
                <TableCell>{c.phone || <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell>{c.email || <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell className="text-right tabular-nums">{c.order_count}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatBaht(c.total_spent)}
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {formatDate(c.last_order_at)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
