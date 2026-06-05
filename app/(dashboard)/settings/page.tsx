import Link from 'next/link'
import { Building2, Landmark, PenLine, Package, Truck, Hash } from 'lucide-react'

const settingsLinks = [
  {
    href: '/settings/company',
    icon: Building2,
    title: 'Profil Perusahaan',
    desc: 'Kop surat, logo, warna brand',
  },
  {
    href: '/settings/bank-accounts',
    icon: Landmark,
    title: 'Rekening Bank',
    desc: 'Rekening IDR dan USD untuk invoice',
  },
  {
    href: '/settings/signatories',
    icon: PenLine,
    title: 'Penandatangan',
    desc: 'Nama, jabatan, dan tanda tangan digital',
  },
  {
    href: '/settings/items',
    icon: Package,
    title: 'Katalog Rempah',
    desc: 'Item dan grade (A/B/Super/FAQ)',
  },
  {
    href: '/settings/suppliers',
    icon: Truck,
    title: 'Supplier',
    desc: 'Data supplier dan petani',
  },
  {
    href: '/settings/numbering',
    icon: Hash,
    title: 'Penomoran Dokumen',
    desc: 'Format QUO / INV / PO',
  },
]

export default function SettingsPage() {
  return (
    <div className="px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Konfigurasi Haturan Trade App</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {settingsLinks.map(({ href, icon: Icon, title, desc }) => (
          <Link
            key={href}
            href={href}
            className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md transition-shadow group"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
              style={{ backgroundColor: '#1a472a18' }}
            >
              <Icon className="w-5 h-5" style={{ color: '#1a472a' }} />
            </div>
            <p className="text-sm font-semibold text-gray-900 group-hover:text-green-800 transition-colors">
              {title}
            </p>
            <p className="text-xs text-gray-500 mt-1">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
