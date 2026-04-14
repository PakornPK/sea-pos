'use client'

import { useState, useTransition } from 'react'
import { Pencil, Trash2, UserPlus } from 'lucide-react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { SupplierForm } from '@/components/purchasing/SupplierForm'
import { deleteSupplier } from '@/lib/actions/suppliers'
import type { Supplier, UserRole } from '@/types/database'

type Props = {
  suppliers: Supplier[]
  role: UserRole
}

export function SupplierTable({ suppliers, role }: Props) {
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const canDelete = role === 'admin'

  function handleDelete(id: string, name: string) {
    if (!confirm(`ยืนยันการลบผู้จำหน่าย "${name}"?`)) return
    setError(null)
    startTransition(async () => {
      try {
        await deleteSupplier(id)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'ลบไม่สำเร็จ')
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          ทั้งหมด {suppliers.length} ราย
        </p>
        {!adding && (
          <Button size="sm" onClick={() => setAdding(true)}>
            <UserPlus className="mr-1 h-4 w-4" />
            เพิ่มผู้จำหน่าย
          </Button>
        )}
      </div>

      {adding && <SupplierForm onDone={() => setAdding(false)} />}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {suppliers.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          ยังไม่มีผู้จำหน่ายในระบบ
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ชื่อผู้จำหน่าย</TableHead>
              <TableHead>ผู้ติดต่อ</TableHead>
              <TableHead>เบอร์โทร</TableHead>
              <TableHead>อีเมล</TableHead>
              <TableHead className="text-right">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.map((s) => {
              if (editingId === s.id) {
                return (
                  <TableRow key={s.id}>
                    <TableCell colSpan={5} className="p-0">
                      <div className="p-3">
                        <SupplierForm
                          supplier={s}
                          onDone={() => setEditingId(null)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                )
              }
              return (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.contact_name || <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell>{s.phone || <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell>{s.email || <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => setEditingId(s.id)} disabled={pending}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {canDelete && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(s.id, s.name)}
                          disabled={pending}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
