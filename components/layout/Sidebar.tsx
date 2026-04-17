'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTransition } from 'react'
import {
  LayoutDashboard, Package, ShoppingCart, ScrollText, Truck, Users,
  BarChart2, LogOut, UserCog, Settings, Building2, Shield, PackageOpen,
  MapPin, ArrowLeftRight, CircleUserRound, FileText, SlidersHorizontal, Gauge, CreditCard, Star, PieChart,
} from 'lucide-react'
import type { Branch, UserRole } from '@/types/database'
import { cn } from '@/lib/utils'
import { signOut } from '@/lib/actions/auth'

type NavItem = {
  href: string
  label: string
  icon: React.ElementType
  roles: UserRole[]
}

type NavSection = {
  label: string | null
  items: NavItem[]
}

const CUSTOMER_SECTIONS: NavSection[] = [
  {
    label: null,
    items: [
      { href: '/dashboard',           label: 'ภาพรวม',      icon: LayoutDashboard, roles: ['admin', 'manager'] },
      { href: '/pos',                  label: 'ขายสินค้า',   icon: ShoppingCart,    roles: ['admin', 'manager', 'cashier'] },
      { href: '/pos/sales',            label: 'รายการขาย',   icon: ScrollText,      roles: ['admin', 'manager'] },
      { href: '/inventory',            label: 'คลังสินค้า',  icon: Package,         roles: ['admin', 'manager', 'purchasing'] },
      { href: '/inventory/transfers',  label: 'โอนสต๊อก',   icon: ArrowLeftRight,  roles: ['admin', 'manager', 'purchasing'] },
    ],
  },
  {
    label: 'จัดการ',
    items: [
      { href: '/purchasing', label: 'จัดซื้อ',  icon: Truck,    roles: ['admin', 'manager', 'purchasing'] },
      { href: '/customers',  label: 'ลูกค้า',   icon: Users,    roles: ['admin', 'manager', 'cashier'] },
      { href: '/members',         label: 'สมาชิก',        icon: Star,      roles: ['admin', 'manager', 'cashier'] },
      { href: '/members/report',  label: 'รายงานสมาชิก',  icon: PieChart,  roles: ['admin', 'manager'] },
      { href: '/reports',    label: 'รายงาน',   icon: BarChart2, roles: ['admin', 'manager'] },
    ],
  },
  {
    label: 'ตั้งค่า',
    items: [
      { href: '/users',                  label: 'ผู้ใช้งาน', icon: UserCog,  roles: ['admin'] },
      { href: '/settings/branches',      label: 'สาขา',      icon: MapPin,   roles: ['admin'] },
      { href: '/settings/membership',    label: 'แต้มสมาชิก', icon: Star,     roles: ['admin'] },
      { href: '/settings/company',       label: 'บริษัท',    icon: Settings, roles: ['admin'] },
    ],
  },
]

const PLATFORM_SECTIONS: NavSection[] = [
  {
    label: null,
    items: [
      { href: '/platform',           label: 'ภาพรวม',        icon: Gauge,            roles: [] },
      { href: '/platform/companies',     label: 'บริษัทลูกค้า',  icon: Building2,         roles: [] },
      { href: '/platform/subscriptions', label: 'Subscriptions', icon: CreditCard,        roles: [] },
      { href: '/platform/plans',         label: 'แพ็กเกจ',       icon: PackageOpen,       roles: [] },
      { href: '/platform/invoices',      label: 'ใบกำกับภาษี',    icon: FileText,          roles: [] },
      { href: '/platform/settings',  label: 'ตั้งค่า',       icon: SlidersHorizontal, roles: [] },
    ],
  },
]

type SidebarProps = {
  role: UserRole
  isPlatformAdmin: boolean
  activeBranch: Branch | null
  fullName: string
  email: string
}


export function Sidebar({ role, isPlatformAdmin, activeBranch, fullName, email }: SidebarProps) {
  const pathname = usePathname()

  const sections = isPlatformAdmin
    ? PLATFORM_SECTIONS
    : CUSTOMER_SECTIONS.map((s) => ({
        ...s,
        items: s.items.filter((item) => item.roles.includes(role)),
      })).filter((s) => s.items.length > 0)

  const allItems = sections.flatMap((s) => s.items)

  const activeHref = allItems.reduce<string | null>((best, item) => {
    const match = item.href === '/pos'
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(item.href + '/')
    if (match) {
      if (!best || item.href.length > best.length) return item.href
    }
    return best
  }, null)

  const isActive = (href: string) => href === activeHref
  const displayName = fullName.trim() || email
  const [, startSignOut] = useTransition()

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col bg-sidebar border-r border-sidebar-border">
      {/* Brand */}
      <div className="flex h-[60px] items-center gap-2.5 px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-primary shadow-sm">
          <span className="text-[13px] font-bold text-primary-foreground">S</span>
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-[15px] font-semibold tracking-tight text-foreground">SEA-POS</span>
          {isPlatformAdmin && (
            <span className="mt-0.5 flex items-center gap-1 text-[10px] font-medium text-primary">
              <Shield className="h-2.5 w-2.5" />
              แพลตฟอร์ม
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-1">
        {sections.map((section, si) => (
          <div key={si} className={cn(si > 0 && 'mt-4')}>
            {section.label && (
              <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                {section.label}
              </p>
            )}
            <div className="flex flex-col gap-0.5">
              {section.items.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-2.5 rounded-xl px-3 py-2 text-[14px] font-medium transition-colors',
                    isActive(href)
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  )}
                >
                  <Icon className={cn('h-[18px] w-[18px] shrink-0', isActive(href) ? 'opacity-100' : 'opacity-60')} />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Active branch pill */}
      {activeBranch && !isPlatformAdmin && (
        <div className="px-3 pb-1">
          <div className="flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1.5">
            <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />
            <span className="truncate text-[12px] text-muted-foreground">
              {activeBranch.name}
            </span>
            <span className="ml-auto text-[11px] font-medium text-muted-foreground/60">
              {activeBranch.code}
            </span>
          </div>
        </div>
      )}

      {/* User row + logout */}
      <div className="border-t border-sidebar-border p-2">
        <button
          type="button"
          title="ออกจากระบบ"
          onClick={() => startSignOut(() => { signOut() })}
          className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-destructive/10 hover:text-destructive group"
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-destructive/10 group-hover:text-destructive transition-colors">
            <CircleUserRound className="h-4 w-4" />
          </div>
          <span className="flex-1 truncate text-left text-[13px] font-medium text-foreground group-hover:text-destructive transition-colors">
            {displayName}
          </span>
          <LogOut className="h-3.5 w-3.5 text-muted-foreground group-hover:text-destructive transition-colors" />
        </button>
      </div>
    </aside>
  )
}
