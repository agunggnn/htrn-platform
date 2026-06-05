import { createClient } from '@/lib/supabase/server'
import { TrendingUp, FileText, Receipt, ShoppingCart } from 'lucide-react'

async function getDashboardStats() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const [priceEntries, activeQuotations, unpaidInvoices, openPOs] = await Promise.all([
    supabase
      .from('price_history')
      .select('id', { count: 'exact', head: true })
      .eq('price_date', today),
    supabase
      .from('quotations')
      .select('id', { count: 'exact', head: true })
      .in('status', ['draft', 'sent']),
    supabase
      .from('invoices')
      .select('amount_due')
      .in('status', ['sent', 'partial', 'overdue']),
    supabase
      .from('purchase_orders')
      .select('id', { count: 'exact', head: true })
      .in('status', ['draft', 'sent', 'confirmed']),
  ])

  const totalUnpaid = unpaidInvoices.data?.reduce((sum, inv) => sum + (inv.amount_due ?? 0), 0) ?? 0

  return {
    priceEntriesToday: priceEntries.count ?? 0,
    activeQuotations: activeQuotations.count ?? 0,
    totalUnpaidUSD: totalUnpaid,
    openPOs: openPOs.count ?? 0,
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}

export default async function DashboardPage() {
  const stats = await getDashboardStats()

  const cards = [
    {
      title: 'Input Harga Hari Ini',
      value: stats.priceEntriesToday.toString(),
      suffix: 'entries',
      icon: TrendingUp,
      color: '#1a472a',
      href: '/prices',
    },
    {
      title: 'Quotation Aktif',
      value: stats.activeQuotations.toString(),
      suffix: 'quotation',
      icon: FileText,
      color: '#c9a227',
      href: '/quotations',
    },
    {
      title: 'Invoice Belum Dibayar',
      value: formatCurrency(stats.totalUnpaidUSD),
      suffix: 'outstanding',
      icon: Receipt,
      color: '#dc2626',
      href: '/invoices',
    },
    {
      title: 'Purchase Order Terbuka',
      value: stats.openPOs.toString(),
      suffix: 'PO aktif',
      icon: ShoppingCart,
      color: '#7c3aed',
      href: '/purchase-orders',
    },
  ]

  const now = new Date()
  const dateStr = now.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">{dateStr}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {cards.map(({ title, value, suffix, icon: Icon, color, href }) => (
          <a
            key={title}
            href={href}
            className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${color}18` }}
              >
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
            </div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              {title}
            </p>
            <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{suffix}</p>
          </a>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mt-10">
        <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
          Aksi Cepat
        </h2>
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'Input Harga Hari Ini', href: '/prices/input', color: '#1a472a' },
            { label: 'Buat Quotation Baru', href: '/quotations/new', color: '#c9a227' },
            { label: 'Buat Invoice', href: '/invoices/new', color: '#2563eb' },
            { label: 'Tambah Buyer', href: '/buyers/new', color: '#7c3aed' },
          ].map(({ label, href, color }) => (
            <a
              key={href}
              href={href}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: color }}
            >
              {label}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
