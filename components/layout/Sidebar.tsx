'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Package, ShoppingCart, ScrollText, Truck, Users, BarChart2, LogOut } from 'lucide-react'
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

const NAV_ITEMS: NavItem[] = [
  { href: '/inventory',  label: 'คลังสินค้า',  icon: Package,      roles: ['admin', 'manager', 'purchasing'] },
  { href: '/pos',        label: 'ขายสินค้า',   icon: ShoppingCart, roles: ['admin', 'manager', 'cashier'] },
  { href: '/pos/sales',  label: 'รายการขาย',   icon: ScrollText,   roles: ['admin', 'manager'] },
  { href: '/purchasing', label: 'จัดซื้อ',     icon: Truck,        roles: ['admin', 'manager', 'purchasing'] },
  { href: '/customers',  label: 'ลูกค้า',      icon: Users,        roles: ['admin', 'manager', 'cashier'] },
  { href: '/reports',    label: 'รายงาน',      icon: BarChart2,    roles: ['admin', 'manager'] },
]

type SidebarProps = {
  role: UserRole
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname()
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role))

  return (
    <aside className="flex h-full w-60 flex-col border-r bg-background">
      <div className="flex h-14 items-center border-b px-4">
        <span className="text-lg font-semibold tracking-tight">SEA-POS</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {visibleItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              pathname === href || (href !== '/pos' && pathname.startsWith(href))
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

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
