import Link from 'next/link'
import {
  FileText,
  Receipt,
  ShoppingCart,
  Users,
  TrendingUp,
  Package,
  Activity,
} from 'lucide-react'
import type { ActivityLog } from '@/types'

type ActivityFeedProps = {
  activities: ActivityLog[]
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  const getEntityConfig = (entityType: ActivityLog['entity_type']) => {
    switch (entityType) {
      case 'quotation':
        return { Icon: FileText, color: '#c9a227', bg: 'rgba(201, 162, 39, 0.1)' }
      case 'invoice':
        return { Icon: Receipt, color: '#1a472a', bg: 'rgba(26, 71, 42, 0.1)' }
      case 'purchase_order':
        return { Icon: ShoppingCart, color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.1)' }
      case 'buyer':
        return { Icon: Users, color: '#2563eb', bg: 'rgba(37, 99, 235, 0.1)' }
      case 'price':
        return { Icon: TrendingUp, color: '#059669', bg: 'rgba(5, 150, 105, 0.1)' }
      case 'packing_list':
        return { Icon: Package, color: '#d97706', bg: 'rgba(217, 119, 6, 0.1)' }
      default:
        return { Icon: Activity, color: '#6b7280', bg: 'rgba(107, 114, 128, 0.1)' }
    }
  }

  const getEntityHref = (type: ActivityLog['entity_type'], id: string) => {
    switch (type) {
      case 'quotation':
        return `/quotations/${id}`
      case 'invoice':
        return `/invoices/${id}`
      case 'purchase_order':
        return `/purchase-orders/${id}`
      case 'buyer':
        return `/buyers/${id}`
      case 'price':
        return `/prices`
      case 'packing_list':
        return `/invoices/${id}/packing-list`
      default:
        return '/'
    }
  }

  function formatTimeAgo(dateStr: string) {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Baru saja'
    if (diffMins < 60) return `${diffMins} menit lalu`
    if (diffHours < 24) return `${diffHours} jam lalu`
    if (diffDays === 1) return 'Kemarin'
    return `${diffDays} hari lalu`
  }

  return (
    <div className="bg-card border-border flex h-full flex-col rounded-2xl border p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-eyebrow text-muted-foreground">Aktivitas Terkini</h2>
          <p className="text-muted-foreground mt-1 text-xs">6 perubahan terakhir di sistem.</p>
        </div>
        <span className="text-muted-foreground text-xs font-medium">Audit Trail</span>
      </div>

      {activities.length === 0 ? (
        <div className="text-muted-foreground py-8 text-center text-sm">
          Belum ada rekaman aktivitas sistem.
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {activities.map((act) => {
            const { Icon, color, bg } = getEntityConfig(act.entity_type)
            const href = getEntityHref(act.entity_type, act.entity_id)

            return (
              <Link
                key={act.id}
                href={href}
                className="hover:bg-muted/50 group -mx-2.5 flex items-start gap-3 rounded-xl p-2.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <div
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: bg }}
                >
                  <Icon size={16} style={{ color }} aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-foreground group-hover:text-primary text-xs leading-snug font-semibold transition-colors">
                    {act.description}
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-[11px]">
                    {formatTimeAgo(act.created_at)}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
