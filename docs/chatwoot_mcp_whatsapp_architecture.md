# Arsitektur Sistem: Chatwoot + Meta WhatsApp Cloud API + HTRN Agentic MCP
**Solusi 100% Serverless, Free-Tier Cloudflare/Next.js, & Asset-Light B2B Operations**

---

## 🎯 Visi & Kebutuhan Pak Agung Gunawan
1. **Otonom Saat Jauh dari Laptop (Always-On Agentic AI)**:
   - Ketika Pak Agung sedang bepergian atau tidak di depan monitor, AI Agent berbasis **MCP (Model Context Protocol)** secara otonom menyambut buyer, menjawab pertanyaan spesifikasi/TDS, mengecek harga pasar terkini, dan menyusun draf penawaran (*Quotation/SPH*).
2. **0 Biaya Server & 0 Maintenance Docker (Tanpa WAHA)**:
   - Tidak perlu menyewa VPS Linux khusus untuk menjalankan kontainer WAHA.
   - Menggunakan integrasi resmi **Meta WhatsApp Business Cloud API** yang disambungkan langsung ke **Chatwoot** (memanfaatkan jatah 1.000 percakapan gratis per bulan dari Meta).
3. **Kendali Penuh dari HP (Mobile First via Chatwoot Mobile App)**:
   - Pak Agung dapat memantau percakapan buyer secara real-time dari aplikasi HP Chatwoot (Android/iOS), menerima notifikasi instan, serta mengambil alih chat kapan saja (*Human-in-the-Loop*).

---

## 🏗️ Diagram Arsitektur Komprehensif

```mermaid
flowchart TB
    subgraph Buyer_Side["📱 Sisi Buyer / Pelanggan B2B"]
        WA_Buyer["WhatsApp Messenger Buyer\n(Katering / Restoran / Pabrik)"]
    end

    subgraph Meta_Cloud["☁️ Meta WhatsApp Infrastructure"]
        Meta_API["WhatsApp Business Cloud API\n(Official Graph API • 1.000 Free Conv/Bln)"]
    end

    subgraph Chatwoot_Core["💬 Chatwoot Platform (Inbox & Mobile Sync)"]
        CW_Inbox["Chatwoot Shared Inbox\n(Multi-Agent / Mobile App Pak Agung)"]
        CW_Webhook["Outgoing Webhooks\n(message_created, conversation_opened)"]
        CW_DashApp["Dashboard App Sidebar (Iframe)\n(Membuka profil HTRN di dalam Chatwoot)"]
    end

    subgraph HTRN_Cloud["⚡ HTRN Platform (Cloudflare / Next.js Serverless)"]
        CRM_Webhook["/api/crm/chatwoot/webhook\n(Listener Pesan Masuk)"]
        MCP_Engine["MCP Agentic Core (Hermes / Antigravity)\n• Evaluasi Intent Buyer\n• Guardrail Batas Modal (Floor Rp 140k)\n• Auto-Draft SPH / Sample Dispatch"]
        DB_Supabase[("Supabase PostgreSQL\n• buyers\n• chatwoot_conversations\n• quotations\n• mcp_audit_logs")]
        CRM_Cockpit["HTRN Agentic Cockpit (/crm/whatsapp)\n• Sakelar Auto-Pilot vs Human\n• AI Reasoning Stream & Logs"]
    end

    WA_Buyer <-->|Kirim/Terima Pesan| Meta_API
    Meta_API <-->|Webhook 2-Arah Otomatis| CW_Inbox
    CW_Inbox -->|Notifikasi HP| Pak_Agung["📱 HP Pak Agung (Chatwoot App)"]
    CW_Webhook -->|Event HTTP POST| CRM_Webhook
    CRM_Webhook -->|Kirim Context & History| MCP_Engine
    MCP_Engine <-->|Read/Write Data & SPH| DB_Supabase
    MCP_Engine -->|Kirim Jawaban AI via Chatwoot API| CW_Inbox
    CW_DashApp <-->|Lihat KYC, SPH & Tier di Chatwoot| DB_Supabase
```

---

## 🗄️ Entity Relationship Diagram (ERD)

Struktur relasi tabel di database Supabase untuk mendukung sinkronisasi obrolan, status agen otonom, dan riwayat tindakan MCP:

```mermaid
erDiagram
    BUYERS ||--o{ CHATWOOT_CONVERSATIONS : "memiliki riwayat"
    BUYERS ||--o{ QUOTATIONS : "diterbitkan untuk"
    CHATWOOT_CONVERSATIONS ||--o{ CHATWOOT_MESSAGES : "berisi pesan"
    CHATWOOT_CONVERSATIONS ||--o{ MCP_AUDIT_LOGS : "memicu tindakan"
    QUOTATIONS ||--o{ MCP_AUDIT_LOGS : "dibuat oleh"

    BUYERS {
        uuid id PK
        string company_name
        string contact_name
        string phone
        string email
        string pipeline_stage
        string buyer_tier
        int gacoan_similarity_score
        boolean kyc_verified
        string payment_terms
        text notes
        timestamptz created_at
    }

    CHATWOOT_CONVERSATIONS {
        uuid id PK
        uuid buyer_id FK "nullable jika nomor baru"
        int chatwoot_conversation_id "ID unik di Chatwoot"
        string contact_phone
        string contact_name
        string channel "whatsapp"
        string status "open / pending / resolved"
        string agent_mode "auto_pilot / human_in_loop / paused"
        text last_buyer_message
        timestamptz last_message_at
        float ai_confidence_score
        timestamptz created_at
        timestamptz updated_at
    }

    CHATWOOT_MESSAGES {
        uuid id PK
        uuid conversation_id FK
        int chatwoot_message_id
        string sender_type "buyer / ai_agent / human_user"
        string sender_name
        text content
        string message_type "incoming / outgoing"
        text ai_suggested_reply
        text ai_reasoning
        jsonb mcp_tool_calls
        timestamptz created_at
    }

    QUOTATIONS {
        uuid id PK
        uuid buyer_id FK
        string quo_number
        numeric total_amount
        string status "draft / sent / accepted"
        timestamptz valid_until
        timestamptz created_at
    }

    MCP_AUDIT_LOGS {
        uuid id PK
        uuid conversation_id FK
        string tool_name "htrn_commodity_mentor / htrn_create_quotation / etc"
        jsonb tool_args
        jsonb tool_result
        string status "success / failure"
        text execution_note
        timestamptz created_at
    }
```

---

## 🤖 Logika & Alur Kerja Agentic MCP (Otonom saat Pak Agung AFK)

Ketika sebuah pesan WhatsApp masuk dari buyer:

### 1. Tingkat 1 (System 1 - FAQ, Mutu, & Dokumen Legalitas)
- **Buyer Tanya**: *"Bawang gorengnya murni tanpa tepung tidak ya? Boleh minta sertifikat halal dan TDS speknya?"*
- **Aksi Agen MCP**:
  - Mengambil dokumen resmi via tool `htrn_get_document_link` (TDS Spek Bawang Goreng & Surat Pernyataan SJPH Halal Haturan).
  - Mengirim jawaban ramah, edukasi mutu susut $3.8\times$, dan tautan PDF langsung ke WhatsApp buyer.
  - Memperbarui status buyer di CRM menjadi `target_outreach` $\rightarrow$ `verified_active`.

### 2. Tingkat 2 (System 2 - Negosiasi Harga & Penawaran SPH)
- **Buyer Tanya**: *"Kami butuh 300 kg per bulan untuk katering di Bekasi. Bisa dapat harga berapa per kg?"*
- **Aksi Agen MCP**:
  1. Memanggil tool `htrn_commodity_mentor` untuk memeriksa harga pasar Bapanas & Kramat Jati hari ini.
  2. Mengecek batasan modal (*Floor Price Enforcement*): Tidak boleh menjual di bawah Rp 140.000/kg.
  3. Mengklasifikasikan buyer ke **Tier 2 (Volume 100–499 kg $\rightarrow$ Rp 155.000/kg Franco Jabodetabek)** dengan termin CBD / DP 50%.
  4. Memanggil tool `htrn_create_quotation` untuk meng-generate nomor SPH resmi di database.
  5. **Evaluasi Sakelar Mode**:
     - Jika mode **`auto_pilot`**: Agen langsung mengirimkan ringkasan SPH dan penawaran sampel tester 250g ke buyer.
     - Jika mode **`human_in_loop`**: Agen membuat draf balasan di Chatwoot dan mengirimkan notifikasi *Push Notification* ke HP Pak Agung: *"Buyer minta harga 300kg, rekomendasi harga Rp 155.000/kg sudah siap. Klik Setujui."*

---

## 🎨 Desain UI/UX (Dua Antarmuka Terpadu)

### Antarmuka 1: Chatwoot Dashboard App (Sidebar Data HTRN di dalam Chatwoot)
*Tampil di sisi kanan layar saat Pak Agung atau staf membuka obrolan di Chatwoot Web/Mobile:*

```
┌───────────────────────────────────────┬────────────────────────────────────────┐
│  💬 CHAT AREA (WhatsApp Web)          │  🛡️ HTRN B2B COCKPIT (Embedded App)    │
├───────────────────────────────────────┼────────────────────────────────────────┤
│ Buyer: Halo, minta info harga untuk   │ PT Berkah Katering Nusantara           │
│ katering 200 kg/bln ya.               │ PIC: Pak Bambang (Bekasi)              │
│                                       ├────────────────────────────────────────┤
│ [11:42]                               │ 🛡️ B2B KYC: [🔒 Terkunci CBD]          │
│                                       │ 📊 Tier: [Tier 2] • 🎯 Fit: 75%        │
│ 🤖 HTRN AI Agent:                     ├────────────────────────────────────────┤
│ Halo Pak Bambang! Untuk kebutuhan     │ Mode Agen:                             │
│ katering 200 kg/bulan, Haturan        │ (●) 🤖 Auto-Pilot  ( ) 👤 Manual       │
│ menyediakan Grade Brebes Super Murni  ├────────────────────────────────────────┤
│ dengan harga volume Rp 155.000/kg...  │ Tindakan Cepat (1-Klik):               │
│                                       │ [📄 Buat SPH Rp 155k]                  │
│                                       │ [🎁 Kirim Sampel 250g]                 │
│                                       │ [📦 Siapkan SPK Mas Parmin]            │
└───────────────────────────────────────┴────────────────────────────────────────┘
```

### Antarmuka 2: HTRN Platform Agentic WhatsApp Console (`/buyers` atau `/crm/whatsapp`)
*Tampil di dalam dashboard utama HTRN Platform:*

1. **Header Cockpit**:
   - Status Koneksi: `🟢 WhatsApp Cloud API Active (Meta Official)`
   - Kuota Percakapan Gratis: `142 / 1.000 digunakan bulan ini`
   - Sakelar Master AI: `[ Aktifkan Auto-Pilot Seluruh Kontak ]`
2. **Feed Obrolan Interaktif**:
   - Menampilkan percakapan terbaru dengan label status verifikasi (`✓ WA Aktif`, `✕ Bukan WA`).
   - Tombol pengambilalihan obrolan (*Take Over Chat*) dalam satu klik.
3. **AI Reasoning Drawer (Kotak Pikir Agen)**:
   - Menampilkan catatan transparan mengapa agen memilih harga tertentu, data pasar apa yang dianalisis, dan tool MCP apa yang dipanggil.
