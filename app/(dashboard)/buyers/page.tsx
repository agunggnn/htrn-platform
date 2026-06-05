import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Globe } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  website: 'bg-blue-50 text-blue-700',
  referral: 'bg-purple-50 text-purple-700',
  trade_show: 'bg-orange-50 text-orange-700',
}

type Props = { searchParams: Promise<{ q?: string; country?: string }> }

export default async function BuyersPage({ searchParams }: Props) {
  const { q, country } = await searchParams
  const supabase = await createClient()

  let query = supabase.from('buyers').select('*').eq('is_active', true).order('company_name')
  if (q) query = query.ilike('company_name', `%${q}%`)
  if (country) query = query.eq('country', country)

  const { data: buyers } = await query
  const { data: allBuyers } = await supabase.from('buyers').select('country').eq('is_active', true)
  const countries = [...new Set((allBuyers ?? []).map((b) => b.country).filter(Boolean))].sort()

  return (
    <div className="px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Buyers</h1>
          <p className="text-sm text-gray-500 mt-0.5">{buyers?.length ?? 0} buyer aktif</p>
        </div>
        <Link
          href="/buyers/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg"
          style={{ backgroundColor: '#1a472a' }}
        >
          <Plus className="w-4 h-4" /> Tambah Buyer
        </Link>
      </div>

      {/* Search & filter */}
      <form className="flex gap-3 mb-6">
        <input
          name="q"
          defaultValue={q}
          placeholder="Cari nama perusahaan..."
          className="flex-1 max-w-xs px-3.5 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700"
        />
        <select
          name="country"
          defaultValue={country}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700"
        >
          <option value="">Semua negara</option>
          {countries.map((c) => <option key={c} value={c!}>{c}</option>)}
        </select>
        <button type="submit" className="px-4 py-2 text-sm font-medium text-white rounded-lg" style={{ backgroundColor: '#1a472a' }}>
          Cari
        </button>
        {(q || country) && (
          <Link href="/buyers" className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">
            Reset
          </Link>
        )}
      </form>

      {/* Buyer list */}
      {!buyers?.length ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-400">
          <Globe className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Belum ada buyer. Tambah buyer pertama Anda.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Perusahaan</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Negara</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Kontak</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Currency</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Sumber</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {buyers.map((b) => (
                <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-5 py-3">
                    <Link href={`/buyers/${b.id}`} className="font-medium text-gray-900 hover:text-green-800">
                      {b.company_name}
                    </Link>
                    {b.payment_terms && (
                      <p className="text-xs text-gray-400 mt-0.5">{b.payment_terms}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{b.country ?? '—'}</td>
                  <td className="px-4 py-3">
                    <p className="text-gray-700">{b.contact_name ?? '—'}</p>
                    {b.email && <p className="text-xs text-gray-400">{b.email}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                      {b.currency}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {b.source && (
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[b.source] ?? 'bg-gray-100 text-gray-600'}`}>
                        {b.source}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/buyers/${b.id}`} className="text-xs text-green-700 hover:underline">
                      Detail →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
