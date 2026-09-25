'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Search,
  Users,
  FileText,
  Receipt,
  ShoppingCart,
  TrendingUp,
  X,
} from 'lucide-react'

type SearchResult = {
  id: string
  title: string
  subtitle: string
  type: 'buyer' | 'quotation' | 'invoice' | 'purchase_order' | 'item'
  href: string
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Handle Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const performSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      setLoading(false)
      return
    }

    setLoading(true)
    const supabase = createClient()
    const searchTerm = `%${q.trim()}%`

    try {
      const [
        { data: buyers },
        { data: invoices },
        { data: quotations },
        { data: pos },
        { data: items },
      ] = await Promise.all([
        supabase
          .from('buyers')
          .select('id, company_name, country')
          .ilike('company_name', searchTerm)
          .limit(4),
        supabase
          .from('invoices')
          .select('id, inv_number, issue_date')
          .ilike('inv_number', searchTerm)
          .limit(4),
        supabase
          .from('quotations')
          .select('id, quo_number, date')
          .ilike('quo_number', searchTerm)
          .limit(4),
        supabase
          .from('purchase_orders')
          .select('id, po_number, order_date')
          .ilike('po_number', searchTerm)
          .limit(4),
        supabase
          .from('items')
          .select('id, name, name_en')
          .or(`name.ilike.${searchTerm},name_en.ilike.${searchTerm}`)
          .limit(4),
      ])

      const list: SearchResult[] = []

      for (const b of buyers ?? []) {
        list.push({
          id: b.id,
          title: b.company_name,
          subtitle: b.country ? `Buyer · ${b.country}` : 'Buyer',
          type: 'buyer',
          href: `/buyers/${b.id}`,
        })
      }

      for (const inv of invoices ?? []) {
        list.push({
          id: inv.id,
          title: inv.inv_number ?? 'Draft Invoice',
          subtitle: `Commercial Invoice · ${inv.issue_date}`,
          type: 'invoice',
          href: `/invoices/${inv.id}`,
        })
      }

      for (const quo of quotations ?? []) {
        list.push({
          id: quo.id,
          title: quo.quo_number ?? 'Draft Quotation',
          subtitle: `Quotation · ${quo.date}`,
          type: 'quotation',
          href: `/quotations/${quo.id}`,
        })
      }

      for (const po of pos ?? []) {
        list.push({
          id: po.id,
          title: po.po_number ?? 'Draft PO',
          subtitle: `Purchase Order · ${po.order_date}`,
          type: 'purchase_order',
          href: `/purchase-orders/${po.id}`,
        })
      }

      for (const item of items ?? []) {
        list.push({
          id: item.id,
          title: item.name,
          subtitle: item.name_en ? `Komoditas Rempah (${item.name_en})` : 'Komoditas Rempah',
          type: 'item',
          href: `/prices/${item.id}`,
        })
      }

      setResults(list)
    } catch (err) {
      console.error('Search error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) performSearch(query)
      else setResults([])
    }, 250)

    return () => clearTimeout(timer)
  }, [query, performSearch])

  const handleSelect = (href: string) => {
    setOpen(false)
    setQuery('')
    router.push(href)
  }

  const getTypeIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'buyer':
        return <Users className="w-4 h-4 text-blue-600" />
      case 'invoice':
        return <Receipt className="w-4 h-4 text-[#1a472a]" />
      case 'quotation':
        return <FileText className="w-4 h-4 text-[#c9a227]" />
      case 'purchase_order':
        return <ShoppingCart className="w-4 h-4 text-purple-600" />
      case 'item':
        return <TrendingUp className="w-4 h-4 text-emerald-600" />
    }
  }

  return (
    <>
      {/* Search trigger bar button */}
      <button
        onClick={() => setOpen(true)}
        type="button"
        aria-label="Cari cepat di seluruh aplikasi (Ctrl K)"
        className="bg-sidebar-accent/60 hover:bg-sidebar-accent border-sidebar-border flex w-full cursor-pointer items-center justify-between rounded-xl border px-3.5 py-2.5 text-xs text-sidebar-foreground/70 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring"
      >
        <span className="flex items-center gap-2">
          <Search className="h-3.5 w-3.5 text-sidebar-foreground/60" aria-hidden="true" />
          Cari cepat...
        </span>
        <kbd className="bg-sidebar border-sidebar-border hidden px-1.5 py-0.5 text-[10px] font-semibold text-sidebar-foreground/60 rounded-md border sm:inline-block">
          Ctrl + K
        </kbd>
      </button>

      {/* Command Palette Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 bg-gray-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Input Header */}
            <div className="flex items-center px-4 py-3 border-b border-gray-100 gap-3">
              <Search className="w-5 h-5 text-gray-400 shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari buyer, invoice, quotation, PO, komoditas..."
                autoFocus
                className="w-full text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none bg-transparent"
              />
              {query && (
                <button onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="px-2 py-1 text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg"
              >
                ESC
              </button>
            </div>

            {/* Results List */}
            <div className="max-h-80 overflow-y-auto p-2">
              {loading && (
                <div className="py-8 text-center text-xs text-gray-400">
                  Mencari...
                </div>
              )}

              {!loading && query && results.length === 0 && (
                <div className="py-8 text-center text-xs text-gray-400">
                  Tidak ada hasil untuk &quot;{query}&quot;
                </div>
              )}

              {!loading && !query && (
                <div className="py-6 text-center text-xs text-gray-400">
                  Ketik kata kunci untuk mencari di seluruh aplikasi.
                </div>
              )}

              {!loading && results.length > 0 && (
                <div className="flex flex-col gap-1">
                  {results.map((res) => (
                    <button
                      key={`${res.type}-${res.id}`}
                      onClick={() => handleSelect(res.href)}
                      className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-gray-50 text-left transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 shrink-0">
                        {getTypeIcon(res.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {res.title}
                        </p>
                        <p className="text-xs text-gray-400 truncate">{res.subtitle}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-[11px] text-gray-400 flex items-center justify-between">
              <span>Haturan Trade Global Search</span>
              <span>Tekan ESC untuk menutup</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
