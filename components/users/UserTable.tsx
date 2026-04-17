'use client'

import { useState, useTransition } from 'react'
import { MapPin, Pencil, Trash2, KeyRound, LogOut, X, Check, Star } from 'lucide-react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { SortableHeader } from '@/components/ui/SortableHeader'
import { sortRows, type SortDir } from '@/lib/sort'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import {
  deleteUser, forceSignOutUser, resetUserPassword, updateUser, updateUserBranches,
} from '@/lib/actions/users'
import { BranchMultiSelect } from '@/components/users/BranchMultiSelect'
import { ROLE_LABELS, ROLE_BADGE_VARIANT } from '@/lib/labels'
import type { Branch, UserRole } from '@/types/database'

export type UserRow = {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  created_at: string
  branches: Branch[]        // assigned branches, default first
  default_branch_id: string | null
}


type UserTableProps = {
  users: UserRow[]
  currentUserId: string
  allBranches: Branch[]     // every branch in the company (for the editor)
}

type SortCol = 'email' | 'full_name' | 'role'

export function UserTable({ users, currentUserId, allBranches }: UserTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [resettingId, setResettingId] = useState<string | null>(null)
  const [branchEditingId, setBranchEditingId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [sortCol, setSortCol] = useState<SortCol>('email')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  function toggleSort(col: SortCol) {
    if (col === sortCol) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortCol(col); setSortDir('asc') }
  }

  const sorted = sortRows(users, sortCol as keyof UserRow, sortDir)

  function handleBranchSave(formData: FormData) {
    setError(null)
    startTransition(async () => {
      try {
        await updateUserBranches(formData)
        setBranchEditingId(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'บันทึกสาขาไม่สำเร็จ')
      }
    })
  }

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

  function handleForceSignOut(id: string, email: string) {
    if (!confirm(`บังคับออกจากระบบสำหรับ "${email}"? (ทำให้ token บนทุกอุปกรณ์ใช้ไม่ได้)`)) return
    setError(null)
    startTransition(async () => {
      try {
        await forceSignOutUser(id)
        alert('บังคับออกจากระบบสำเร็จ')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'บังคับออกจากระบบไม่สำเร็จ')
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
            <TableHead>
              <SortableHeader label="อีเมล" active={sortCol === 'email'} dir={sortDir} onClick={() => toggleSort('email')} />
            </TableHead>
            <TableHead>
              <SortableHeader label="ชื่อ-สกุล" active={sortCol === 'full_name'} dir={sortDir} onClick={() => toggleSort('full_name')} />
            </TableHead>
            <TableHead>
              <SortableHeader label="บทบาท" active={sortCol === 'role'} dir={sortDir} onClick={() => toggleSort('role')} />
            </TableHead>
            <TableHead>สาขา</TableHead>
            <TableHead className="text-right">จัดการ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((u) => {
            const isMe = u.id === currentUserId
            const isEditing = editingId === u.id
            const isResetting = resettingId === u.id

            if (isEditing) {
              return (
                <TableRow key={u.id}>
                  <TableCell colSpan={5} className="p-0">
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
                        <NativeSelect
                          id={`role-${u.id}`}
                          name="role"
                          defaultValue={u.role}
                          disabled={pending}
                        >
                          {Object.entries(ROLE_LABELS).map(([v, l]) => (
                            <option key={v} value={v}>{l}</option>
                          ))}
                        </NativeSelect>
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

            const isBranchEditing = branchEditingId === u.id
            if (isBranchEditing) {
              return (
                <TableRow key={u.id}>
                  <TableCell colSpan={5} className="p-0">
                    <form action={handleBranchSave} className="flex flex-col gap-3 bg-muted/30 p-3">
                      <input type="hidden" name="id" value={u.id} />
                      <div>
                        <Label className="text-xs">สาขาของ {u.email}</Label>
                        <div className="mt-1.5">
                          <BranchMultiSelect
                            branches={allBranches}
                            initialBranchIds={u.branches.map((b) => b.id)}
                            initialDefaultId={u.default_branch_id}
                            disabled={pending}
                          />
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <Button type="submit" size="sm" disabled={pending}>บันทึก</Button>
                        <Button
                          type="button" size="sm" variant="outline"
                          onClick={() => setBranchEditingId(null)} disabled={pending}
                        >
                          ยกเลิก
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
                  <TableCell colSpan={5} className="p-0">
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
                  <Badge variant={ROLE_BADGE_VARIANT[u.role]}>{ROLE_LABELS[u.role]}</Badge>
                </TableCell>
                <TableCell>
                  {u.branches.length === 0 ? (
                    <span className="text-xs text-destructive">— ไม่มี —</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {u.branches.map((b) => (
                        <span
                          key={b.id}
                          className="inline-flex items-center gap-0.5 rounded-full border bg-muted/40 px-1.5 py-0.5 text-[10px]"
                          title={b.name}
                        >
                          {b.id === u.default_branch_id && <Star className="h-2.5 w-2.5 fill-current text-primary" />}
                          <MapPin className="h-2.5 w-2.5" />
                          {b.code}
                        </span>
                      ))}
                    </div>
                  )}
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
                      onClick={() => setBranchEditingId(u.id)}
                      disabled={pending}
                      title="แก้ไขสาขา"
                    >
                      <MapPin className="h-3.5 w-3.5" />
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
                      onClick={() => handleForceSignOut(u.id, u.email)}
                      disabled={pending || isMe}
                      title={isMe ? 'ใช้ปุ่ม ออกจากระบบ สำหรับบัญชีของคุณ' : 'บังคับออกจากระบบทุกอุปกรณ์'}
                    >
                      <LogOut className="h-3.5 w-3.5" />
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
