# Ringkasan Implementasi: HTRN Platform

## 🎯 Visi & Konteks Strategis Pak Agung Gunawan
Pak **Agung Gunawan** (Direktur / Founder PT Haturan Spice Indonesia, `haturan.com`):
Sebagai founder dengan latar belakang IT yang mengorkestrasi perdagangan komoditas rempah B2B, HTRN Platform dirancang dengan prinsip **Asset-Light B2B Trading & Maklon Dropship**. 

PT Haturan Spice Indonesia tidak perlu menanggung beban sewa gudang fisik, mesin pengering/spinner, maupun armada truk sendiri. Seluruh aktivitas produksi, sortasi grade murni (tanpa tepung), dan pengemasan dialihdayakan secara penuh (*100% outsourced*) kepada **Mas Parmin (CV Daun Mas / Hub Bogor)** dengan menerapkan protokol **Blind Shipping**:
1. Mas Parmin bertindak sebagai fasilitas pemenuhan pesanan (*Fulfillment Hub*).
2. Armada pengiriman Mas Parmin membawa **Surat Jalan & BAST resmi ber-kop surat PT Haturan Spice Indonesia**.
3. Label kemasan bal (5 kg) dan master box karton (20 kg) beridentitas Haturan (atau neutral), mencegah terjadinya disintermediasi / pembeli mem-bypass Haturan.

---

## 🚀 Fitur Baru: Mas Parmin B2B Maklon Dropship Desk & Surat Jalan PDF (TASK-12)

### 1. Mesin Kalkulasi Logistik & Finansial (`lib/fulfillment-helper.ts`)
- **Formula Kemasan Presisi**:
  - $1\text{ bal inner PE ganda food-grade} = 5\text{ kg}$.
  - $1\text{ master carton box} = 4\text{ bal} = 20\text{ kg}$.
  - Opsi curah zak karung PP $= 25\text{ kg}$.
  - Menghitung sisa bal eceran jika volume bukan kelipatan 20 kg (contoh: 45 kg = 2 master box + 1 bal ecer).
- **Kalkulator Finansial Gross Margin Terkunci**:
  - HPP Modal Mas Parmin (Bogor): $\text{Rp } 125.000/\text{kg}$.
  - Estimasi Ongkir Lalamove/Deliveree Jabodetabek: $\text{Rp } 350.000$ (Flat / Armada Pickup/Blind Van).
  - Biaya kemasan karton & inner PE ganda: $\text{Rp } 12.000/\text{box}$.
  - Otomatis menghitung: Omzet Penjualan, Total HPP Mas Parmin, Total Biaya Pengemasan, Total Ongkir, **Laba Kotor Riil (Gross Profit)**, dan **Persentase Margin Kotor**.
- **Generator Teks SPK WhatsApp Instan**:
  - Menghasilkan format pesan WhatsApp formal siap kirim langsung ke nomor Mas Parmin (Bogor), lengkap dengan nomor SPK (`SPK/MP/YYYY/XXXX`), rincian bal & box, tanggal siap kirim, tautan Surat Jalan resmi, dan instruksi blind shipping.

---

### 2. Dokumen Resmi Surat Jalan & BAST PDF (`app/api/pdf/surat-jalan/[id]/route.ts`)
- Menghasilkan dokumen cetak resmi ukuran A4 siap cetak 2 rangkap (*Print-to-PDF*):
  - **Kop Surat Resmi PT Haturan Spice Indonesia** (Alamat kantor, email pengadaan, NIB / legalitas).
  - Metadata Pengiriman: Nomor Surat Jalan (`SJ/HTRN/YYYY/XXXX`), Nomor SPK, Tanggal Kirim, Tanggal Diterima.
  - Alamat Pengirim: *Hub Sortasi & Logistik Haturan (Bogor, Jawa Barat)*.
  - Alamat Penerima: Data Buyer lengkap dengan PIC dan nomor telepon.
  - Tabel Rincian Komoditas: Nama komoditas, grade kualitas (*Brebes Super Murni Tanpa Tepung*), volume total kg, dan rincian kemasan (jumlah bal 5 kg & master carton).
  - Syarat & Ketentuan Penerimaan (*Quality & Weight Guarantee*).
  - **3 Blok Tanda Tangan Resmi**:
    1. Pengirim / Driver Hub Bogor (Armada Mas Parmin atas nama Haturan)
    2. Penerima / Petugas Dapur Buyer (QC Gudang / Head Chef)
    3. Mengetahui / Direktur Utama PT Haturan Spice Indonesia (Pak Agung Gunawan)

---

### 3. Modal Interaktif & Tombol Aksi di Quotation Detail (`components/quotations/`)
- **Aksi Satu Klik**: Tombol *"Kirim SPK ke Mas Parmin (Bogor)"* pada halaman detail quotation (`/quotations/[id]`).
- **Antarmuka Modal Terpadu** (`MasParminFulfillmentModal.tsx`):
  - Ringkasan Finansial: Tampilan kartu hijau interaktif dengan estimasi laba kotor dan margin kotor real-time.
  - Rincian Kemasan Logistik: Penghitungan otomatis bal 5 kg dan master box karton.
  - Tanggal Siap Kirim (Target Ready Date): Default H+3 produksi.
  - Pilihan Eksekusi Cepat:
    - **Salin Format SPK WhatsApp**: Tersalin ke clipboard dengan notifikasi toast.
    - **Buka Chat WhatsApp Mas Parmin**: Membuka tautan `https://wa.me/...` langsung ke HP Mas Parmin.
    - **Buka / Cetak Surat Jalan Resmi (PDF)**: Membuka dokumen Surat Jalan di tab baru siap print.

---

### 4. Ekspansi Hermes MCP Server (Tools Baru untuk Hermes Agent)
Dua endpoint MCP baru terintegrasi di `app/api/mcp/route.ts` dan `scripts/mcp-server.ts`:
1. `htrn_generate_mas_parmin_spk`:
   - Menerima `buyer_id` / `buyer_company`, `quantity_kg`, `unit_selling_price`, dan `delivery_address`.
   - Menghasilkan breakdown bal, box, laba kotor, margin %, link surat jalan, serta teks WhatsApp SPK lengkap.
2. `htrn_get_surat_jalan_link`:
   - Mengambil URL dokumen resmi Surat Jalan & BAST berdasarkan ID pemesanan atau penawaran.

---

### 5. Optimasi Performa Dashboard & Turbopack
- **Penanganan State Loading & Error**:
  - Dibuat `app/(dashboard)/loading.tsx` dengan skeleton placeholder animasi pulsing.
  - Dibuat `app/(dashboard)/error.tsx` untuk penanganan error anggun dengan tombol pemulihan *Try Again*.
- **Konfigurasi Turbopack Bersih** (`next.config.ts`):
  - Membatasi `optimizePackageImports` hanya untuk modul UI (`lucide-react`, `recharts`), mencegah konflik resolusi module dengan backend Supabase pada lingkungan monorepo.
- **Debounce & AbortController pada GlobalSearch**:
  - Mencegah kueri ganda dan race condition saat pengguna mengetik di bilah pencarian global.

---

## 🧪 Hasil Verifikasi & Pengujian Sistem

| Pengujian | Target Komponen | Parameter Uji | Hasil | Status |
|---|---|---|---|---|
| **Matematika Kemasan 100 kg** | `calculatePackagingBreakdown(100)` | 100 kg | 20 bal @ 5kg, 5 master box (0 sisa bal) | ✅ Lulus |
| **Matematika Kemasan 500 kg** | `calculatePackagingBreakdown(500)` | 500 kg | 100 bal @ 5kg, 25 master box (0 sisa bal) | ✅ Lulus |
| **Matematika Kemasan Ganjil** | `calculatePackagingBreakdown(45)` | 45 kg | 9 bal @ 5kg, 2 master box + 1 bal ecer | ✅ Lulus |
| **Kalkulasi Laba Kotor** | `calculateFulfillmentFinancials(500, 155000)` | Omzet: Rp 77.500.000 | Biaya: Rp 62.500.000 HPP, Rp 300.000 box, Rp 350.000 ongkir $\rightarrow$ **Laba: Rp 14.350.000 (18.5%)** | ✅ Lulus |
| **Surat Jalan PDF Route** | `GET /api/pdf/surat-jalan/DEMO` | Endpoint HTTP | Status 200 OK, HTML A4 print-ready dengan kop surat & 3 TTD | ✅ Lulus |
| **Production Build** | `npm run build` | Turbopack Next.js 16 | **44/44 route** terkompilasi optimal (32.6s, 0 TS error) | ✅ Lulus |
| **Git Deployment** | `git push origin main` | Commit `6a97424` | Berhasil di-push ke `github.com/agunggnn/htrn-platform` | ✅ Lulus |
| **Kanban Task Tracking** | `.hermes-kanban.json` | `TASK-12` | Ditandai sebagai Done | ✅ Lulus |

---

## 📌 Cara Menggunakan Fitur untuk Pak Agung

1. **Membuat & Mengirim SPK ke Mas Parmin**:
   - Masuk ke menu **Quotations** di dashboard ([http://localhost:3000/quotations](http://localhost:3000/quotations)).
   - Klik salah satu penawaran yang sudah disepakati (misal penawaran 500 kg @ Rp 155.000).
   - Klik tombol **"Kirim SPK ke Mas Parmin (Bogor)"**.
   - Periksa rincian kemasan (100 bal / 25 karton) dan laba kotor yang terkunci (Rp 14.350.000).
   - Klik tombol **"Kirim SPK via WhatsApp"** untuk langsung menyapa Mas Parmin dengan instruksi lengkap.
2. **Mencetak Surat Jalan Resmi (Blind Shipping)**:
   - Dari modal yang sama, klik **"Lihat Surat Jalan (PDF)"** (atau akses langsung via `/api/pdf/surat-jalan/[id]`).
   - Tekan `Ctrl + P` untuk mencetak 2 rangkap:
     - 1 rangkap untuk arsip tanda terima driver Mas Parmin.
     - 1 rangkap untuk ditandatangani oleh kepala dapur / penerima buyer.
3. **Instruksi Otomatis via Hermes Agent**:
   - Jika berkomunikasi via Hermes MCP, cukup minta:
     > *"Hermes, buatkan SPK Mas Parmin untuk pesanan 500 kg Bawang Goreng ke Katering Barokah harga Rp 155.000"*
   - Hermes akan memanggil tool `htrn_generate_mas_parmin_spk` dan memberikan teks siap forward beserta tautan surat jalannya.

---

## 🪙 Standardisasi Mata Uang Rupiah (IDR / Rp) (TASK-13)

### 1. Akar Masalah Munculnya Simbol Dollar ($)
- Pada awal perancangan template boilerplate B2B CRM, nilai default formatting diset ke mata uang internasional (`USD` / `en-US` locale dengan simbol `$`).
- Beberapa form pembuatan data (Quotations, Invoices, Buyers) menempatkan `USD` sebagai pilihan default baris pertama.
- Komponen grafik dan ringkasan metrik dashboard (`RevenueChart`, `SalesPipeline`, `TopBuyersWidget`) menggunakan formatter angka lokal bawaan tanpa penyesuaian skala ribuan/jutaan Indonesia.

### 2. Solusi & Perubahan yang Diterapkan
1. **Universal Currency Formatter** (`lib/utils.ts`):
   - Standar `formatCurrency(amount, currency = 'IDR')` sekarang default ke `id-ID` dengan `maximumFractionDigits: 0` (contoh: `Rp 155.000` dengan tanda titik ribuan).
   - Fungsi pembantu `formatRupiah(amount)` untuk formatting cepat tanpa desimal.
2. **Dashboard & Visual Analytics**:
   - `app/(dashboard)/page.tsx`: Ringkasan omzet, outstanding invoice, dan pipeline ditampilkan dalam `Rp`.
   - `components/dashboard/RevenueChart.tsx`: Skala sumbu Y disesuaikan dengan terminologi finansial Indonesia:
     - $\ge 1.000.000.000 \rightarrow \text{Rp } X\text{M}$ (Miliar)
     - $\ge 1.000.000 \rightarrow \text{Rp } X\text{jt}$ (Juta)
     - $\ge 1.000 \rightarrow \text{Rp } X\text{rb}$ (Ribu)
   - `components/dashboard/SalesPipeline.tsx` & `TopBuyersWidget.tsx`: Seluruh kartu deal dan total omzet buyer kini berformat `Rp`.
3. **Form & Data Entry**:
   - `components/buyers/BuyerForm.tsx`: Default currency diset ke `IDR`, dropdown memprioritaskan `IDR (Indonesian Rupiah)` di urutan teratas.
   - `components/quotations/QuotationBuilder.tsx`: Default mata uang `IDR`, bahasa default `id`.
   - `components/invoices/InvoiceForm.tsx`: Default mata uang `IDR`, urutan pilihan `['IDR', 'USD', 'EUR', 'GBP', 'SGD']`.
4. **Pembersihan Ikon Antarmuka**:
   - Seluruh ikon `DollarSign` dari `lucide-react` digantikan dengan ikon kontekstual `Banknote` pada `MasParminFulfillmentModal`, `CommodityMentorCard`, dan `ReportsHubPage`.

### 3. Verifikasi & Deployment
- `npm run typecheck`: **0 Type Errors**.
- `npm run build`: **45/45 routes** berhasil dikompilasi via Turbopack Next.js 16.
- Git commit & push: `75a7d9e` (`fix(currency): standardize all currency formatters, forms, and widgets to Rupiah IDR`).

---

## 🌐 Perbaikan Endpoint Ekstensi Chrome ke Domain Cloud (`app.haturan.com`) (TASK-14)

### 1. Masalah yang Terjadi
- Ekstensi Chrome sebelumnya mengalami error *"Failed to fetch"* karena:
  1. `background.js` secara eksplisit menulis `htrnApiBase: 'http://localhost:3000'` ke `chrome.storage.local` saat instalasi.
  2. `popup.js` dan fallback default mengarah ke `http://localhost:3000`.
  3. Pengguna yang mengunduh zip dan memasangnya di laptop/perangkat di luar server lokal tidak dapat terhubung karena `localhost:3000` tidak ada yang menjalankan server development.

### 2. Solusi yang Diterapkan
1. **Konfigurasi Default Cloud Terpusat**:
   - `extension/manifest.json`: Versi dinaikkan ke `1.0.1`, `host_permissions` mengutamakan `https://app.haturan.com/*` dan `https://*.haturan.com/*`.
   - `extension/background.js`: Service worker menetapkan `DEFAULT_API_BASE = 'https://app.haturan.com'`. Ditambahkan fungsi otomatisasi migrasi jika mendeteksi nilai lawas `http://localhost:3000`.
   - `extension/content.js`: Menggunakan `https://app.haturan.com` sebagai basis default, otomatis memigrasi nilai `chrome.storage.local` lama dari `localhost:3000` ke `https://app.haturan.com`, dan menyinkronkan perubahan secara real-time via `chrome.storage.onChanged`.
   - `extension/popup.js`: Tombol cepat *Cloud Haturan* dan input default diset ke `https://app.haturan.com`, dengan status visual status koneksi yang informatif.
2. **Paket Portable ZIP Terbarui**:
   - Berkas `public/downloads/htrn-chrome-extension.zip` telah dibuat ulang dengan file ekstensi versi 1.0.1 terbaru.
   - Script otomasi `npm run build:extension` ditambahkan ke `package.json`.
   - Label halaman `/settings/extension` diperbarui menjadi `Versi 1.0.1 (Manifest V3) • Default app.haturan.com`.
3. **Deployment**:
   - Perubahan telah di-commit (`16c5b2d`) dan di-push ke remote `origin/main`.

---

## 🛡️ Standar Kepatuhan Non-Overclaim, Jaminan Halal & Audit Indeks Pasar Resmi (TASK-15)

### 1. Prinsip Perlindungan Kerahasiaan & Hukum
- **Kerahasiaan Vendor (Strict Privacy)**: Nama "Mas Parmin", "CV Daun Mas", dan rincian HPP modal internal diproteksi ketat dan hanya tampil di internal dashboard/founder view. Pada dokumen publik/buyer, fasilitas disebut sebagai *"Fasilitas Pengolahan & Sentra Sortasi Mitra Haturan (Bogor, Jawa Barat)"*.
- **Zero Over-Claim**:
  - PT Haturan tidak mengklaim penerbitan sertifikat yang belum dipegang langsung.
  - TDS ditegaskan sebagai *Target Specification* (spesifikasi sasaran mutu standar B2B).
  - Sertifikat Hasil Uji Laboratorium (CoA) per lot pengiriman dinyatakan disediakan dari laboratorium independen terakreditasi KAN (seperti SIG / Sucofindo) berdasarkan kontrak pengadaan industri.

### 2. Dokumen Resmi Baru: Jaminan Kehalalan & Keamanan Pangan
- Endpoint cetak PDF resmi baru diaktifkan: `/api/pdf/halal-declaration/bawang-goreng`
- Memuat kop surat resmi PT Haturan Spice Indonesia, nomor surat resmi, dan tanda tangan Direktur Utama (Pak Agung Gunawan).
- Menjamin kepatuhan Sistem Jaminan Produk Halal (SJPH) fasilitas mitra, minyak nabati kelapa sawit bersertifikasi Halal & BPOM, bebas babi/alkohol/najis, non-GMO, dan bebas bahan pengawet kimia.

### 3. Audit Indeks Pasar Terbuka (Bapanas & Kramat Jati)
- Modul `lib/commodity-mentor.ts` menyediakan indeks pasar terverifikasi dengan timestamp update harian (WIB).
- Komponen `ItemPriceCard` menampilkan tombol cepat dokumen resmi (`TDS Spek ↗`, `Jaminan Halal ↗`) serta catatan kaki sumber pasar terbuka.
- Halaman detail `/prices/[itemId]` dilengkapi kartu visual **"Audit Indeks Harga Bahan Mentah & Titik Impas Olahan Murni"**:
  - Harga harian Pasar Induk Kramat Jati DKI & Panel Bapanas Nasional beserta persentase naik/turun.
  - Ekuivalensi modal bahan mentah murni dengan rasio susut $3.8\times$ (Rp 108.300/kg).
  - Tautan langsung (klik luar) ke situs resmi:
    - *Panel Harga Pangan Bapanas RI* (`panelharga.badanpangan.go.id`)
    - *Info Pangan Jakarta Pasar Induk Kramat Jati* (`infopangan.jakarta.go.id`)
    - *PIHPS Bank Indonesia* (`hargapangan.id`)

### 4. Hasil Verifikasi Sistem
- Hetzer Secret Sniffer (`v0.5.11`): **[v] CLEAN (No secrets detected)** (0.15 ms).
- TypeScript Typecheck: **0 type errors**.
- Next.js Production Build: **46/46 routes** terkompilasi optimal.
- Git commit & push: `56b6e4e` (`feat(compliance): add non-overclaim Halal Assurance PDF, strengthen TDS disclaimers, and integrate verified Bapanas/IPJ market benchmark audit`).

---

## 📱 WhatsApp B2B Sales Outreach Desk & Generator Skrip Penawaran (TASK-16)

### 1. Tujuan & Solusi
Memfasilitasi penawaran B2B ke calon pembeli (katering, resto, pabrik) secara instan via WhatsApp:
- Kontak WhatsApp buyer selalu ditampilkan dalam format internasional bersih (`628...` dan `+62 812-...`) lengkap dengan tombol 1-klik **"Salin Nomor HP"**.
- Dilengkapi **WhatsApp B2B Sales Outreach Desk Modal** interaktif yang dapat diakses langsung dari **Tabel Prospek Buyer** (`/buyers`) dan **Profil Detail Buyer** (`/buyers/[id]`).

### 2. 4 Strategi Skrip Penawaran Teruji (`lib/whatsapp-pitch-helper.ts`)
1. 🎁 **Penawaran Sampel Gratis 250g (*Low Barrier to Entry*)**:
   - Menawarkan tester kitchen trial ke dapur buyer tanpa biaya sampel.
   - Menyertakan link TDS Spek dan Surat Jaminan Mutu & Halal resmi.
2. 📊 **Penawaran SPH & Matriks Harga Volume**:
   - Menjelaskan rincian harga volume (Tier 1 Rp 165k, Tier 2 Rp 155k, Tier 3 Rp 149k, Tier 4 Rp 144k Franco).
   - Termin pembayaran CBD / DP 50% saat PO untuk menjaga *cash flow* tanpa modal pribadi.
3. 💡 **Komparasi Ilmiah Hemat per Porsi Saji (*Cost-Per-Serving*)**:
   - Membuktikan secara matematis bahwa bawang tiris sentrifugal Haturan (3g mengapung) jauh lebih hemat daripada bawang murah berbalut tepung 15–20% (6g tenggelam), menghemat **Rp 255 per mangkok**.
4. 🔒 **Kontrak Penguncian Harga Flat 3 Bulan (*Price-Lock*)**:
   - Mengunci harga stabil menghadapi fluktuasi panen dan musim hujan.

### 3. Fitur Interaktif Antarmuka (UI/UX)
- **Tombol Salin Nomor HP**: Otomatis menyalin nomor bersih ke clipboard dengan notifikasi toast.
- **Pratinjau Teks WhatsApp Live**: Teks terformat rapi dengan bold WhatsApp (`*...*`), poin-poin, dan dapat diedit langsung sebelum dikirim.
- **Tombol "📋 Salin Pesan WA"**: Menyalin teks penawaran lengkap ke clipboard.
- **Tombol "💬 Buka WhatsApp Langsung (wa.me)"**: 1-klik membuka aplikasi WhatsApp Web/Desktop dengan teks pesan pre-filled, sekaligus otomatis memperbarui status interaksi buyer di CRM menjadi `sent`.

---

## 🟢 Verifikasi WhatsApp Dinamis & Penyesuaian Ikon Kontak (TASK-17)

### 1. Latar Belakang & Masalah
Pak Agung menyampaikan:
> *"beberapa nomor tidak terdaftar di whatsapp, bukankah lebih baik ada verifikasi kalau ada whatsapp maka icon berubah menjadi icon whatsapp"*

Pada praktiknya di lapangan:
- Beberapa nomor kontak buyer di database merupakan saluran telepon kabel kantor (PSTN seperti `021-...`, `022-...`) atau nomor GSM lama yang tidak didaftarkan akun WhatsApp.
- Jika antarmuka selalu menampilkan ikon WhatsApp hijau dan tombol `wa.me`, tim sales akan membuang waktu mencoba mengirim chat ke tautan yang gagal dibuka (*"Phone number isn't on WhatsApp"*).
- Diperlukan mekanisme visual dinamis yang membedakan nomor aktif WhatsApp, nomor non-WhatsApp, dan saluran PSTN, lengkap dengan opsi verifikasi 1-klik.

---

### 2. Solusi & Perubahan Arsitektur

#### A. Helper Verifikasi Kontak Cerdas (`lib/buyers-helper.ts`)
- Memperluas tipe `WhatsAppStatus` dengan status verifikasi eksplisit:
  - `'verified_active'`: Nomor telah diverifikasi memiliki WhatsApp aktif.
  - `'not_registered'`: Nomor telah dikonfirmasi **TIDAK terdaftar** di WhatsApp.
- Fungsi pembantu baru `getWhatsAppVerificationInfo(buyer)`:
  - Menggabungkan hasil analisis format nomor (`verifyPhoneNumber`) dan status CRM (`getWhatsAppStatus`).
  - Mengembalikan metadata terpadu: `isLandline`, `isNotRegistered`, `isVerifiedActive`, dan `hasWhatsApp`.

#### B. Tabel Prospek Buyer Interaktif (`components/buyers/BuyerTableView.tsx`)
- **Ikon & Badge Dinamis pada Kolom Kontak**:
  - 🟢 **WhatsApp Aktif Terverifikasi**: Menampilkan ikon `MessageCircle` hijau cerah + badge `✓ Aktif` + operator GSM + link langsung `https://wa.me/...`.
  - 🔴 **Bukan Nomor WhatsApp**: Ikon otomatis berubah menjadi `PhoneOff` merah muda + badge `✕ Bukan WA` + link panggilan telepon suara `tel:...`.
  - ☎️ **Telepon Kantor (PSTN)**: Ikon `Phone` amber + badge `☎️ PSTN Kantor` + link panggilan telepon `tel:...`.
  - ⚪ **Belum Dicek**: Tautan netral dengan status `⚪ Belum Dicek / Dikontak`.
- **Dropdown Verifikasi Cepat Inline**:
  - Kolom status WhatsApp di baris tabel menyediakan pilihan instan:
    - `⚪ Belum Dicek / Dikontak`
    - `🟢 ✓ Terverifikasi WA Aktif`
    - `🔴 ✕ Bukan Nomor WA`
    - `🔵 WA Terkirim`
    - `🟢 Buyer Membalas`
    - `🟣 Minta Sampel`
    - `🟠 Nego / Pending`
- **Penyesuaian Tombol Aksi Penjualan**:
  - Jika nomor terdeteksi `Bukan WA` atau `PSTN Kantor`: Tombol aksi otomatis berubah dari tombol hijau `WA Penawaran` menjadi tombol slate `📞 Telepon / Skrip`, mencegah sales rep terjebak link WhatsApp mati.
  - Jika nomor memiliki WhatsApp: Menampilkan tombol hijau cerah `💬 WA Penawaran`.

#### C. Outreach Desk Modal dengan Toggle Verifikasi (`components/buyers/WhatsAppOutreachModal.tsx`)
- **Bilah Verifikasi 1-Klik**:
  - Tombol instan `[✓ WA Aktif]` dan `[✕ Bukan WA]` langsung di bilah nomor kontak.
  - Menekan tombol langsung menyimpan status ke database Supabase via `/api/crm/interaction` dan menyinkronkan seluruh tabel tanpa reload.
- **Banner Peringatan Pintar**:
  - Jika nomor ditandai `Bukan WA` atau merupakan `PSTN Kantor`, modal menampilkan banner rose peringatan:
    > *"Nomor Tidak Terdaftar di WhatsApp — Nomor ini ditandai tidak memiliki WhatsApp. Disarankan menghubungi langsung via telepon suara ke [Nomor] atau mengirimkan dokumen via email PIC."*
- **Tombol Aksi Suara Telepon**:
  - Pada nomor bukan WA, tombol utama di footer berubah menjadi `[📞 Panggil Telepon]` dengan tautan `tel:`, disertai opsi sekunder jika tetap ingin mencoba di WhatsApp Web.

#### D. Halaman Detail Buyer (`components/buyers/BuyerTabs.tsx`)
- Kartu **Overview** menyinkronkan ikon, warna latar, dan judul secara dinamis:
  - Nomor WA Aktif: Kartu bergaris hijau dengan ikon `MessageCircle` dan tombol `Kirim Penawaran WA`.
  - Nomor Bukan WA: Kartu bernuansa rose dengan ikon `PhoneOff`, badge `✕ Bukan WA`, dan tombol cepat `Panggil Telepon` + `Buka Skrip / Status`.
  - Nomor PSTN Kantor: Kartu bernuansa amber dengan ikon `Phone` dan badge `☎️ PSTN Kantor`.

---

### 3. Hasil Verifikasi Sistem

| Pengujian | Target Komponen | Hasil | Status |
|---|---|---|---|
| **TypeScript Typecheck** | `npm run typecheck` | 0 error, seluruh tipe union `WhatsAppStatus` valid | ✅ Lulus |
| **Production Build** | `npm run build` | **46/46 routes** terkompilasi optimal (Next.js 16 Turbopack) | ✅ Lulus |
| **Hetzer Secret Sniffer** | `hetzer sniffer scan` | **[v] CLEAN (No secrets detected)** (0.12 ms) | ✅ Lulus |
| **Deployment Git** | `git push origin main` | Commit `be54699` ter-push ke `github.com/agunggnn/htrn-platform` | ✅ Lulus |

---

## ⚡ WhatsApp Web Auto-Sync Engine via HTRN Chrome Extension (TASK-18)

### 1. Tujuan & Solusi
Menjawab kebutuhan otomasi sinkronisasi nomor WhatsApp gratis tanpa biaya API Meta per percakapan:
- Menghilangkan beban sales rep untuk mengubah status verifikasi nomor secara manual.
- Mengubah **Ekstensi Chrome HTRN** menjadi jembatan cerdas dua arah (*dual bridge*) untuk **Gmail** dan **WhatsApp Web** (`web.whatsapp.com`).

---

### 2. Mekanisme & Arsitektur Auto-Sync

```
[Sales klik "WA Penawaran"]
          │
          ▼
[Membuka web.whatsapp.com/send?phone=628...]
          │
          ▼
[Content Script: extension/wa-content.js aktif]
          │
    ┌─────┴────────────────────────────────────────────────┐
    ▼                                                      ▼
[Popup Dialog Muncul:                                 [Chat Terbuka & Input Box Render:
 "Phone number shared via url is invalid /             footer div[contenteditable="true"]]
  Nomor telepon tidak valid"]                              │
    │                                                      │
    ▼                                                      ▼
[Kirim POST /api/crm/interaction]                     [Kirim POST /api/crm/interaction]
{ phone: "628...", status: "not_registered" }         { phone: "628...", status: "verified_active" }
    │                                                      │
    ▼                                                      ▼
[Supabase CRM terupdate otomatis]                     [Supabase CRM terupdate otomatis]
[Ikon di Dashboard seketika: PhoneOff ✕ Bukan WA]     [Ikon di Dashboard seketika: MessageCircle ✓ WA Aktif]
```

#### A. Content Script WhatsApp Web (`extension/wa-content.js`)
1. **Deteksi Parameter URL**: Mengekstrak digit nomor telepon buyer dari URL `?phone=628...` saat WhatsApp Web dibuka.
2. **Badge Status Mengambang (Floating UI)**:
   - Menampilkan indikator elegan di pojok kanan atas layar WhatsApp Web:
     - ⏳ `[HTRN CRM: Memeriksa nomor +628... ⏳]`
     - 🔴 `[HTRN CRM: Nomor Bukan WhatsApp ✕ (Otomatis Disimpan)]`
     - 🟢 `[HTRN CRM: Nomor WA Terverifikasi Aktif ✓ (Tersimpan)]`
3. **Observer DOM Cerdas**:
   - Memindai kemunculan dialog modal alert (*"Phone number shared via url is invalid"* / *"Nomor telepon yang dibagikan melalui tautan tidak valid"*).
   - Memindai kesuksesan pembukaan composer chat (`#main` dan composer input box).
4. **Pengiriman Otomatis**:
   - Memanggil API endpoint [`/api/crm/interaction`](file:///e:/GitHub/htrn-platform/app/api/crm/interaction/route.ts) dengan mencantumkan `phone`, `status`, dan `summary` log interaksi.

#### B. Peningkatan Endpoint CRM Backend
1. **[`/api/crm/interaction`](file:///e:/GitHub/htrn-platform/app/api/crm/interaction/route.ts)**:
   - Kini menerima pencarian target buyer berdasarkan parameter `phone` jika `buyer_id` tidak diketahui oleh ekstensi browser (mencocokkan variasi awalan internasional `628...` dan lokal `08...`).
2. **[`/api/crm/lookup`](file:///e:/GitHub/htrn-platform/app/api/crm/lookup/route.ts)**:
   - Mendukung pencarian prospek buyer langsung via nomor telepon `?phone=...`.

#### C. Pembaruan Paket Ekstensi Portable (`v1.0.2`)
- `manifest.json`: Versi dinaikkan ke `1.0.2`, `matches` dan `host_permissions` menyertakan `https://web.whatsapp.com/*`.
- Halaman pengaturan [`/settings/extension`](file:///e:/GitHub/htrn-platform/app/%28dashboard%29/settings/extension/page.tsx) diperbarui dengan kartu fitur baru **Auto-Sync WhatsApp Web**.
- Berkas ZIP portabel siap pakai [`public/downloads/htrn-chrome-extension.zip`](file:///e:/GitHub/htrn-platform/public/downloads/htrn-chrome-extension.zip) telah dibuat ulang secara otomatis.

---

### 3. Hasil Pengujian & Verifikasi

| Pengujian | Target Komponen | Hasil | Status |
|---|---|---|---|
| **TypeScript Typecheck** | `npm run typecheck` | 0 type errors | ✅ Lulus |
| **Production Build** | `npm run build` | **46/46 routes** optimal via Turbopack Next.js 16 | ✅ Lulus |
| **Extension ZIP Package** | `npm run build:extension` | Berkas ZIP v1.0.2 siap unduh di `/downloads/` | ✅ Lulus |
| **Hetzer Secret Sniffer** | `hetzer sniffer scan` | **[v] CLEAN (No secrets detected)** (0.13 ms) | ✅ Lulus |
| **Deployment Git** | `git push origin main` | Commit `c5ab9e2` ter-push ke `github.com/agunggnn/htrn-platform` | ✅ Lulus |


---

## 🤖 Integrasi Chatwoot + WhatsApp Business Cloud API + HTRN Agentic MCP (TASK-19)

### 1. Latar Belakang & Visi Pak Agung
Pak Agung menyampaikan:
> *"kenapa saya ingin pakai chatwoot karena saya perlu agentic yang manage melalui mcp ketika saya tidak dapat full didepan pc atau laptop, oke kalau gitu kita pakai bawaan tanpa waha supaya tetap bisa full di cloudflare free. buatkan saya arsitektur erd nya dan design ui/ux"*

Kebutuhan inti:
1. **Otonom Saat AFK**: AI agent dapat merespons inquiry WhatsApp dari calon pembeli B2B secara otomatis ketika Pak Agung tidak di depan laptop/PC.
2. **Zero Hosting Cost (100% Serverless)**: Menghindari beban biaya VPS Docker Chromium (seperti WAHA) dengan memanfaatkan kuota **1.000 percakapan inisiasi pelanggan gratis per bulan** dari Meta WhatsApp Business Cloud API yang dihubungkan ke Chatwoot Cloud Free Tier.
3. **Guardrail Finansial Ketat**: AI agent diinstruksikan tidak pernah menawarkan harga di bawah batas bawah HPP modal Mas Parmin (**Rp 140.000/kg**) dan otomatis mengeskalasi permintaan negosiasi volume besar ($\ge 500$ kg) ke Pak Agung.

---

### 2. Arsitektur Solusi & Komponen yang Dibangun

```
[Calon Buyer WhatsApp]
        │
        ▼ (WhatsApp Cloud API - 1.000 free convs/month)
 [Chatwoot Inbox]
        │
        ├─────────────────────────────────────────┐
        ▼ (Webhook Event: message_created)        ▼ (Iframe Sidebar)
 [HTRN Webhook Receiver]                   [Chatwoot Embedded Dashboard App]
 (/api/crm/chatwoot/webhook)               (/crm/embed/chatwoot?conversation_id=...)
        │                                         │
        ▼ (Evaluasi Intent Cerdas)                ├─ Profil KYC & Stage Buyer
 ┌──────┴─────────────────────────┐               ├─ Matriks Harga Volume B2B
 ▼                                ▼               ├─ Link Buat SPH & TDS PDF
[System 1: FAQ & Sampel]   [System 2: Deal Nego]  └─ Toggle [🤖 Auto-Pilot / 👤 Manual]
- Kirim TDS Spek PDF       - Volume ≥ 500 kg
- Jaminan Halal            - Penawaran harga khusus
- Alur Sampel 250g         - Draft PO / Kontrak
        │                         │
        ▼ (Auto-Reply WA)         ▼ (Internal Note Escalate)
[Kirim ke WhatsApp Buyer]  [Notif Pribadi ke Pak Agung]
        │                         │
        └────────────┬────────────┘
                     ▼
       [HTRN Agentic MCP Server]
       - htrn_chatwoot_get_conversations
       - htrn_chatwoot_reply_whatsapp
       - htrn_chatwoot_set_agent_mode
       (Pak Agung mengontrol via AI Assistant / Hermes)
```

---

### 3. Rincian Modul & Implementasi

#### A. Desain Arsitektur & ERD Lengkap
- Dokumen rancangan komprehensif dibuat pada [`docs/chatwoot_mcp_whatsapp_architecture.md`](file:///e:/GitHub/htrn-platform/docs/chatwoot_mcp_whatsapp_architecture.md) mencakup:
  - Diagram arsitektur data & interaksi sistem
  - ERD Database Relasional (Mermaid ERD)
  - Alur logika otonom AI (System 1 FAQ vs System 2 Deal Maker)
  - Spesifikasi payload webhook Chatwoot
  - Mockup UI/UX Sidebar Iframe Chatwoot

#### B. Skema Database Supabase (`supabase/migrations/20260926000000_chatwoot_mcp_schema.sql`)
1. **`chatwoot_conversations`**:
   - Menyimpan pemetaan percakapan Chatwoot ke entitas `buyers` HTRN CRM.
   - Kolom kontrol mode: `agent_mode` (`auto_pilot`, `human_in_loop`, `paused`).
   - Riwayat pesan terakhir dan skor keyakinan AI (`ai_confidence_score`).
2. **`chatwoot_messages`**:
   - Riwayat pesan masuk & keluar lengkap dengan penanda tipe (`buyer`, `ai_agent`, `human_user`).
   - Rekam jejak *ai_suggested_reply* dan *ai_reasoning*.
3. **`mcp_audit_logs`**:
   - Audit trail untuk setiap pemanggilan alat MCP (`tool_name`, `tool_args`, `tool_result`, `status`).
4. **Row Level Security (RLS)**:
   - Akses penuh diberikan kepada `service_role` (Next.js serverless background workers).

#### C. Mesin Evaluasi Intent Otonom (`lib/chatwoot-helper.ts`)
- Fungsi `evaluateBuyerWhatsAppIntent(messageText, buyer)` menganalisis pesan pembeli:
  - **Inquiry Sampel 250g**: Menjelaskan ketentuan tester gratis untuk kitchen trial dapur resto/katering dengan ongkir ditanggung pemohon.
  - **TDS & Halal Inquiry**: Memberikan ringkasan spesifikasi kadar air $\le 3\%$, minyak $\le 15\%$, tanpa tepung/pengawet, serta link dokumen resmi.
  - **Permintaan Harga / Price List**: Menjelaskan struktur tiering volume (Tier 1 Rp 165k s/d Tier 4 Rp 144k Franco).
  - **Deal / Volume Besar ($\ge 500$ kg) & Negosiasi**: Otomatis dialihkan ke mode `require_human_approval` untuk diputuskan oleh Pak Agung.
  - **Floor Price Guardrail**: Mengunci batas bawah penawaran tidak boleh menyentuh di bawah **Rp 140.000/kg**.
- Fungsi `sendChatwootMessage(conversationId, content, messageType)` untuk mengirim pesan WhatsApp keluar atau private note internal ke Chatwoot via REST API.

#### D. Webhook Receiver (`app/api/crm/chatwoot/webhook/route.ts`)
- Menangani event `message_created` dari Chatwoot.
- Mengabaikan pesan dari bot/agen internal sendiri untuk mencegah *looping*.
- Mencocokkan nomor HP pembeli dengan database `buyers` di Supabase.
- Jika mode percakapan `auto_pilot`, webhook mengeksekusi balasan instan atau membuat private note eskalasi jika membutuhkan persetujuan Pak Agung.

#### E. Embedded Dashboard App untuk Chatwoot (`app/crm/embed/chatwoot/page.tsx`)
- Didesain untuk di-embed sebagai **Dashboard App** di panel kanan Chatwoot (`/crm/embed/chatwoot?conversation_id={{conversation.id}}&contact_phone={{contact.phone_number}}`).
- **Fitur Utama**:
  - Profil Ringkas Pembeli: Nama perusahaan, PIC, status KYC, dan stage CRM.
  - Saklar Mode AI 1-Klik: Pilihan instan antara `[🤖 Auto-Pilot]`, `[👤 Manual / Human]`, dan `[⏸️ Paused]`.
  - Matriks Referensi Harga Cepat: Rincian Tier 1 s/d Tier 4.
  - Tombol Tindakan Cepat: Tautan langsung ke pembuatan SPH resmi (`/quotations/new?buyer_id=...`) dan pembukaan dokumen spesifikasi / jaminan halal.

#### F. Integrasi MCP Server (`app/api/mcp/route.ts`)
Tiga tools baru ditambahkan ke MCP manifest:
1. `htrn_chatwoot_get_conversations`: Mengambil daftar percakapan aktif dari Chatwoot/Supabase dengan filter status dan agent mode.
2. `htrn_chatwoot_reply_whatsapp`: Mengirim pesan balasan WhatsApp ke pembeli atau membuat catatan internal pribadi untuk Pak Agung.
3. `htrn_chatwoot_set_agent_mode`: Mengubah mode agen (`auto_pilot` / `human_in_loop` / `paused`) via AI assistant ketika Pak Agung sedang di luar ruangan/AFK.

---

### 4. Hasil Verifikasi & Uji Sistem

| Pengujian | Target Komponen | Parameter Uji | Hasil | Status |
|---|---|---|---|---|
| **TypeScript Typecheck** | `npm run typecheck` | Validasi semua tipe union & schema | **0 Type Errors** | ✅ Lulus |
| **Next.js Production Build** | `npm run build` | Turbopack Next.js 16 | **49/49 routes** terkompilasi optimal (16.5s) | ✅ Lulus |
| **Route Baru Terverifikasi** | Endpoint API & Embedded UI | `/crm/embed/chatwoot`, `/api/crm/chatwoot/*`, `/api/mcp` | Terdaftar sebagai route aktif | ✅ Lulus |
| **Credential Safety** | Hetzer Secret Check | Verifikasi variabel lingkungan & token | **[v] CLEAN** (Menggunakan env var `CHATWOOT_*`) | ✅ Lulus |
| **Git Deployment** | `git push origin main` | Commit `febbd20` | Berhasil di-push ke `github.com/agunggnn/htrn-platform` | ✅ Lulus |

---

### 5. Panduan Praktis Menghubungkan Chatwoot untuk Pak Agung

1. **Membuat Akun Chatwoot Cloud (Gratis)**:
   - Buka [app.chatwoot.com](https://app.chatwoot.com) dan buat akun (Free tier mendukung 2 inbox agent).
2. **Menghubungkan Saluran WhatsApp Cloud API**:
   - Di menu *Settings $\rightarrow$ Inboxes $\rightarrow$ Add Inbox $\rightarrow$ WhatsApp*.
   - Masukkan *Phone Number ID*, *WhatsApp Business Account ID (WABA)*, dan *Permanent Access Token* dari Meta Developer Portal.
3. **Mengatur Webhook HTRN Platform**:
   - Di menu *Settings $\rightarrow$ Integrations $\rightarrow$ Webhooks $\rightarrow$ Add new webhook*.
   - Masukkan Webhook URL: `https://app.haturan.com/api/crm/chatwoot/webhook` (atau URL domain staging).
   - Centang event: `message_created`.
4. **Memasang Embedded Dashboard App**:
   - Di menu *Settings $\rightarrow$ Applications $\rightarrow$ Dashboard Apps $\rightarrow$ Add new dashboard app*.
   - Nama: `HTRN CRM Desk`
   - URL: `https://app.haturan.com/crm/embed/chatwoot?conversation_id={{conversation.id}}&contact_phone={{contact.phone_number}}`
5. **Menggunakan AI Agent via MCP Saat AFK**:
   - Pak Agung dapat memantau percakapan dari HP / AI Chat kapan saja dengan instruksi sederhana seperti:
     > *"Cek apakah ada pesan WhatsApp baru di Chatwoot hari ini"*
     > *"Setel mode percakapan PT Sumber Rasa menjadi auto_pilot"*
     > *"Kirim balasan penawaran Rp 150.000 ke percakapan ID 42"*

---

## 🧠 Unified JEV System 1 Decision Engine & Asynchronous Background Getcontact KYC Enrichment (TASK-20)

### 1. Visi & Latar Belakang
Menindaklanjuti arahan Pak Agung Gunawan:
> *"untuk harga bawah ini tetap mengikuti aturan harga kan di menu buyer? atau baiknya apa namanya? juga dimana KYC nya? karena kita perlu punya KYC yang bisa konek ke getcontact secara background untuk validasi nomor, atau kamu ada saran lain yang lebih baik dan professional bagaimana mereka manage KYC dalam bisnis ini, meskipun saya yakin kebanyakan masih manual tapi saya berbeda"*

Dua pencapaian besar dalam rilis ini:
1. **Standarisasi Terminologi Finansial & Safety Tripwire**:
   - **Matriks Harga Tier Volume** (`Volume Pricing Matrix`): Aturan harga berjenjang resmi (Tier 1 Rp 165k s/d Tier 4 Rp 144k Franco).
   - **Batas Bawah Negosiasi** (`Floor Price / Hard Floor Margin`): Batas aman modal mutlak **Rp 140.000/kg** (di atas HPP Mas Parmin Rp 125.000/kg) untuk menjamin laba kotor minimum $\ge$ Rp 8.000/kg.
2. **Penyatuan Otak Kognitif JEV (System 1)**:
   - Menghilangkan duplikasi logika evaluasi antara Gmail (`ai-assist`) dan WhatsApp (`chatwoot-helper`).
   - Seluruh evaluasi intensi, batas margin, dan gating termin pembayaran kini disatukan ke dalam **`lib/jev-engine.ts`** yang berjalan dalam waktu **< 30 ms** dengan **$0 biaya token**.
3. **Background Getcontact KYC Enrichment**:
   - Saat nomor WhatsApp baru masuk ke Chatwoot atau saat prospek buyer dibuat, sistem secara otomatis mengeksekusi lookup Getcontact di background secara senyap (*non-blocking*).
   - Tag nama, jumlah spam, dan risk score otomatis tersimpan ke profil buyer tanpa perlu klik tombol manual.

---

### 2. Arsitektur Komponen yang Dibangun

#### A. Unified System 1 JEV Engine (`lib/jev-engine.ts`)
- **Intents Handled**:
  - `SAMPLE_REQUEST`: Evaluasi tester kitchen trial 250g Brebes murni.
  - `FAQ_MUTU_CERT`: Pertanyaan TDS spek mutu, jaminan kehalalan, kadar air $\le 3\%$, minyak sentrifugal, dan bebas tepung.
  - `PRICE_INQUIRY`: Permintaan daftar harga volume resmi (Tier 1–4).
  - `NEGOTIATION`: Tawaran harga dan negosiasi.
  - `PO_CONFIRMATION`: Pemesanan resmi, konfirmasi PO, atau pesanan volume besar ($\ge 500$ kg).
  - `PAYMENT_TERMS_INQUIRY`: Permintaan tempo/termin kredit (Net 7 / Net 14 / Net 30).
  - `HIGH_RISK_SPAM`: Nomor terdeteksi spam/berisiko tinggi pada Getcontact.
- **Floor Price Hard Tripwire**:
  - Mendeteksi penawaran harga di bawah **Rp 140.000/kg**.
  - Otomatis memicu tindakan `reject_below_floor` dengan narasi edukasi mutu murni Brebes tanpa tepung dan perbandingan efisiensi *Cost-Per-Serving*.
- **KYC Gated Payment Terms**:
  - Jika buyer belum terverifikasi KYC atau memiliki risk level tinggi: AI mengunci syarat pembayaran ke **Cash Before Delivery (CBD)** atau **DP 50%**.
  - Jika buyer sudah terverifikasi resmi: AI mengonfirmasi ketersediaan termin sesuai plafon kredit yang disetujui Direktur.

#### B. Background Getcontact KYC Engine (`lib/getcontact.ts`)
- Fungsi baru `triggerBackgroundGetcontactEnrichment()`:
  - Asynchronous & fire-and-forget: Webhook Chatwoot membalas buyer dalam waktu **< 100 ms**, sementara proses dekripsi Getcontact AES-256 berjalan di background.
  - Caching cerdas: Mencegah pemanggilan berulang jika kontak sudah diperiksa dalam 7 hari terakhir.
  - Otomatis memperbarui `buyers.notes` dengan format tag `[GTC: name="..." tags="..." spam=... risk=... date=...]`.

#### C. Integrasi Omnichannel (WhatsApp Chatwoot + Gmail AI-Assist)
1. `lib/chatwoot-helper.ts`: Mengalirkan seluruh pemrosesan pesan WhatsApp ke `evaluateJev(..., channel: 'whatsapp')`.
2. `app/api/crm/chatwoot/webhook/route.ts`: Otomatis memicu background Getcontact enrichment saat mendeteksi nomor buyer.
3. `app/api/crm/ai-assist/route.ts`: Menggunakan `evaluateJev(..., channel: 'email')` untuk mengevaluasi email thread di Gmail.

#### D. MCP Tools Baru untuk AI Agent (Hermes & Antigravity)
- `htrn_jev_evaluate`: Mengevaluasi pesan pembeli apa pun melalui mesin JEV System 1.
- `htrn_getcontact_lookup`: Memicu pengecekan Getcontact dan pengayaan KYC nomor telepon pembeli.
- Tersedia pada endpoint HTTP `/api/mcp` dan stdio server `scripts/mcp-server.ts`.

---

### 3. Hasil Pengujian & Verifikasi

| Pengujian | Target Komponen | Parameter Uji | Hasil | Status |
|---|---|---|---|---|
| **Typecheck** | `npm run typecheck` | Validasi tipe `PipelineStage`, JEV enum, dan helper | **0 Type Errors** | ✅ Lulus |
| **Production Build** | `npm run build` | Turbopack Next.js 16 | **49/49 routes** terkompilasi optimal (13.2s) | ✅ Lulus |
| **Floor Price Tripwire** | `evaluateJev({ text: 'bisa 125rb?' })` | Penawaran < Rp 140.000 | `floorPriceViolation: true`, `actionType: 'reject_below_floor'` | ✅ Lulus |
| **KYC Payment Gate** | `evaluateJev({ text: 'bisa tempo 30 hari?' })` | Unverified buyer | Mengunci CBD / DP 50%, meminta verifikasi NIB/NPWP | ✅ Lulus |
| **Git Deployment** | `git push origin main` | Commit `aaf5cc6` | Berhasil di-push ke `github.com/agunggnn/htrn-platform` | ✅ Lulus |

