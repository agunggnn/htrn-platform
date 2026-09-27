# Database Entity-Relationship Diagram (ERD) & Master Data Integrity
**PT Haturan Spice Indonesia (`HTRN Platform`)**
*Dokumen Arsitektur Master Data, Integritas Relasi, dan Kamus Database*

---

## 1. Visual Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
    ITEMS ||--o{ ITEM_GRADES : "has grades"
    ITEMS ||--o{ PRICE_HISTORY : "tracks price"
    ITEM_GRADES ||--o{ PRICE_HISTORY : "grade price"
    SUPPLIERS ||--o{ PRICE_HISTORY : "provides quotation"
    SUPPLIERS ||--o{ PURCHASE_ORDERS : "receives orders"
    SUPPLIERS ||--o{ SUPPLIER_SETTLEMENTS : "settles payment"

    BUYERS ||--o{ QUOTATIONS : "requests quote"
    BUYERS ||--o{ INVOICES : "billed to"
    BUYERS ||--o{ SUPPLIER_SETTLEMENTS : "buyer reference"

    QUOTATIONS ||--o{ QUOTATION_ITEMS : "contains items"
    QUOTATIONS ||--o{ INVOICES : "converted to"
    QUOTATIONS ||--o{ PURCHASE_ORDERS : "triggers PO"
    QUOTATIONS ||--o{ SUPPLIER_SETTLEMENTS : "settlement basis"

    INVOICES ||--o{ INVOICE_ITEMS : "line items"
    INVOICES ||--o{ PAYMENTS : "records cash"
    INVOICES ||--o{ PACKING_LISTS : "shipping breakdown"
    INVOICES ||--o{ SUPPLIER_SETTLEMENTS : "CBD verification"

    PURCHASE_ORDERS ||--o{ PO_ITEMS : "ordered goods"
    PURCHASE_ORDERS ||--o{ SUPPLIER_SETTLEMENTS : "HPP modal matching"

    COMPANY_PROFILE ||--o{ INVOICES : "letterhead"
    BANK_ACCOUNTS ||--o{ INVOICES : "payment destination"
    SIGNATORIES ||--o{ QUOTATIONS : "authorized signature"
    SIGNATORIES ||--o{ INVOICES : "authorized signature"

    PRICING_PARAMETERS ||--o{ PRICE_HISTORY : "formula basis"

    ITEMS {
        uuid id PK
        varchar name "Nama komoditas (Bawang Merah Goreng)"
        varchar unit "Default kg"
        varchar hs_code "Kode HS ekspor"
        boolean is_active
    }

    ITEM_GRADES {
        uuid id PK
        uuid item_id FK
        varchar grade_code "Grade A / Super / FAQ"
        text grade_description
        boolean is_active
    }

    SUPPLIERS {
        uuid id PK
        varchar name "Mas Parmin / CV Daun Mas Hub Bogor"
        varchar contact_name
        varchar phone
        varchar region "Bogor / Brebes"
        boolean is_active
    }

    BUYERS {
        uuid id PK
        varchar company_name "Nama Perusahaan / HORECA / Resto"
        varchar contact_name "PIC Dapur / Procurement"
        varchar phone "Nomor WhatsApp"
        varchar currency "Default IDR"
        varchar buyer_tier "tier_1 / tier_2 / tier_3 / tier_4"
        varchar pipeline_stage "lead -> quotation_sent -> active_customer"
        varchar source "Direct / Competitor / Industry Peer"
        boolean is_active
    }

    QUOTATIONS {
        uuid id PK
        string quo_number "Format: QUO/YYYY/MM/XXXX"
        uuid buyer_id FK
        date date
        date valid_until
        varchar currency "Default IDR"
        decimal total_amount "Total Rupiah"
        varchar status "draft / sent / accepted / rejected / expired"
        boolean is_test "Flag pemisahan data uji"
    }

    INVOICES {
        uuid id PK
        string inv_number "Format: INV/YYYY/MM/XXXX"
        uuid quotation_id FK
        uuid buyer_id FK
        date issue_date
        date due_date
        varchar currency "Default IDR"
        decimal total_amount "Total Tagihan IDR"
        decimal amount_paid "Pelunasan CBD"
        decimal amount_due "Sisa Tagihan"
        varchar status "draft / sent / partial / paid / overdue"
        boolean is_test "Flag pemisahan data uji"
    }

    PURCHASE_ORDERS {
        uuid id PK
        string po_number "Format: PO/YYYY/MM/XXXX"
        uuid supplier_id FK
        uuid quotation_id FK
        date order_date
        decimal total_amount "Modal HPP Supplier IDR"
        varchar status "draft / sent / confirmed / received / cancelled"
        boolean is_test "Flag pemisahan data uji"
    }

    SUPPLIER_SETTLEMENTS {
        uuid id PK
        string settlement_number "Format: STL/YYYY/MM/XXXX"
        uuid quotation_id FK
        uuid invoice_id FK
        uuid supplier_id FK
        uuid buyer_id FK
        decimal volume_kg
        decimal selling_price_per_kg
        decimal supplier_hpp_per_kg "Modal HPP Mas Parmin"
        decimal packaging_cost "Karton & Inner PE"
        decimal delivery_cost "Ongkir Blind Shipping"
        decimal gross_profit "Laba Kotor Bersih Haturan"
        decimal net_supplier_payout "Dana Cair ke Rekening Supplier"
        varchar status "pending / approved / in_progress / paid / reconciled"
        boolean is_test "Flag pemisahan data uji"
    }

    PRICING_PARAMETERS {
        uuid id PK
        varchar commodity_code "bawang_goreng_brebes"
        decimal shrinkage_ratio "Rasio susut basah: 3.80"
        decimal processing_cost_per_kg "Biaya olah Mas Parmin: Rp 11.000"
        decimal floor_margin_per_kg "Margin terendah: Rp 15.000"
        decimal raw_farmgate_price_per_kg "Harga bahan basah Brebes"
        boolean is_active
    }

    SHOPEE_PRICE_SCRAPES {
        uuid id PK
        varchar keyword "bawang goreng brebes"
        text item_title
        varchar shop_name
        varchar shop_location
        decimal price "Harga listing IDR"
        decimal rating
        integer historical_sold
        text item_url
        boolean is_pure "Analisis tanpa tepung vs oplosan"
        timestamptz crawled_at
    }
```

---

## 2. Kamus Master Data & Aturan Relasi

### A. Komoditas & Kualitas (`items`, `item_grades`)
- Komoditas utama: **Bawang Merah Goreng Brebes (Daun Mas Hub Bogor)**.
- `item_grades`:
  - `Grade A`: Super Murni Brebes (0% Tepung Tapioka, Kadar Air < 3%, Minyak Nabati Kelapa).
  - `Grade B / Katering`: Renyah Gurih (Campuran Tepung Tipis < 5%).
  - `Curah Industri`: Kemasan Zak 25 kg untuk pabrik seasoning.

### B. Mitra & Pelanggan (`buyers`, `suppliers`)
- **Suppliers**: Fasilitas pemenuhan maklon (*Fulfillment Hub*), dipimpin oleh Mas Parmin (CV Daun Mas Bogor). Bertanggung jawab atas pengolahan, pengeringan, sortasi, dan pengemasan.
- **Buyers**: Pelanggan B2B (HORECA, Katering, Resto Jaringan).
- **Competitor Quarantine**: Catatan yang memiliki `source = 'Competitor / Industry Peer'` dikarantina dari cold outreach HORECA agar tidak membocorkan struktur harga penawaran.

### C. Alur Dokumen Komersial & Keuangan
$$\text{Quotation (SPH)} \longrightarrow \text{Invoice (Tagihan CBD)} \longrightarrow \text{Purchase Order (Mas Parmin)} \longrightarrow \text{Surat Jalan (Blind Shipping)} \longrightarrow \text{Supplier Settlement}$$

1. **Quotation**: Penawaran harga resmi dengan masa berlaku 7-14 hari.
2. **Invoice**: Faktur penagihan CBD (*Cash Before Delivery*) lengkap dengan rekening BCA / Mandiri PT Haturan Spice Indonesia.
3. **Purchase Order**: Perintah produksi dan pengemasan bal 5 kg & master carton 20 kg ke Mas Parmin dengan harga modal HPP terkunci.
4. **Surat Jalan & BAST**: Dokumen serah terima barang tanpa mencantumkan identitas supplier (protokol blind shipping).
5. **Supplier Settlement**: Pencatatan arus kas bagi hasil dan pencairan modal supplier setelah pembeli melunasi pembayaran CBD.

### D. Parameter Dinamis Anti-Hardcode (`pricing_parameters`)
Semua variabel matematika perhitungan harga bahan basah dan HPP disimpan di database:
- `shrinkage_ratio`: Rasio susut susut basah ke matang (default: **3.8**).
- `processing_cost_per_kg`: Biaya olah, bumbu, minyak, tenaga kerja, spinner (default: **Rp 11.000**).
- `floor_margin_per_kg`: Batas laba kotor minimum aman sebelum peringatan boncos (default: **Rp 15.000**).

### E. Standar Mata Uang & Pemisahan Lingkungan
1. **Mata Uang**: Seluruh transaksi wajib dalam **IDR (Rupiah / Rp)**.
2. **Flag Data Uji (`is_test`)**:
   - Nilai `false`: Data transaksi riil produksi (masuk ke laporan keuangan dan omset).
   - Nilai `true`: Data uji/simulasi (ditandai dengan badge khusus dan dikeluarkan dari pembukuan riil).
