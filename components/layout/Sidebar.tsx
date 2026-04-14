'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Package, ShoppingCart, ScrollText, Truck, Users,
  BarChart2, LogOut, UserCog, Settings, Building2, Shield, PackageOpen,
  MapPin, ArrowLeftRight,
} from 'lucide-react'
import type { Branch } from '@/types/database'
import { cn } from '@/lib/utils'
import { signOut } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import type { UserRole } from '@/types/database'

type NavItem = {
  href: string
  label: string
  icon: React.ElementType
  roles: UserRole[]
}

const CUSTOMER_NAV: NavItem[] = [
  { href: '/dashboard',  label: 'ภาพรวมร้าน',   icon: LayoutDashboard, roles: ['admin', 'manager'] },
  { href: '/inventory',            label: 'คลังสินค้า', icon: Package,         roles: ['admin', 'manager', 'purchasing'] },
  { href: '/inventory/transfers',  label: 'โอนสต๊อก',   icon: ArrowLeftRight,  roles: ['admin', 'manager', 'purchasing'] },
  { href: '/pos',        label: 'ขายสินค้า',   icon: ShoppingCart, roles: ['admin', 'manager', 'cashier'] },
  { href: '/pos/sales',  label: 'รายการขาย',   icon: ScrollText,   roles: ['admin', 'manager'] },
  { href: '/purchasing', label: 'จัดซื้อ',     icon: Truck,        roles: ['admin', 'manager', 'purchasing'] },
  { href: '/customers',  label: 'ลูกค้า',      icon: Users,        roles: ['admin', 'manager', 'cashier'] },
  { href: '/reports',    label: 'รายงาน',      icon: BarChart2,    roles: ['admin', 'manager'] },
  { href: '/users',            label: 'ผู้ใช้งาน',   icon: UserCog,  roles: ['admin'] },
  { href: '/settings/branches', label: 'สาขา',        icon: MapPin,   roles: ['admin'] },
  { href: '/settings/company',  label: 'ตั้งค่าบริษัท', icon: Settings, roles: ['admin'] },
]

const PLATFORM_NAV: Array<{ href: string; label: string; icon: React.ElementType }> = [
  { href: '/platform/companies', label: 'บริษัทลูกค้า', icon: Building2 },
  { href: '/platform/plans',     label: 'แพ็กเกจ',      icon: PackageOpen },
]

type SidebarProps = {
  role: UserRole
  isPlatformAdmin: boolean
  activeBranch: Branch | null
}

export function Sidebar({ role, isPlatformAdmin, activeBranch }: SidebarProps) {
  const pathname = usePathname()

  const items = isPlatformAdmin
    ? PLATFORM_NAV
    : CUSTOMER_NAV.filter((item) => item.roles.includes(role))

  // Highlight only the longest matching nav href for the current path.
  // Fixes the `/inventory` + `/inventory/transfers` double-highlight:
  // both match via startsWith, but only the deeper one should be active.
  const activeHref = items.reduce<string | null>((best, item) => {
    if (item.href === '/pos' ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + '/')) {
      if (!best || item.href.length > best.length) return item.href
    }
    // Exact match always wins regardless of length (edge case: nav item = current path)
    if (pathname === item.href && (!best || item.href.length > best.length)) return item.href
    return best
  }, null)

  const isActive = (href: string) => href === activeHref

  return (
    <aside className="flex h-full w-60 flex-col border-r bg-background">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <span className="text-lg font-semibold tracking-tight">SEA-POS</span>
        {isPlatformAdmin && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
            <Shield className="h-3 w-3" />
            แพลตฟอร์ม
          </span>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3 overflow-y-auto">
        {items.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive(href)
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      {activeBranch && !isPlatformAdmin && (
        <div className="border-t px-3 py-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3 w-3" />
            {activeBranch.name}
            <span className="text-muted-foreground/60">({activeBranch.code})</span>
          </span>
        </div>
      )}

      <div className="border-t p-3">
        <form action={signOut}>
          <Button
            type="submit"
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground"
          >
            <LogOut className="h-4 w-4" />
            ออกจากระบบ
          </Button>
        </form>
      </div>
    </aside>
  )
}
