export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { TrendingUp, FileText, Receipt, ShoppingCart, ArrowRight } from 'lucide-react'
import {
  getInvoiceWidgets,
  getPriceTicks,
  getUpcomingDeadlines,
} from '@/lib/dashboard'
import { getRecentActivities } from '@/lib/activity'
import { RevenueChartLazy } from '@/components/dashboard/RevenueChartLazy'
import PriceTickerBar from '@/components/dashboard/PriceTickerBar'
import SalesPipeline from '@/components/dashboard/SalesPipeline'
import { TopBuyersWidget } from '@/components/dashboard/TopBuyersWidget'
import { UpcomingDeadlines } from '@/components/dashboard/UpcomingDeadlines'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'

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
  // Fetch all data in parallel. Invoice-derived widgets (revenue, pipeline,
  // top buyers) share a single invoice scan inside getInvoiceWidgets.
  const [stats, widgets, priceTicks, deadlines, activities] = await Promise.all([
    getDashboardStats(),
    getInvoiceWidgets(),
    getPriceTicks(),
    getUpcomingDeadlines(),
    getRecentActivities(6),
  ])
  const { revenue, pipeline, topBuyers } = widgets

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
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      {/* Header */}
      <div className="mb-6">
        <p className="text-eyebrow text-muted-foreground mb-1">Ringkasan operasional</p>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Dashboard
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">{dateStr}</p>
      </div>

      {/* Price Ticker */}
      <div className="mb-6">
        <PriceTickerBar ticks={priceTicks} />
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ title, value, suffix, icon: Icon, color, href }) => (
          <Link
            key={title}
            href={href}
            className="bg-card border-border group rounded-2xl border p-5 transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${color}18` }}
              >
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
            </div>
            <p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
              {title}
            </p>
            <p className="text-foreground text-2xl leading-tight font-bold" data-slot="figure">{value}</p>
            <p className="text-muted-foreground mt-0.5 text-xs">{suffix}</p>
          </Link>
        ))}
      </div>

      {/* Sales Pipeline */}
      <div className="mb-6">
        <SalesPipeline stages={pipeline} />
      </div>

      {/* Revenue Chart + Deadlines */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        {/* Revenue Chart — 2 cols */}
        <div className="xl:col-span-2">
          <RevenueChartLazy data={revenue} />
        </div>

        {/* Deadlines — 1 col */}
        <div>
          <UpcomingDeadlines deadlines={deadlines} />
        </div>
      </div>

      {/* Top Buyers + Activity Feed + Quick Actions */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Top Buyers — 1 col */}
        <div>
          <TopBuyersWidget buyers={topBuyers} />
        </div>

        {/* Activity Feed — 1 col */}
        <div>
          <ActivityFeed activities={activities} />
        </div>

        {/* Quick Actions — 1 col */}
        <div className="bg-card border-border flex flex-col justify-between rounded-2xl border p-6">
          <div>
            <h2 className="text-eyebrow text-muted-foreground mb-1">Aksi Cepat</h2>
            <p className="text-muted-foreground mb-4 text-xs">
              Langkah yang paling sering dipakai harian.
            </p>
            <div className="flex flex-col gap-2.5">
              {[
                { label: 'Input Harga Hari Ini', href: '/prices/input', primary: true },
                { label: 'Buat Quotation Baru', href: '/quotations/new', primary: false },
                { label: 'Buat Invoice', href: '/invoices/new', primary: false },
                { label: 'Tambah Buyer', href: '/buyers/new', primary: false },
                { label: 'Purchase Order Baru', href: '/purchase-orders/new', primary: false },
              ].map(({ label, href, primary }) => (
                <Link
                  key={href}
                  href={href}
                  className={
                    primary
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'
                      : 'border-border bg-card text-foreground hover:bg-muted flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'
                  }
                >
                  <span>{label}</span>
                  <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
