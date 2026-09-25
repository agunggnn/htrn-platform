import Link from 'next/link'
import { ArrowLeft, Download, Puzzle, CheckCircle2, ShieldCheck, Zap, Globe, Sparkles, ExternalLink } from 'lucide-react'

export default function ExtensionSettingsPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Back to Settings */}
      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Kembali ke Settings
      </Link>

      {/* Hero Header */}
      <div className="bg-gradient-to-br from-[#1a472a] to-[#12311d] rounded-2xl p-8 text-white mb-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-medium backdrop-blur-sm">
              <Puzzle className="w-3.5 h-3.5 text-emerald-300" />
              <span>Streak CRM Replacement for Gmail</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Ekstensi Chrome HTRN B2B Sales
            </h1>
            <p className="text-emerald-100 text-sm max-w-xl">
              Hubungkan Gmail (mail.google.com) langsung ke database HTRN Platform. Deteksi buyer, perbarui pipeline, dan buat balasan negosiasi AI berstandar Direksi dalam satu klik.
            </p>
          </div>

          <div className="flex flex-col gap-2.5 w-full sm:w-auto shrink-0">
            <a
              href="/downloads/htrn-chrome-extension.zip"
              download="htrn-chrome-extension.zip"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white text-[#1a472a] font-semibold text-sm hover:bg-emerald-50 transition-all shadow-md active:scale-95 text-center"
            >
              <Download className="w-4 h-4" />
              Unduh Ekstensi (.ZIP)
            </a>
            <span className="text-[11px] text-emerald-200 text-center">
              Versi 1.0.1 (Manifest V3) • Default app.haturan.com
            </span>
          </div>
        </div>
      </div>

      {/* Grid: 2 Installation Methods */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Method 1: Sideload via Zip (Works Anywhere Now) */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm">
                1
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                Siap Dipakai Sekarang
              </span>
            </div>
            <h2 className="text-base font-bold text-gray-900 mb-1">
              Metode Portable (Unduh ZIP)
            </h2>
            <p className="text-xs text-gray-500 mb-5 leading-relaxed">
              Bisa dipasang di laptop atau komputer mana pun tanpa perlu install dari folder lokal proyek.
            </p>

            <ol className="space-y-3.5 text-xs text-gray-700">
              <li className="flex items-start gap-2.5">
                <span className="font-bold text-emerald-700">1.</span>
                <span>
                  Klik tombol <strong>Unduh Ekstensi (.ZIP)</strong> di atas lalu ekstrak (unzip) file tersebut ke folder mana saja di laptop Anda.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="font-bold text-emerald-700">2.</span>
                <span>
                  Buka browser Chrome/Edge, ketik <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[11px] font-mono text-gray-800">chrome://extensions/</code> di URL bar.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="font-bold text-emerald-700">3.</span>
                <span>
                  Nyalakan sakelar <strong>Developer mode</strong> di pojok kanan atas.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="font-bold text-emerald-700">4.</span>
                <span>
                  Klik <strong>Load unpacked</strong> di kiri atas dan pilih folder hasil ekstrak tadi. Selesai!
                </span>
              </li>
            </ol>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 flex items-center gap-2 text-xs text-emerald-800 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Default endpoint otomatis tersambung ke app.haturan.com</span>
          </div>
        </div>

        {/* Method 2: Official Chrome Web Store Direct Install */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm">
                2
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">
                1-Klik (Resmi Google)
              </span>
            </div>
            <h2 className="text-base font-bold text-gray-900 mb-1">
              Chrome Web Store (Unlisted Link)
            </h2>
            <p className="text-xs text-gray-500 mb-5 leading-relaxed">
              Google Chrome melarang instalasi 1-klik dari website sembarang demi alasan keamanan (kecuali melalui Web Store).
            </p>

            <div className="space-y-3 text-xs text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100 mb-4">
              <p>
                <strong>Cara Kerja Unlisted:</strong> Ekstensi diunggah ke Google Chrome Web Store dengan mode <em>Unlisted</em> (privat, tidak tampil di pencarian publik).
              </p>
              <p>
                Hanya tim internal yang memiliki link rahasia di halaman ini yang bisa mengklik tombol <strong>&quot;Tambahkan ke Chrome&quot;</strong> langsung tanpa Developer Mode.
              </p>
            </div>
          </div>

          <div>
            <button
              disabled
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-400 font-medium text-xs cursor-not-allowed text-center"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Pasang dari Chrome Web Store (Segera Tersedia)
            </button>
            <p className="text-[11px] text-gray-400 text-center mt-2">
              Dapat dipublikasikan via akun Google Developer Konsol ($5 one-time)
            </p>
          </div>
        </div>
      </div>

      {/* Feature Highlights */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-700" />
          Fitur Utama Saat Membuka Gmail (mail.google.com)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <div className="font-semibold text-gray-900 mb-1 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-emerald-700" />
              Deteksi Buyer Otomatis
            </div>
            <p className="text-gray-500 leading-relaxed">
              Saat membaca thread email, nama perusahaan, volume tier, dan status pipeline langsung terbaca di dock kanan bawah.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <div className="font-semibold text-gray-900 mb-1 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-emerald-700" />
              Draf Balasan AI (JEV System 1)
            </div>
            <p className="text-gray-500 leading-relaxed">
              Satu klik menyusun penawaran resmi dan edukasi mutu rempah tanpa melanggar batas harga modal (floor Rp 140k).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <div className="font-semibold text-gray-900 mb-1 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              Privasi 100% Mandiri
            </div>
            <p className="text-gray-500 leading-relaxed">
              Bebas biaya langganan Streak ($49–$129/bln). Data tersimpan aman di database Supabase PT Haturan Spice Indonesia.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
