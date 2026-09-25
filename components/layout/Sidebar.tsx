'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard,
  TrendingUp,
  Users,
  FileText,
  Receipt,
  ShoppingCart,
  Settings,
  LogOut,
  BarChart3,
  Boxes,
  Leaf,
  Menu,
  X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { GlobalSearch } from '@/components/GlobalSearch'
import { cn } from '@/lib/utils'

const navGroups = [
  {
    label: 'Harian',
    items: [
      { href: '/', icon: LayoutDashboard, label: 'Dashboard', hint: 'Ringkasan hari ini' },
      { href: '/prices', icon: TrendingUp, label: 'Harga Rempah', hint: 'Harga jual harian' },
      { href: '/buyers', icon: Users, label: 'Buyers', hint: 'Prospek dan pelanggan' },
    ],
  },
  {
    label: 'Dokumen',
    items: [
      { href: '/quotations', icon: FileText, label: 'Quotation', hint: 'Surat penawaran (SPH)' },
      { href: '/invoices', icon: Receipt, label: 'Invoice', hint: 'Tagihan penjualan' },
      { href: '/purchase-orders', icon: ShoppingCart, label: 'Purchase Order', hint: 'Pesanan ke supplier' },
    ],
  },
  {
    label: 'Gudang dan Laporan',
    items: [
      { href: '/inventory', icon: Boxes, label: 'Stok Gudang', hint: 'Mutasi dan sisa stok' },
      { href: '/reports', icon: BarChart3, label: 'Laporan', hint: 'Omset, margin, tren' },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  function closeDrawer() {
    setOpen(false)
  }

  const navContent = (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-4">
        <div className="bg-sidebar-primary flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl">
          <Leaf className="text-sidebar-primary-foreground h-4 w-4" aria-hidden="true" />
        </div>
        <div>
          <p className="font-display text-[15px] font-semibold leading-tight text-sidebar-foreground">
            Haturan
          </p>
          <p className="text-xs leading-tight text-sidebar-foreground/60">Trade App</p>
        </div>
      </div>

      {/* Global Search Trigger */}
      <div className="px-3 pt-1 pb-2">
        <GlobalSearch />
      </div>

      {/* Navigation */}
      <nav aria-label="Navigasi utama" className="scrollbar-rail flex-1 space-y-5 overflow-y-auto px-3 py-2">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="text-eyebrow px-3 pb-1.5 text-sidebar-foreground/50">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ href, icon: Icon, label, hint }) => {
                const active = isActive(href)
                return (
                  <Link
                    key={href}
                    href={href}
                    title={hint}
                    onClick={closeDrawer}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring',
                      active
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground ring-1 ring-inset ring-sidebar-border'
                        : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                    <span className="flex flex-col leading-tight">
                      <span>{label}</span>
                      <span
                        className={cn(
                          'text-[11px] font-normal',
                          active ? 'text-sidebar-accent-foreground/70' : 'text-sidebar-foreground/50'
                        )}
                      >
                        {hint}
                      </span>
                    </span>
                    {active && (
                      <span
                        aria-hidden="true"
                        className="bg-sidebar-primary ml-auto h-1.5 w-1.5 shrink-0 rounded-full"
                      />
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="space-y-0.5 border-t border-sidebar-border px-3 py-4">
        <Link
          href="/settings"
          onClick={closeDrawer}
          aria-current={pathname.startsWith('/settings') ? 'page' : undefined}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring',
            pathname.startsWith('/settings')
              ? 'bg-sidebar-accent text-sidebar-accent-foreground ring-1 ring-inset ring-sidebar-border'
              : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
          )}
        >
          <Settings className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          Settings
        </Link>
        <button
          onClick={handleLogout}
          type="button"
          className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-destructive/15 hover:text-destructive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring"
        >
          <LogOut className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          Logout
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile top bar */}
      <div className="bg-sidebar border-b border-sidebar-border flex items-center gap-3 px-4 py-3 md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label="Buka navigasi"
          className="text-sidebar-foreground hover:bg-sidebar-accent flex h-11 w-11 items-center justify-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="bg-sidebar-primary flex h-8 w-8 items-center justify-center rounded-lg">
            <Leaf className="text-sidebar-primary-foreground h-4 w-4" aria-hidden="true" />
          </div>
          <p className="font-display text-[15px] font-semibold text-sidebar-foreground">
            Haturan Trade
          </p>
        </div>
      </div>

      {/* Desktop rail */}
      <aside className="bg-sidebar border-r border-sidebar-border hidden h-full w-60 flex-col md:flex">
        {navContent}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div id="mobile-nav" className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Tutup navigasi"
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-pointer bg-black/50"
          />
          <aside className="bg-sidebar border-r border-sidebar-border absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col shadow-2xl">
            <div className="flex justify-end px-3 pt-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Tutup navigasi"
                className="text-sidebar-foreground hover:bg-sidebar-accent flex h-11 w-11 items-center justify-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            {navContent}
          </aside>
        </div>
      )}
    </>
  )
}
