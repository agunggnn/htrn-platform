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
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { GlobalSearch } from '@/components/GlobalSearch'
import { cn } from '@/lib/utils'

interface NavChild {
  href: string
  label: string
  hint?: string
  badge?: string
  exact?: boolean
}

interface NavItem {
  href: string
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>
  label: string
  hint: string
  children?: NavChild[]
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: 'Operasional Harian',
    items: [
      { href: '/', icon: LayoutDashboard, label: 'Dashboard', hint: 'Ringkasan hari ini' },
      {
        href: '/prices',
        icon: TrendingUp,
        label: 'Harga & Pasar',
        hint: 'Katalog, HPP, & Intel',
        children: [
          { href: '/prices', label: 'Katalog & Tiering', hint: 'Daftar harga jual resmi', exact: true },
          {
            href: '/prices/market-intelligence',
            label: 'Dinamika Bahan Baku (JEV)',
            hint: 'Simulasi susut basah & intel kompetitor',
            badge: 'JEV',
          },
          { href: '/prices/input', label: 'Input Harga Harian', hint: 'Pencatatan harga masuk' },
        ],
      },
      { href: '/buyers', icon: Users, label: 'Buyers & CRM', hint: 'Prospek dan pelanggan' },
    ],
  },
  {
    label: 'Dokumen Komersial',
    items: [
      { href: '/quotations', icon: FileText, label: 'Quotation', hint: 'Surat penawaran (SPH)' },
      {
        href: '/invoices',
        icon: Receipt,
        label: 'Invoice',
        hint: 'Tagihan penjualan & tempo',
        children: [
          { href: '/invoices', label: 'Semua Invoice', hint: 'Daftar faktur komersial', exact: true },
          { href: '/invoices/aging', label: 'Aging Piutang', hint: 'Jatuh tempo pembayaran' },
        ],
      },
      { href: '/purchase-orders', icon: ShoppingCart, label: 'Purchase Order', hint: 'Pesanan ke supplier' },
    ],
  },
  {
    label: 'Gudang dan Laporan',
    items: [
      { href: '/inventory', icon: Boxes, label: 'Stok Gudang', hint: 'Mutasi dan sisa stok' },
      {
        href: '/reports',
        icon: BarChart3,
        label: 'Laporan & Keuangan',
        hint: 'Omset, margin, & audit',
        children: [
          { href: '/reports', label: 'Ringkasan Laporan', hint: 'Ikhtisar analitik utama', exact: true },
          {
            href: '/reports/settlements',
            label: 'Bagi Hasil Supplier',
            hint: 'Settlement modal Mas Parmin',
            badge: 'Parmin',
          },
          { href: '/reports/sales', label: 'Laporan Penjualan', hint: 'Volume dan transaksi' },
          { href: '/reports/profit-margin', label: 'Margin Keuntungan', hint: 'Analisis laba kotor' },
          { href: '/reports/price-analytics', label: 'Tren Harga Rempah', hint: 'Volatilitas komoditas' },
        ],
      },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    '/prices': true,
    '/reports': true,
  })

  // Auto-expand parent group if active route matches any child
  useEffect(() => {
    navGroups.forEach((group) => {
      group.items.forEach((item) => {
        if (item.children && (pathname === item.href || pathname.startsWith(`${item.href}/`))) {
          setExpandedGroups((prev) => (prev[item.href] ? prev : { ...prev, [item.href]: true }))
        }
      })
    })
  }, [pathname])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function toggleGroup(href: string, e?: React.MouseEvent) {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    setExpandedGroups((prev) => ({
      ...prev,
      [href]: !prev[href],
    }))
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
              {group.items.map((item) => {
                const { href, icon: Icon, label, hint, children } = item
                const hasChildren = Boolean(children && children.length > 0)
                const isExpanded = expandedGroups[href] ?? false

                if (!hasChildren) {
                  const active = href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)
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
                      <span className="flex flex-col leading-tight min-w-0">
                        <span className="truncate">{label}</span>
                        <span
                          className={cn(
                            'text-[11px] font-normal truncate',
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
                }

                // Item with Submenu Children
                const isDirectActive = pathname === href
                const isDescendantActive = pathname.startsWith(`${href}/`)
                const isParentHighlighted = isDirectActive || isDescendantActive

                return (
                  <div key={href} className="space-y-0.5">
                    <div
                      className={cn(
                        'group flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        isDirectActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground ring-1 ring-inset ring-sidebar-border'
                          : isDescendantActive
                          ? 'bg-sidebar-accent/35 text-sidebar-accent-foreground'
                          : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
                      )}
                    >
                      <Link
                        href={href}
                        title={hint}
                        onClick={() => {
                          setExpandedGroups((prev) => ({ ...prev, [href]: true }))
                          closeDrawer()
                        }}
                        className="flex flex-1 items-center gap-3 min-w-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring rounded"
                      >
                        <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                        <span className="flex flex-col leading-tight min-w-0">
                          <span className="truncate">{label}</span>
                          <span
                            className={cn(
                              'text-[11px] font-normal truncate',
                              isParentHighlighted
                                ? 'text-sidebar-accent-foreground/70'
                                : 'text-sidebar-foreground/50'
                            )}
                          >
                            {hint}
                          </span>
                        </span>
                      </Link>

                      <button
                        type="button"
                        onClick={(e) => toggleGroup(href, e)}
                        aria-expanded={isExpanded}
                        aria-label={isExpanded ? `Tutup submenu ${label}` : `Buka submenu ${label}`}
                        className="ml-1 p-1 rounded-md text-sidebar-foreground/60 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/70 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring cursor-pointer"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5 transition-transform" aria-hidden="true" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 transition-transform" aria-hidden="true" />
                        )}
                      </button>
                    </div>

                    {/* Submenu Children Links */}
                    {isExpanded && children && (
                      <div className="ml-5 pl-3 border-l border-sidebar-border/70 space-y-0.5 py-0.5">
                        {children.map((child) => {
                          const isChildActive = child.exact
                            ? pathname === child.href
                            : pathname === child.href || pathname.startsWith(`${child.href}/`)

                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              title={child.hint}
                              onClick={closeDrawer}
                              aria-current={isChildActive ? 'page' : undefined}
                              className={cn(
                                'group/sub flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring',
                                isChildActive
                                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs ring-1 ring-inset ring-sidebar-border/80'
                                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                              )}
                            >
                              <span className="flex items-center gap-2 truncate min-w-0">
                                <span
                                  className={cn(
                                    'h-1.5 w-1.5 rounded-full shrink-0 transition-colors',
                                    isChildActive
                                      ? 'bg-sidebar-primary ring-2 ring-sidebar-primary/20'
                                      : 'bg-sidebar-foreground/30 group-hover/sub:bg-sidebar-foreground/60'
                                  )}
                                  aria-hidden="true"
                                />
                                <span className="truncate">{child.label}</span>
                              </span>

                              {child.badge && (
                                <span
                                  className={cn(
                                    'ml-1.5 shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase leading-none',
                                    child.badge === 'JEV'
                                      ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                                      : child.badge === 'Parmin'
                                      ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/40'
                                      : 'bg-sidebar-foreground/10 text-sidebar-foreground/75 border border-sidebar-foreground/15'
                                  )}
                                >
                                  {child.badge}
                                </span>
                              )}
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </div>
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
      <aside className="bg-sidebar border-r border-sidebar-border hidden h-full w-64 flex-col md:flex">
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
