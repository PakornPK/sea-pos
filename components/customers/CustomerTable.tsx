'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, UserPlus } from 'lucide-react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CustomerForm } from '@/components/customers/CustomerForm'
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
}

export function CustomerTable({ customers, canManage }: Props) {
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState(false)

  const q = search.trim().toLowerCase()
  const filtered = q
    ? customers.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone ?? '').toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q)
      )
    : customers

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ค้นหา ชื่อ เบอร์ อีเมล..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {canManage && !adding && (
          <Button size="sm" onClick={() => setAdding(true)}>
            <UserPlus className="mr-1 h-4 w-4" />
            เพิ่มลูกค้า
          </Button>
        )}
      </div>

      {adding && <CustomerForm onDone={() => setAdding(false)} />}

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          {q ? 'ไม่พบลูกค้าที่ตรงกับการค้นหา' : 'ยังไม่มีลูกค้าในระบบ'}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ชื่อ</TableHead>
              <TableHead>เบอร์โทร</TableHead>
              <TableHead>อีเมล</TableHead>
              <TableHead className="text-right">จำนวนบิล</TableHead>
              <TableHead className="text-right">ยอดซื้อรวม</TableHead>
              <TableHead>ซื้อล่าสุด</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c) => (
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
