'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  TrendingUp,
  Users,
  FileText,
  Receipt,
  ShoppingCart,
  Settings,
  LogOut,
  Leaf,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navItems = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/prices', icon: TrendingUp, label: 'Harga Rempah' },
  { href: '/buyers', icon: Users, label: 'Buyers' },
  { href: '/quotations', icon: FileText, label: 'Quotation' },
  { href: '/invoices', icon: Receipt, label: 'Invoice' },
  { href: '/purchase-orders', icon: ShoppingCart, label: 'Purchase Order' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <aside className="w-60 flex flex-col h-full border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100">
        <div
          className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0"
          style={{ backgroundColor: '#1a472a' }}
        >
          <Leaf className="w-4.5 h-4.5 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900 leading-tight">Haturan</p>
          <p className="text-xs text-gray-400 leading-tight">Trade App</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive(href)
                ? 'text-white'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
            style={isActive(href) ? { backgroundColor: '#1a472a' } : {}}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-gray-100 space-y-0.5">
        <Link
          href="/settings"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            pathname.startsWith('/settings')
              ? 'text-white'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
          style={pathname.startsWith('/settings') ? { backgroundColor: '#1a472a' } : {}}
        >
          <Settings className="w-4 h-4 flex-shrink-0" />
          Settings
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          Logout
        </button>
      </div>
    </aside>
  )
}
