<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# 🛡️ HTRN Platform Operational & Architecture Standards (Pak Agung Gunawan)

### 1. Standarisasi Mata Uang: Wajib IDR (Indonesian Rupiah / Rp)
- Seluruh nilai nominal di HTRN Platform **wajib menggunakan mata uang IDR (Rupiah)**.
- Gunakan utilitas standar `formatCurrency(amount, 'IDR')` atau `formatRupiah(amount)` dari `@/lib/utils`.
- Format tampilan: `id-ID`, `style: 'currency'`, `currency: 'IDR'`, `maximumFractionDigits: 0` (contoh: `Rp 155.000` dengan tanda titik sebagai pemisah ribuan).
- Dilarang keras menampilkan nominal mentah tanpa format Rupiah, dan dilarang menggunakan mata uang USD untuk perdagangan komoditas domestik.

### 2. Standar Universal Data Table
- Setiap tabel data di seluruh platform wajib dilengkapi:
  1. **Search**: Pencarian instan (debounced) multi-kolom (nomor dokumen, nama pihak, dsb).
  2. **Filtering**: Filter status (draft, sent, paid, dsb) dan filter mode data.
  3. **Sorting**: Pengurutan kolom (klik header kolom untuk urutan asc/desc).

### 3. Integritas Master Data & ERD
- Tidak boleh ada variabel kalkulasi penting yang berdiri sendiri (*orphaned*) atau di-hardcode di kode aplikasi.
- Parameter dinamis (rasio susut, biaya olah, margin floor) wajib terhubung ke tabel master database (`app_settings` / `pricing_parameters`).
- Seluruh relasi database terdokumentasi rapi di `docs/DATABASE_ERD_AND_MASTER_DATA.md`.

### 4. Wizard Easy Config untuk Kredensial & Integrasi
- Setiap fitur yang memerlukan token, API key, atau sandi wajib menyediakan antarmuka **Wizard Easy Config** langkah-demi-langkah dengan panduan sumber token dan uji koneksi (*Ping Test*).
- Patuhi standar Hetzer Credential Safety (`secretRef:...`).

### 5. Pemisahan Data Uji (Test Mode) vs Produksi Riil
- Seluruh tabel transaksi (`quotations`, `invoices`, `purchase_orders`, `supplier_settlements`) memiliki flag `is_test boolean default false`.
- Laporan omset, laba, dan transaksi resmi wajib mengecualikan transaksi bertanda `is_test = true`.
- Tampilan tabel menyediakan toggle filter: `[Produksi Riil]`, `[Semua Data]`, `[Data Uji / Demo]`.

### 6. Shopee Wholesale Price Crawler Engine
- Engine penarik harga grosir pasar bawang goreng Brebes dari Shopee via scheduler dan on-demand trigger.
- Menganalisis harga per kg, lokasi pengirim, rating, dan indikasi kemurnian vs oplosan tepung.

### 7. Modul Strategi Marketing B2B
- Menyediakan battlecard persona buyer (HORECA, Resto Jaringan, Pabrik Bumbu).
- Kalkulator interaktif ROI kemurnian: 0% tepung vs 25% tepung tapioka.
- Generator skrip WhatsApp pitch penawaran sampel dan follow-up.
