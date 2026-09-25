import Link from 'next/link'
import {
  TrendingUp,
  BarChart3,
  DollarSign,
  Download,
  ArrowRight,
  FileSpreadsheet,
} from 'lucide-react'

export default function ReportsHubPage() {
  const reports = [
    {
      title: 'Laporan Penjualan (Sales)',
      description:
        'Analisis volume dan nilai penjualan berdasarkan periode, buyer, komoditas rempah, dan negara tujuan.',
      icon: BarChart3,
      color: '#1a472a',
      bg: 'rgba(26, 71, 42, 0.1)',
      href: '/reports/sales',
      exportEntity: 'invoices',
    },
    {
      title: 'Analisis Margin Keuntungan',
      description:
        'Perbandingan estimasi margin real antara harga jual di Invoice dan harga beli dari Purchase Order supplier.',
      icon: DollarSign,
      color: '#c9a227',
      bg: 'rgba(201, 162, 39, 0.1)',
      href: '/reports/profit-margin',
      exportEntity: null,
    },
    {
      title: 'Analisis Harga Rempah',
      description:
        'Tren dan histori dinamika harga harian komoditas rempah per grade, sumber data, dan perbandingan volatilitas.',
      icon: TrendingUp,
      color: '#2563eb',
      bg: 'rgba(37, 99, 235, 0.1)',
      href: '/reports/price-analytics',
      exportEntity: 'prices',
    },
  ]

  const exportOptions = [
    { label: 'Data Buyer & CRM', entity: 'buyers' },
    { label: 'Data Commercial Invoice', entity: 'invoices' },
    { label: 'Data Quotation Export', entity: 'quotations' },
    { label: 'Data Purchase Order', entity: 'purchase-orders' },
    { label: 'Histori Harga Rempah', entity: 'prices' },
  ]

  return (
    <div className="px-6 py-8 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Laporan & Analisis Bisnis</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Pusat pelaporan kinerja ekspor rempah, margin keuntungan, dan data analytics.
        </p>
      </div>

      {/* Main Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {reports.map((r) => {
          const Icon = r.icon
          return (
            <div
              key={r.href}
              className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col justify-between hover:shadow-md transition-all group"
            >
              <div>
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: r.bg }}
                >
                  <Icon className="w-6 h-6" style={{ color: r.color }} />
                </div>
                <h2 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-[#1a472a] transition-colors">
                  {r.title}
                </h2>
                <p className="text-sm text-gray-500 leading-relaxed mb-6">
                  {r.description}
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <Link
                  href={r.href}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900 group-hover:text-[#1a472a]"
                >
                  Buka Laporan <ArrowRight className="w-4 h-4" />
                </Link>
                {r.exportEntity && (
                  <a
                    href={`/api/export/${r.exportEntity}`}
                    download
                    className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                    title="Download CSV"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Direct CSV Export Hub */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <FileSpreadsheet className="w-5 h-5" style={{ color: '#1a472a' }} />
          <h2 className="text-base font-bold text-gray-900">Export Data Mentah (CSV/Excel)</h2>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Unduh seluruh data entitas aplikasi ke format CSV untuk diolah lebih lanjut di Microsoft Excel, Google Sheets, atau BI tool.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {exportOptions.map((opt) => (
            <a
              key={opt.entity}
              href={`/api/export/${opt.entity}`}
              download
              className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-gray-100 hover:border-gray-300 transition-all group text-sm font-medium text-gray-800"
            >
              <span>{opt.label}</span>
              <Download className="w-4 h-4 text-gray-400 group-hover:text-[#1a472a] transition-colors" />
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
