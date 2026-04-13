import type { PurchaseOrderStatus, UserRole } from '@/types/database'

// ─── Roles ────────────────────────────────────────────────────
export const ROLE_LABELS: Record<UserRole, string> = {
  admin:      'ผู้ดูแลระบบ',
  manager:    'ผู้จัดการ',
  cashier:    'พนักงานเก็บเงิน',
  purchasing: 'จัดซื้อ',
}

export const ROLE_BADGE_VARIANT: Record<UserRole, 'default' | 'secondary' | 'outline'> = {
  admin:      'default',
  manager:    'secondary',
  cashier:    'outline',
  purchasing: 'outline',
}

// ─── Payment methods ──────────────────────────────────────────
export type PaymentMethod = 'cash' | 'card' | 'transfer'

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  cash:     'เงินสด',
  card:     'บัตร',
  transfer: 'โอนเงิน',
}

// ─── Sale status ──────────────────────────────────────────────
export type SaleStatus = 'completed' | 'voided'

export const SALE_STATUS_LABEL: Record<SaleStatus, string> = {
  completed: 'สำเร็จ',
  voided:    'ยกเลิกแล้ว',
}

// ─── Purchase order status ────────────────────────────────────
export const PO_STATUS_LABEL: Record<PurchaseOrderStatus, string> = {
  draft:     'ฉบับร่าง',
  ordered:   'สั่งซื้อแล้ว',
  received:  'รับของแล้ว',
  cancelled: 'ยกเลิก',
}

export const PO_STATUS_VARIANT: Record<
  PurchaseOrderStatus,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  draft:     'outline',
  ordered:   'default',
  received:  'secondary',
  cancelled: 'destructive',
}
