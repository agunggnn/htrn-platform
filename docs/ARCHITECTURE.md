# Arsitektur Lengkap Sistem: HTRN Platform
**PT Haturan Spice Indonesia — Asset-Light B2B Agritech Trading & Omnichannel Agentic Architecture**

Dokumen ini mendokumentasikan arsitektur komprehensif, model bisnis maklon dropship, alur kognitif JEV System 1 & 2, integrasi omnichannel Chatwoot WhatsApp, proteksi margin, 4-Layer B2B KYC, dan skema database relasional (ERD).

---

## 1. Executive Summary & Model Bisnis

**PT Haturan Spice Indonesia** (`haturan.com`) beroperasi dengan model **Asset-Light B2B Commodity Trading**:
- **Zero Capex Pergudangan**: Perusahaan tidak menanggung biaya sewa gudang fisik, mesin pengering komersial, maupun armada truk pengiriman.
- **Fulfillment Hub Mas Parmin (CV Daun Mas, Bogor)**: Seluruh pemrosesan, sortasi bawang Brebes super murni tanpa tepung, de-oiling sentrifugal, dan pengemasan dialihdayakan 100% (*fully outsourced*).
- **Protokol Blind Shipping**:
  1. Armada Mas Parmin mengantarkan barang langsung ke pintu gudang/dapur pembeli (Jabodetabek).
  2. Pengiriman selalu dilengkapi **Surat Jalan & BAST resmi ber-kop surat PT Haturan Spice Indonesia** (ditandatangani Direktur Utama Pak Agung Gunawan).
  3. Kemasan bal (5 kg) dan master box (20 kg) beridentitas netral/Haturan, mencegah terjadinya disintermediasi (*buyer bypass*).

---

## 2. Diagram Arsitektur Tingkat Tinggi (High-Level Architecture)

```mermaid
flowchart TD
    subgraph OmnichannelInbound["Omnichannel Inbound Channels"]
        WA["WhatsApp Buyer (Chat)"] -->|"Meta Cloud API (1.000 free convs)"| CW["Chatwoot Cloud (Free Tier)"]
        WEBWA["WhatsApp Web (web.whatsapp.com)"] -->|"Auto-Sync DOM Observer"| EXT["HTRN Chrome Extension v1.0.2"]
        GMAIL["Gmail Thread"] -->|"Extract Sender & Body"| EXT
        MCP_CLIENT["Hermes Agent / Antigravity / Cursor"] -->|"JSON-RPC 2.0"| MCP_API["/api/mcp & scripts/mcp-server.ts"]
    end

    subgraph CoreBackend["HTRN Platform Serverless Core (Next.js 16 Turbopack)"]
        CW -->|"Webhook: message_created"| WH_ROUTE["/api/crm/chatwoot/webhook"]
        EXT -->|"POST /api/crm/interaction"| INT_ROUTE["/api/crm/interaction"]
        EXT -->|"POST /api/crm/ai-assist"| AI_ROUTE["/api/crm/ai-assist"]
        
        WH_ROUTE --> JEV["Unified JEV System 1 Engine\n(lib/jev-engine.ts, < 30ms)"]
        AI_ROUTE --> JEV
        MCP_API --> JEV
        
        WH_ROUTE -.->|"Async Fire-and-Forget"| GTC_WORKER["Background Getcontact KYC Worker\n(lib/getcontact.ts, AES-256-ECB)"]
    end

    subgraph DecisionAndGating["JEV Decision & Safety Guardrails"]
        JEV --> C_INTENT{"Klasifikasi Intensi"}
        C_INTENT -->|"FAQ Mutu / Halal"| S_FAQ["Auto-Reply TDS & Surat Halal Resmi"]
        C_INTENT -->|"Minta Sampel 250g"| S_SMP["Auto-Reply Jadwal Kirim Dapur"]
        C_INTENT -->|"Tawar < Rp 140k"| S_TRIP["Hard Tripwire: Reject Below Floor\nEdukasi Cost-Per-Serving Murni"]
        C_INTENT -->|"Pricelist"| S_TIER["Matriks Harga Tier 1-4 Franco"]
        C_INTENT -->|"PO / Order ≥ 500kg"| S_ESC["Escalate: Private Note to Chatwoot\nNotifikasi Approval Direktur"]
        C_INTENT -->|"Minta Tempo/Kredit"| C_KYC{"Status B2B KYC?"}
        C_KYC -->|"Unverified / Risk High"| S_CBD["Kunci Syarat CBD / DP 50%"]
        C_KYC -->|"Verified"| S_CRED["Buka Termin Sesuai Plafon Kredit"]
    end

    subgraph DataPersistence["Database & Storage (Supabase Postgres)"]
        WH_ROUTE --> DB_CONV["chatwoot_conversations"]
        WH_ROUTE --> DB_MSG["chatwoot_messages"]
        WH_ROUTE --> DB_AUDIT["mcp_audit_logs"]
        GTC_WORKER --> DB_BUYER["buyers (notes, KYC tags, risk score)"]
        DB_BUYER <--> DB_DOCS["quotations, invoices, packing_lists, stock_movements"]
    end

    subgraph FulfillmentOutbound["Fulfillment & Document Generator"]
        DB_DOCS --> PDF_SJ["Surat Jalan & BAST PDF (/api/pdf/surat-jalan/[id])"]
        DB_DOCS --> PDF_TDS["TDS Spec Sheet PDF (/api/pdf/spec-sheet/bawang-goreng)"]
        DB_DOCS --> PDF_HALAL["Jaminan Halal PDF (/api/pdf/halal-declaration/bawang-goreng)"]
        DB_DOCS --> SPK_WA["Generator Teks SPK Mas Parmin (Bogor)"]
    end
```

---

## 3. Dual-Tier Cognitive Decision Architecture (JEV Paradigm)

Mengadopsi paradigma kecerdasan buatan **Jev (TypeSafe AI / Diogo Almeida)**:

### A. System 1: Fast Non-Autoregressive Decision Engine (`lib/jev-engine.ts`)
- **Latensi**: **< 30 ms**
- **Biaya**: **$0 / Rp 0** (tanpa pembakaran token LLM untuk pertanyaan berulang)
- **Zero-Hallucination**: Beroperasi deterministik menggunakan skema probabilitas terkalibrasi dan pencocokan teks presisi.
- **7 Intensi Terkalibrasi**:
  1. `SAMPLE_REQUEST`: Menangani permohonan sampel tester 250g bebas biaya untuk kitchen trial katering/resto.
  2. `FAQ_MUTU_CERT`: Mengirimkan fakta spesifikasi kadar air $\le 3\%$, minyak $\le 15\%$, tanpa tepung, dan tautan dokumen resmi.
  3. `PRICE_INQUIRY`: Menyajikan Matriks Harga Tier Volume resmi Haturan.
  4. `NEGOTIATION`: Menghitung batas diskon volume.
  5. `PO_CONFIRMATION`: Eskalasi pesanan resmi ke Direktur Utama.
  6. `PAYMENT_TERMS_INQUIRY`: Gatekeeper termin kredit (Net 7 / Net 14 / Net 30).
  7. `HIGH_RISK_SPAM`: Proteksi nomor spam dan nomor berisiko tinggi.

### B. System 2: Generative Frontier Synthesis & Human-in-the-Loop
- Hanya dipanggil ketika System 1 mendeteksi kasus kompleks:
  - Negosiasi kontrak pasokan $\ge 500$ kg / multi-ton.
  - Perjanjian harga penguncian jangka panjang (*3-month price-lock contract*).
  - Persetujuan plafon kredit tempo perusahaan.
- Dieksekusi melalui **Chatwoot Mobile App**, **Private Internal Note**, atau via perintah MCP oleh AI Assistant (Hermes / Antigravity).

---

## 4. Struktur Finansial & Batas Pengaman (Pricing & Safety Guardrails)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        HTRN PRICING HIERARCHY                          │
├────────────────────────────────────────────────────────────────────────┤
│  📦 Tier 1 (100 – 499 kg)       : Rp 165.000 / kg  (Gross Margin: 40k) │
│  📦 Tier 2 (500 – 999 kg)       : Rp 155.000 / kg  (Gross Margin: 30k) │
│  📦 Tier 3 (1.000 – 2.000 kg)   : Rp 149.000 / kg  (Gross Margin: 24k) │
│  📦 Tier 4 (> 2.000 kg Kontrak) : Rp 144.000 / kg  (Gross Margin: 19k) │
├────────────────────────────────────────────────────────────────────────┤
│  🛡️ BATAS BAWAH NEGOSIASI (FLOOR) : Rp 140.000 / kg (Safety Tripwire)   │
├────────────────────────────────────────────────────────────────────────┤
│  🚚 Estimasi Ongkir & Box       : ~Rp 7.000 - Rp 8.000 / kg            │
│  🏭 HPP Modal Mas Parmin (Bogor): Rp 125.000 / kg                      │
│  🌱 Bahan Mentah Petani Brebes  : Rp 30.000 / kg (Rasio Susut 3.8x)    │
└────────────────────────────────────────────────────────────────────────┘
```

- **Istilah Resmi**:
  - **Matriks Harga Tier Volume** (`Volume Pricing Matrix`): Harga resmi yang tertera di menu buyer dan penawaran.
  - **Batas Bawah Negosiasi** (`Floor Price / Hard Floor Margin`): Batas harga absolut **Rp 140.000/kg**. Jika buyer menawar di bawah angka ini, JEV System 1 secara otomatis menolak dan membandingkan *Cost-Per-Serving* melawan bawang bertepung 15–20% pasaran.

---

## 5. 4-Layer Enterprise B2B KYC Architecture

```
Layer 1: Identity & Social Graph (Open-Source Getcontact Engine)
 ├── Reverse-engineered AES-256-ECB client (xdreizein666/getcontact-cli)
 ├── Background enrichment otomatis saat pesan WhatsApp masuk
 ├── Ekstraksi tags direktori telepon, nama pemanggil, dan spam count
 └── Fallback B2B Heuristic OSINT (Operator GSM & filter PSTN)

Layer 2: Corporate & Physical Reality Verification
 ├── Validasi NIB (Nomor Induk Berusaha 13 digit OSS Kemenkumham)
 ├── Validasi NPWP (16 digit Coretax DJP)
 └── Geocoding Google Maps alamat dapur pusat / gudang penerima

Layer 3: Dynamic Credit Governance & Risk-Based Terms
 ├── Pembeli Baru / Belum KYC : Wajib Cash Before Delivery (CBD) / DP 50%
 ├── 3x Order Lunas            : Terbuka Plafon Kredit Net 7 (Maks Rp 15 Juta)
 └── Kontrak Korporat Teruji   : Plafon Net 14 / Net 30 (Wajib Jaminan Giro)

Layer 4: JEV Real-Time Gatekeeper
 └── Otomatis memblokir permohonan tempo di WhatsApp jika KYC unverified
```

---

## 6. Entity Relationship Diagram (ERD Supabase Postgres)

```mermaid
erDiagram
    BUYERS ||--o{ CHATWOOT_CONVERSATIONS : "has"
    BUYERS ||--o{ QUOTATIONS : "requests"
    BUYERS ||--o{ INVOICES : "billed_to"
    BUYERS ||--o{ ACTIVITY_LOG : "triggers"
    
    CHATWOOT_CONVERSATIONS ||--o{ CHATWOOT_MESSAGES : "contains"
    CHATWOOT_CONVERSATIONS ||--o{ MCP_AUDIT_LOGS : "audits"
    
    QUOTATIONS ||--o{ INVOICES : "converts_to"
    INVOICES ||--o| PACKING_LISTS : "generates"
    PACKING_LISTS ||--o{ PACKING_LIST_ITEMS : "contains"
    
    ITEMS ||--o{ ITEM_GRADES : "has"
    ITEMS ||--o{ PRICE_HISTORY : "tracks"
    ITEMS ||--o{ STOCK_MOVEMENTS : "records"
    SUPPLIERS ||--o{ PRICE_HISTORY : "supplies"
    SUPPLIERS ||--o{ PURCHASE_ORDERS : "receives"

    BUYERS {
        uuid id PK
        string company_name
        string contact_name
        string phone
        string email
        string buyer_tier "tier_1 to tier_4"
        string pipeline_stage
        boolean kyc_verified
        string payment_terms "CBD, Net 7, Net 14"
        string tax_id "NPWP 16 digit"
        text notes "Enriched KYC & GTC tags"
        timestamp created_at
    }

    CHATWOOT_CONVERSATIONS {
        uuid id PK
        uuid buyer_id FK
        bigint chatwoot_conversation_id UK
        string contact_phone
        string contact_name
        string channel "whatsapp"
        string status "open, pending, resolved"
        string agent_mode "auto_pilot, human_in_loop, paused"
        text last_buyer_message
        timestamp last_message_at
        float ai_confidence_score
        timestamp created_at
    }

    CHATWOOT_MESSAGES {
        uuid id PK
        uuid conversation_id FK
        bigint chatwoot_message_id
        string sender_type "buyer, ai_agent, human_user"
        string sender_name
        text content
        string message_type "incoming, outgoing"
        text ai_suggested_reply
        text ai_reasoning
        jsonb mcp_tool_calls
        timestamp created_at
    }

    MCP_AUDIT_LOGS {
        uuid id PK
        uuid conversation_id FK
        string tool_name
        jsonb tool_args
        jsonb tool_result
        string status "success, failure"
        text execution_note
        timestamp created_at
    }

    QUOTATIONS {
        uuid id PK
        uuid buyer_id FK
        string quotation_number UK
        date issue_date
        date expiry_date
        decimal total_amount
        string status "draft, sent, accepted, rejected"
        text notes
    }

    INVOICES {
        uuid id PK
        uuid quotation_id FK
        uuid buyer_id FK
        string invoice_number UK
        date issue_date
        date due_date
        decimal total_amount
        string status "unpaid, partial, paid, overdue"
    }

    PACKING_LISTS {
        uuid id PK
        uuid invoice_id FK
        string packing_list_number UK
        date packing_date
        decimal total_net_weight
        decimal total_gross_weight
        integer total_packages
    }

    STOCK_MOVEMENTS {
        uuid id PK
        uuid item_id FK
        string movement_type "in, out, adjustment"
        decimal quantity
        string unit "kg"
        text notes
        timestamp created_at
    }
```

---

## 7. Model Context Protocol (MCP) Manifest

Endpoint: `/api/mcp` (HTTP JSON-RPC 2.0) & `scripts/mcp-server.ts` (Stdio):

| MCP Tool Name | Parameter Input | Deskripsi & Fungsi |
|---|---|---|
| `htrn_jev_evaluate` | `text`, `buyer_id?`, `channel?` | Menjalankan evaluasi System 1 JEV (< 30ms): intensi, urgensi, batas harga bawah, dan draf balasan resmi. |
| `htrn_getcontact_lookup` | `phone`, `buyer_id?`, `company_name?` | Mengambil data tag Getcontact, jumlah spam, dan memperbarui skor KYC nomor buyer. |
| `htrn_chatwoot_get_conversations` | `status?`, `agent_mode?`, `limit?` | Mengambil daftar percakapan aktif dari Chatwoot / Supabase. |
| `htrn_chatwoot_reply_whatsapp` | `conversation_id`, `message`, `message_type` | Mengirim pesan balasan WhatsApp ke buyer atau internal note untuk Pak Agung. |
| `htrn_chatwoot_set_agent_mode` | `conversation_id`, `agent_mode` | Mengubah mode agen (`auto_pilot` / `human_in_loop` / `paused`). |
| `htrn_search_buyers` | `query`, `stage?`, `limit?` | Pencarian buyer di CRM berdasarkan nama, PIC, nomor HP, atau stage. |
| `htrn_get_buyer_profile` | `buyer_id` | Menampilkan profil lengkap buyer, status KYC, plafon kredit, dan riwayat transaksi. |
| `htrn_update_buyer_stage` | `buyer_id`, `stage`, `notes?` | Memperbarui tahap pipeline CRM buyer. |
| `htrn_verify_buyer_kyc` | `buyer_id`, `status`, `credit_limit?`, `allowed_terms?` | Memperbarui verifikasi legalitas B2B KYC (NIB & NPWP). |
| `htrn_get_pricing_intelligence` | `item_code?` | Menyajikan benchmark harga mentah petani Brebes, rasio susut, HPP modal, dan tiering. |
| `htrn_analyze_competitor_quote` | `competitor_price_per_kg`, `competitor_claim?` | Menganalisis kalkulasi rasio tepung kompetitor vs kehematan *Cost-Per-Serving* Haturan. |
| `htrn_get_sales_script` | `scenario`, `buyer_id?` | Menghasilkan skrip penawaran WhatsApp teruji (Sample, SPH, Cost-Per-Serving, Price-Lock). |
| `htrn_generate_mas_parmin_spk` | `quantity_kg`, `unit_selling_price`, `delivery_address` | Menghasilkan breakdown bal/box dan format teks WhatsApp SPK Mas Parmin Bogor. |
| `htrn_get_surat_jalan_link` | `order_id` | Mengambil tautan cetak PDF resmi Surat Jalan & BAST PT Haturan Spice Indonesia. |

---

## 8. Standar Keamanan & Kepatuhan Legal (Compliance)

1. **Hetzer Credential Safety, Runtime Boundary & Web Settings Vault**:
   - Seluruh token, access key, dan kredensial sensitif dilarang keras ditulis dalam kode atau repositori git (*zero plaintext git leakage*).
   - **Batasan Arsitektur Runtime & Armor**: Hetzer bertindak sebagai CLI armor, stream redactor, dan mapping `secretRef:<id>`. Di dalam proses server Next.js (Node.js runtime), kredensial yang dibutuhkan sistem dibaca ke memori proses melalui hierarki resolusi aman (`lib/secrets-helper.ts`) dan tabel database terenkripsi `app_secrets` (AES-256-GCM) dengan akses RLS terbatas pada `service_role`. Runtime server adalah application-level protected vault di dalam batas proses Node.js.
   - **Antarmuka Settings Integrasi (`/settings/integrations`)**: Pengguna dapat mengonfigurasi token Getcontact, Chatwoot, LLM AI, dan PIN Direktur langsung dari dashboard web tanpa perlu membuka terminal atau mengedit `.env.local`.
   - **Background Enkripsi & Referensi**: Di latar belakang, nilai disimpan ke tabel `app_secrets` dengan enkripsi AES-256-GCM dan otomatis dipetakan ke format `secretRef:<credential-id>`.
   - **Zero Plaintext API Response**: API `/api/settings/integrations` tidak pernah mengembalikan nilai mentah ke browser; data hanya ditampilkan dalam format terselubung (*masked*, misal: `••••••••••••a4f2`) atau penanda `secretRef:<id> (Tersimpan & Terenkripsi)`.
   - **Hierarki Resolusi Runtime (`lib/secrets-helper.ts`)**: `process.env` $\rightarrow$ In-Memory Cache $\rightarrow$ Enkripsi Database Vault (`app_secrets`).
2. **Kerahasiaan Vendor (Strict Privacy)**:
   - Nama Mas Parmin dan CV Daun Mas diproteksi ketat dan hanya tampil di internal founder dashboard. Dokumen publik mencantumkan fasilitas sebagai *"Fasilitas Pengolahan & Sentra Sortasi Mitra Haturan (Bogor, Jawa Barat)"*.
3. **Kepatuhan Non-Overclaim**:
   - Seluruh dokumen teknis (TDS) ditegaskan sebagai *Target Specification* industri B2B.
   - Jaminan Kehalalan merujuk pada kepatuhan SJPH fasilitas mitra dan bahan nabati bersertifikasi Halal & BPOM.

