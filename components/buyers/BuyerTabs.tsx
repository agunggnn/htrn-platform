'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { MessageCircle, Phone, PhoneOff, Copy, Check, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { BuyerKycSection } from './BuyerKycSection'
import { WhatsAppOutreachModal } from './WhatsAppOutreachModal'
import { cleanWhatsAppNumber, formatDisplayPhoneNumber } from '@/lib/whatsapp-pitch-helper'
import { getWhatsAppVerificationInfo, encodeWhatsAppStatus } from '@/lib/buyers-helper'
import type { Buyer, Quotation, Invoice } from '@/types'

type Props = {
  tab: string
  buyerId: string
  buyer: Buyer
  quotations: Quotation[]
  invoices: Invoice[]
  statusColor: Record<string, string>
}

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'kyc', label: 'B2B KYC & Verifikasi PIC' },
  { key: 'quotations', label: 'Quotations' },
  { key: 'invoices', label: 'Invoices' },
  { key: 'notes', label: 'Catatan' },
]

export function BuyerTabs({ tab, buyerId, buyer, quotations, invoices, statusColor }: Props) {
  const [currentBuyer, setCurrentBuyer] = useState(buyer)
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false)
  const [copiedPhone, setCopiedPhone] = useState(false)

  useEffect(() => {
    setCurrentBuyer(buyer)
  }, [buyer])

  function handleWhatsAppStatusUpdated(bId: string, newStatus: string) {
    const today = new Date().toISOString().split('T')[0]
    setCurrentBuyer((prev) => ({
      ...prev,
      notes: encodeWhatsAppStatus(prev.notes, newStatus, today),
    }))
  }

  const cur = currentBuyer?.currency || 'IDR'
  const isIdr = cur === 'IDR'
  const fmt = (n: number) =>
    new Intl.NumberFormat(isIdr ? 'id-ID' : 'en-US', {
      style: 'currency',
      currency: cur,
      maximumFractionDigits: isIdr ? 0 : 2,
    }).format(n)

  const waInfo = getWhatsAppVerificationInfo(currentBuyer)
  const { isLandline, isNotRegistered, isVerifiedActive } = waInfo

  return (
    <div>
      {/* Tab nav */}
      <div className="mb-6 flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/buyers/${buyerId}?tab=${t.key}`}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'border-green-700 text-green-800'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
            {t.key === 'kyc' && (
              <span className={`ml-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${buyer.kyc_verified || (buyer.notes || '').includes('[KYC: verified') ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'}`}>
                {buyer.kyc_verified || (buyer.notes || '').includes('[KYC: verified') ? 'Verified' : 'Pending'}
              </span>
            )}
            {t.key === 'quotations' && quotations.length > 0 && (
              <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                {quotations.length}
              </span>
            )}
            {t.key === 'invoices' && invoices.length > 0 && (
              <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                {invoices.length}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* KYC & Personal Number Verification */}
      {tab === 'kyc' && <BuyerKycSection buyer={buyer} />}

      {/* Overview */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* WhatsApp / Phone Outreach Card */}
          <div
            className={`rounded-2xl border p-5 shadow-xs transition-colors ${
              isNotRegistered
                ? 'border-rose-200 bg-gradient-to-r from-rose-50/70 via-white to-gray-50/40'
                : isLandline
                ? 'border-amber-200 bg-gradient-to-r from-amber-50/70 via-white to-gray-50/40'
                : isVerifiedActive
                ? 'border-emerald-300 bg-gradient-to-r from-emerald-50 via-white to-emerald-50/30'
                : 'border-emerald-200/80 bg-gradient-to-r from-emerald-50/70 via-white to-gray-50/40'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`p-1.5 rounded-lg ${
                      isNotRegistered
                        ? 'bg-rose-100 text-rose-800'
                        : isLandline
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {isNotRegistered ? (
                      <PhoneOff className="w-4 h-4 text-rose-700" />
                    ) : isLandline ? (
                      <Phone className="w-4 h-4 text-amber-700" />
                    ) : (
                      <MessageCircle className="w-4 h-4 text-emerald-700" />
                    )}
                  </span>
                  <span
                    className={`text-xs font-bold uppercase tracking-wide ${
                      isNotRegistered ? 'text-rose-900' : isLandline ? 'text-amber-900' : 'text-emerald-900'
                    }`}
                  >
                    {isNotRegistered
                      ? 'Saluran Telepon PIC (Bukan Nomor WhatsApp)'
                      : isLandline
                      ? 'Saluran Telepon Kantor (PSTN)'
                      : 'WhatsApp B2B Sales Outreach Desk'}
                  </span>
                  {isVerifiedActive && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      ✓ WA Aktif
                    </span>
                  )}
                  {isNotRegistered && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                      ✕ Bukan WA
                    </span>
                  )}
                  {isLandline && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                      ☎️ PSTN Kantor
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2.5 text-xs">
                  <span className="text-gray-500">
                    PIC:{' '}
                    <strong className="text-gray-900">
                      {currentBuyer.contact_name || 'Tim Pengadaan'}
                    </strong>
                  </span>
                  <span>•</span>
                  <span className="text-gray-500">
                    {isNotRegistered ? 'Nomor Telepon: ' : 'WhatsApp: '}
                    <strong className="text-gray-900 font-mono">
                      {formatDisplayPhoneNumber(currentBuyer.phone)}
                    </strong>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    const clean = cleanWhatsAppNumber(currentBuyer.phone)
                    if (!clean) {
                      toast.error('Nomor telepon belum terdaftar.')
                      return
                    }
                    navigator.clipboard.writeText(clean)
                    setCopiedPhone(true)
                    toast.success(`Nomor (${clean}) disalin ke clipboard!`)
                    setTimeout(() => setCopiedPhone(false), 2000)
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 shadow-2xs transition-all active:scale-95 cursor-pointer"
                >
                  {copiedPhone ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-gray-600" />
                  )}
                  <span>{copiedPhone ? 'Nomor Tersalin!' : 'Salin Nomor'}</span>
                </button>

                {isNotRegistered ? (
                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${currentBuyer.phone}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
                    >
                      <Phone className="w-4 h-4" />
                      <span>Panggil Telepon</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => setShowWhatsAppModal(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 shadow-2xs transition-all active:scale-95 cursor-pointer"
                    >
                      <span>Buka Skrip / Status</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowWhatsAppModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Kirim / Salin Penawaran WA</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="grid grid-cols-2 gap-6 text-sm md:grid-cols-3">
              {[
                ['Perusahaan', buyer.company_name],
                ['Kontak', buyer.contact_name ?? '—'],
                ['Email', buyer.email ?? '—'],
                ['Telepon', buyer.phone ?? '—'],
                ['Negara', buyer.country ?? '—'],
                ['Currency', buyer.currency],
                ['Bahasa', buyer.language === 'en' ? 'English' : 'Indonesia'],
                ['Payment Terms', buyer.payment_terms ?? '—'],
                ['Tax ID', buyer.tax_id ?? '—'],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="mb-0.5 text-xs text-gray-400">{label}</p>
                  <p className="font-medium text-gray-900">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quotations */}
      {tab === 'quotations' && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          {quotations.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-400">Belum ada quotation</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">
                    No. QUO
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
                    Tanggal
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">
                    Total
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {quotations.map((q) => (
                  <tr key={q.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-5 py-3 font-medium">{q.quo_number ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{q.date}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      {q.total_amount ? fmt(q.total_amount) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[q.status] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {q.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/quotations/${q.id}`}
                        className="text-xs text-green-700 hover:underline"
                      >
                        Detail →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Invoices */}
      {tab === 'invoices' && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          {invoices.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-400">Belum ada invoice</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">
                    No. INV
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
                    Jatuh Tempo
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">
                    Total
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">
                    Outstanding
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className={`border-b border-gray-50 hover:bg-gray-50/50 ${inv.status === 'overdue' ? 'bg-red-50/30' : ''}`}
                  >
                    <td className="px-5 py-3 font-medium">{inv.inv_number ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{inv.due_date ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      {inv.total_amount ? fmt(inv.total_amount) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-red-600">
                      {inv.amount_due ? fmt(inv.amount_due) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[inv.status] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="text-xs text-green-700 hover:underline"
                      >
                        Detail →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Notes */}
      {tab === 'notes' && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          {buyer.notes ? (
            <p className="text-sm whitespace-pre-wrap text-gray-700">{buyer.notes}</p>
          ) : (
            <p className="text-sm text-gray-400">Belum ada catatan.</p>
          )}
          <div className="mt-4">
            <Link
              href={`/buyers/${buyerId}/edit`}
              className="text-sm text-green-700 hover:underline"
            >
              Edit catatan →
            </Link>
          </div>
        </div>
      )}

      {/* WhatsApp Outreach Modal */}
      {showWhatsAppModal && (
        <WhatsAppOutreachModal
          isOpen={showWhatsAppModal}
          onClose={() => setShowWhatsAppModal(false)}
          buyer={currentBuyer}
          onStatusUpdated={handleWhatsAppStatusUpdated}
        />
      )}
    </div>
  )
}
