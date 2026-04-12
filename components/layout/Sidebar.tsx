'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Package,
  ShoppingCart,
  Truck,
  Users,
  BarChart2,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { signOut } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'

const navItems = [
  { href: '/inventory', label: 'คลังสินค้า', icon: Package },
  { href: '/pos', label: 'ขายสินค้า', icon: ShoppingCart },
  { href: '/purchasing', label: 'จัดซื้อ', icon: Truck },
  { href: '/customers', label: 'ลูกค้า', icon: Users },
  { href: '/reports', label: 'รายงาน', icon: BarChart2 },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-full w-60 flex-col border-r bg-background">
      <div className="flex h-14 items-center border-b px-4">
        <span className="text-lg font-semibold tracking-tight">SEA-POS</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              pathname.startsWith(href)
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
