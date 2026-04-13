'use client'

import { useState, useTransition } from 'react'
import { Pencil, Trash2, KeyRound, X, Check } from 'lucide-react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { deleteUser, resetUserPassword, updateUser } from '@/lib/actions/users'
import type { UserRole } from '@/types/database'

export type UserRow = {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  created_at: string
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin:      'ผู้ดูแลระบบ',
  manager:    'ผู้จัดการ',
  cashier:    'พนักงานเก็บเงิน',
  purchasing: 'จัดซื้อ',
}

const ROLE_VARIANT: Record<UserRole, 'default' | 'secondary' | 'outline'> = {
  admin:      'default',
  manager:    'secondary',
  cashier:    'outline',
  purchasing: 'outline',
}

type UserTableProps = {
  users: UserRow[]
  currentUserId: string
}

export function UserTable({ users, currentUserId }: UserTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [resettingId, setResettingId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleDelete(id: string, email: string) {
    if (!confirm(`ยืนยันการลบผู้ใช้ "${email}"?`)) return
    setError(null)
    startTransition(async () => {
      try {
        await deleteUser(id)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'ลบผู้ใช้ไม่สำเร็จ')
      }
    })
  }

  function handleUpdate(formData: FormData) {
    setError(null)
    startTransition(async () => {
      try {
        await updateUser(formData)
        setEditingId(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'แก้ไขไม่สำเร็จ')
      }
    })
  }

  function handleReset(formData: FormData) {
    setError(null)
    startTransition(async () => {
      try {
        await resetUserPassword(formData)
        setResettingId(null)
        alert('เปลี่ยนรหัสผ่านสำเร็จ')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'เปลี่ยนรหัสผ่านไม่สำเร็จ')
      }
    })
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>อีเมล</TableHead>
            <TableHead>ชื่อ-สกุล</TableHead>
            <TableHead>บทบาท</TableHead>
            <TableHead className="text-right">จัดการ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => {
            const isMe = u.id === currentUserId
            const isEditing = editingId === u.id
            const isResetting = resettingId === u.id

            if (isEditing) {
              return (
                <TableRow key={u.id}>
                  <TableCell colSpan={4} className="p-0">
                    <form action={handleUpdate} className="flex flex-wrap items-end gap-3 bg-muted/30 p-3">
                      <input type="hidden" name="id" value={u.id} />
                      <div className="flex-1 min-w-[180px]">
                        <Label className="text-xs">อีเมล</Label>
                        <Input value={u.email} disabled />
                      </div>
                      <div className="flex-1 min-w-[180px]">
                        <Label className="text-xs" htmlFor={`name-${u.id}`}>ชื่อ-สกุล</Label>
                        <Input
                          id={`name-${u.id}`}
                          name="full_name"
                          defaultValue={u.full_name ?? ''}
                          disabled={pending}
                        />
                      </div>
                      <div className="min-w-[160px]">
                        <Label className="text-xs" htmlFor={`role-${u.id}`}>บทบาท</Label>
                        <select
                          id={`role-${u.id}`}
                          name="role"
                          defaultValue={u.role}
                          disabled={pending}
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                        >
                          {Object.entries(ROLE_LABELS).map(([v, l]) => (
                            <option key={v} value={v}>{l}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex gap-1.5">
                        <Button type="submit" size="sm" disabled={pending}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingId(null)}
                          disabled={pending}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </form>
                  </TableCell>
                </TableRow>
              )
            }

            if (isResetting) {
              return (
                <TableRow key={u.id}>
                  <TableCell colSpan={4} className="p-0">
                    <form action={handleReset} className="flex flex-wrap items-end gap-3 bg-muted/30 p-3">
                      <input type="hidden" name="id" value={u.id} />
                      <div className="flex-1 min-w-[200px]">
                        <Label className="text-xs">เปลี่ยนรหัสผ่านของ {u.email}</Label>
                        <Input
                          name="password"
                          type="password"
                          placeholder="อย่างน้อย 8 ตัวอักษร"
                          minLength={8}
                          required
                          disabled={pending}
                        />
                      </div>
                      <div className="flex gap-1.5">
                        <Button type="submit" size="sm" disabled={pending}>
                          บันทึก
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setResettingId(null)}
                          disabled={pending}
                        >
                          ยกเลิก
                        </Button>
                      </div>
                    </form>
                  </TableCell>
                </TableRow>
              )
            }

            return (
              <TableRow key={u.id}>
                <TableCell className="font-medium">
                  {u.email}
                  {isMe && <span className="ml-2 text-xs text-muted-foreground">(คุณ)</span>}
                </TableCell>
                <TableCell>{u.full_name || <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell>
                  <Badge variant={ROLE_VARIANT[u.role]}>{ROLE_LABELS[u.role]}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingId(u.id)}
                      disabled={pending}
                      title="แก้ไข"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setResettingId(u.id)}
                      disabled={pending}
                      title="เปลี่ยนรหัสผ่าน"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(u.id, u.email)}
                      disabled={pending || isMe}
                      title={isMe ? 'ไม่สามารถลบบัญชีตัวเองได้' : 'ลบผู้ใช้'}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
