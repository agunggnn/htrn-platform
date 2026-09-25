#!/usr/bin/env node
/**
 * HTRN-Platform Model Context Protocol (MCP) Server
 * Exposes full autonomous B2B agritech sales CRM tools, contact verification,
 * price matrices, TDS spec sheets, and pipeline automation to Hermes Agent, Claude, Cursor, Antigravity.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration in environment.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.haturan.com'

function verifyPhoneNumber(phone?: string | null) {
  if (!phone || !phone.trim()) {
    return { isValid: false, isWhatsAppCapable: false, type: 'missing', formattedPhone: null, message: 'Nomor telepon belum diisi' }
  }
  const digits = phone.replace(/\D/g, '')
  let standardDigits = digits
  if (standardDigits.startsWith('62')) standardDigits = '0' + standardDigits.slice(2)

  const landlinePrefixes = ['021', '022', '024', '031', '0251', '0267', '0274', '0341', '0361', '061', '0711']
  if (landlinePrefixes.some((p) => standardDigits.startsWith(p)) && !standardDigits.startsWith('08')) {
    return { isValid: true, isWhatsAppCapable: false, type: 'landline', formattedPhone: digits, message: 'Telepon Kantor (PSTN) - Bukan nomor seluler WhatsApp' }
  }

  let cleanMobile = digits
  if (cleanMobile.startsWith('0')) cleanMobile = '62' + cleanMobile.slice(1)
  if (cleanMobile.startsWith('628') && cleanMobile.length >= 11 && cleanMobile.length <= 14) {
    return { isValid: true, isWhatsAppCapable: true, type: 'mobile', formattedPhone: cleanMobile, message: 'Nomor WhatsApp Seluler Valid' }
  }

  return { isValid: digits.length >= 9 && digits.length <= 15, isWhatsAppCapable: digits.length >= 9, type: 'other', formattedPhone: cleanMobile, message: 'Nomor terdeteksi' }
}

function encodeBuyerNotes(notes?: string | null, stage?: string | null, tier?: string | null, score?: number | null) {
  const clean = (notes || '').replace(/\[Stage:\s*[^\]]+\]/gi, '').replace(/\[Tier:\s*[^\]]+\]/gi, '').replace(/\[Fit:\s*[^\]]+\]/gi, '').trim()
  const tags = []
  if (stage) tags.push(`[Stage: ${stage}]`)
  if (tier) tags.push(`[Tier: ${tier}]`)
  if (score) tags.push(`[Fit: ${score}%]`)
  return tags.length > 0 ? `${tags.join(' ')} ${clean}`.trim() : clean
}

function encodeWhatsAppStatus(notes?: string | null, status?: string | null, date?: string | null) {
  const clean = (notes || '').replace(/\[WA:\s*[^\]]+\]/gi, '').trim()
  if (!status || status === 'uncontacted') return clean
  const d = date || new Date().toISOString().split('T')[0]
  return `[WA: ${status} ${d}] ${clean}`.trim()
}

// Initialize MCP Server
const server = new McpServer({
  name: 'htrn-b2b-sales-mcp',
  version: '1.1.0',
})

// 1. Tool: Search Buyers
server.tool(
  'htrn_search_buyers',
  'Search buyers directory by company name, contact, email, region, or pipeline stage',
  {
    query: z.string().optional().describe('Search query for company name, contact, or email'),
    pipeline_stage: z.string().optional().describe('Filter by pipeline stage (lead, target_outreach, sample_sent, quotation_sent, negotiation, active_customer, closed_lost)'),
    tier: z.enum(['tier_1', 'tier_2', 'tier_3', 'tier_4']).optional().describe('Filter by buyer volume tier'),
    limit: z.number().default(10).describe('Max results to return'),
  },
  async ({ query, pipeline_stage, tier, limit }) => {
    let q = supabase.from('buyers').select('*').eq('is_active', true).limit(limit)
    if (query) {
      q = q.or(`company_name.ilike.%${query}%,contact_name.ilike.%${query}%,email.ilike.%${query}%`)
    }
    const { data, error } = await q
    if (error) {
      return { content: [{ type: 'text', text: `Error searching buyers: ${error.message}` }] }
    }

    let buyers = data || []
    if (pipeline_stage) {
      buyers = buyers.filter((b) => (b.notes || '').includes(`[Stage: ${pipeline_stage}]`) || b.pipeline_stage === pipeline_stage)
    }
    if (tier) {
      buyers = buyers.filter((b) => (b.notes || '').includes(`[Tier: ${tier}]`) || b.buyer_tier === tier)
    }

    const formatted = buyers.map((b) => ({
      id: b.id,
      company_name: b.company_name,
      contact_name: b.contact_name,
      email: b.email,
      phone: b.phone,
      phone_check: verifyPhoneNumber(b.phone),
      region: b.country || 'Indonesia',
      notes: b.notes,
    }))

    return { content: [{ type: 'text', text: JSON.stringify(formatted, null, 2) }] }
  }
)

// 2. Tool: Get Buyer Details
server.tool(
  'htrn_get_buyer_details',
  'Get comprehensive details, KYC status, contact verification, and recent quotation history for a specific buyer',
  {
    buyer_id: z.string().describe('UUID of the buyer in HTRN CRM'),
  },
  async ({ buyer_id }) => {
    const [{ data: buyer, error: buyerErr }, { data: quotations }] = await Promise.all([
      supabase.from('buyers').select('*').eq('id', buyer_id).single(),
      supabase
        .from('quotations')
        .select('id, quo_number, status, total_amount, valid_until, created_at')
        .eq('buyer_id', buyer_id)
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    if (buyerErr || !buyer) {
      return { content: [{ type: 'text', text: `Buyer not found: ${buyerErr?.message}` }] }
    }

    const enriched = {
      ...buyer,
      phone_verification: verifyPhoneNumber(buyer.phone),
      recent_quotations: quotations || [],
    }

    return { content: [{ type: 'text', text: JSON.stringify(enriched, null, 2) }] }
  }
)

// 3. Tool: Create Buyer
server.tool(
  'htrn_create_buyer',
  'Create a new buyer prospect in HTRN CRM with contact verification, tier, and pipeline stage',
  {
    company_name: z.string().describe('Company or restaurant name'),
    contact_name: z.string().optional().describe('Name of PIC / procurement contact'),
    phone: z.string().optional().describe('Phone number or WhatsApp'),
    email: z.string().optional().describe('Email address'),
    country: z.string().default('Indonesia').describe('Region or city'),
    pipeline_stage: z.enum(['lead', 'target_outreach', 'sample_sent', 'quotation_sent', 'negotiation', 'active_customer', 'closed_lost']).default('lead'),
    tier: z.enum(['tier_1', 'tier_2', 'tier_3', 'tier_4']).default('tier_1'),
    payment_terms: z.string().default('CBD').describe('Payment terms'),
    notes: z.string().optional().describe('Initial notes'),
  },
  async ({ company_name, contact_name, phone, email, country, pipeline_stage, tier, payment_terms, notes }) => {
    if (email) {
      const { data: existing } = await supabase.from('buyers').select('id, company_name').ilike('email', email.trim().toLowerCase()).limit(1)
      if (existing && existing.length > 0) {
        return { content: [{ type: 'text', text: `Buyer already exists: ${existing[0].company_name} (ID: ${existing[0].id})` }] }
      }
    }

    const encodedNotes = encodeBuyerNotes(notes || null, pipeline_stage, tier, 60)
    const newRecord = {
      company_name: company_name.trim(),
      contact_name: contact_name ? contact_name.trim() : null,
      email: email ? email.trim().toLowerCase() : null,
      phone: phone ? phone.trim() : null,
      country: country.trim(),
      currency: 'IDR',
      payment_terms,
      source: 'hermes_gateway',
      notes: encodedNotes,
      is_active: true,
    }

    const { data, error } = await supabase.from('buyers').insert([newRecord]).select().single()
    if (error) {
      return { content: [{ type: 'text', text: `Failed to create buyer: ${error.message}` }] }
    }

    return { content: [{ type: 'text', text: `Success: Created buyer "${data.company_name}" (ID: ${data.id}) in stage "${pipeline_stage}".` }] }
  }
)

// 4. Tool: Update Buyer
server.tool(
  'htrn_update_buyer',
  'Update details of an existing buyer prospect (company name, contact, phone, email, terms, stage, tier, notes)',
  {
    buyer_id: z.string().describe('UUID of the buyer to update'),
    company_name: z.string().optional().describe('Updated company name'),
    contact_name: z.string().optional().describe('Updated contact name'),
    phone: z.string().optional().describe('Updated phone'),
    email: z.string().optional().describe('Updated email'),
    country: z.string().optional().describe('Updated region/country'),
    payment_terms: z.string().optional().describe('Updated payment terms'),
    pipeline_stage: z.string().optional().describe('Updated stage'),
    tier: z.string().optional().describe('Updated tier'),
    notes: z.string().optional().describe('Updated notes'),
  },
  async ({ buyer_id, company_name, contact_name, phone, email, country, payment_terms, pipeline_stage, tier, notes }) => {
    const { data: existing, error: fetchErr } = await supabase.from('buyers').select('*').eq('id', buyer_id).single()
    if (fetchErr || !existing) {
      return { content: [{ type: 'text', text: `Buyer not found: ${fetchErr?.message}` }] }
    }

    const currentNotes = notes !== undefined ? notes : existing.notes
    const updatedNotes = encodeBuyerNotes(currentNotes, pipeline_stage || null, tier || null)

    const updatePayload: Record<string, unknown> = { notes: updatedNotes }
    if (company_name !== undefined) updatePayload.company_name = company_name
    if (contact_name !== undefined) updatePayload.contact_name = contact_name
    if (phone !== undefined) updatePayload.phone = phone
    if (email !== undefined) updatePayload.email = email
    if (country !== undefined) updatePayload.country = country
    if (payment_terms !== undefined) updatePayload.payment_terms = payment_terms

    const { data, error } = await supabase.from('buyers').update(updatePayload).eq('id', buyer_id).select().single()
    if (error) {
      return { content: [{ type: 'text', text: `Failed to update buyer: ${error.message}` }] }
    }

    return { content: [{ type: 'text', text: `Success: Updated buyer "${data.company_name}" (ID: ${data.id}).` }] }
  }
)

// 5. Tool: Delete Buyer
server.tool(
  'htrn_delete_buyer',
  'Delete or archive a buyer prospect from HTRN CRM',
  {
    buyer_id: z.string().describe('UUID of the buyer to delete'),
    permanent: z.boolean().default(false).describe('If true, permanent database deletion. Default is false (soft delete).'),
  },
  async ({ buyer_id, permanent }) => {
    if (permanent) {
      const { error } = await supabase.from('buyers').delete().eq('id', buyer_id)
      if (error) return { content: [{ type: 'text', text: `Failed to delete buyer: ${error.message}` }] }
      return { content: [{ type: 'text', text: `Success: Permanently deleted buyer ${buyer_id}.` }] }
    } else {
      const { error } = await supabase.from('buyers').update({ is_active: false }).eq('id', buyer_id)
      if (error) return { content: [{ type: 'text', text: `Failed to archive buyer: ${error.message}` }] }
      return { content: [{ type: 'text', text: `Success: Archived (soft-deleted) buyer ${buyer_id}.` }] }
    }
  }
)

// 6. Tool: Update Pipeline Stage
server.tool(
  'htrn_update_pipeline_stage',
  'Move a buyer through the sales pipeline (e.g. from target_outreach to sample_sent or quotation_sent)',
  {
    buyer_id: z.string().describe('UUID of the buyer'),
    new_stage: z
      .enum(['lead', 'target_outreach', 'sample_sent', 'quotation_sent', 'negotiation', 'active_customer', 'closed_lost'])
      .describe('New pipeline stage'),
    notes: z.string().optional().describe('Log notes for this transition'),
  },
  async ({ buyer_id, new_stage, notes }) => {
    const { data: existing } = await supabase.from('buyers').select('notes, company_name').eq('id', buyer_id).single()
    if (!existing) return { content: [{ type: 'text', text: 'Buyer not found' }] }

    const updatedNotes = encodeBuyerNotes(notes !== undefined ? notes : existing.notes, new_stage)
    const { error } = await supabase.from('buyers').update({ notes: updatedNotes }).eq('id', buyer_id)

    if (error) {
      return { content: [{ type: 'text', text: `Failed to update stage: ${error.message}` }] }
    }

    return { content: [{ type: 'text', text: `Success: ${existing.company_name} stage updated to ${new_stage}.` }] }
  }
)

// 7. Tool: Log Interaction
server.tool(
  'htrn_log_interaction',
  'Log a sales outreach or inbound engagement touchpoint (WhatsApp sent, WhatsApp replied, sample requested, call)',
  {
    buyer_id: z.string().describe('UUID of the buyer'),
    channel: z.enum(['whatsapp', 'email', 'phone_call', 'meeting']).default('whatsapp'),
    status: z.enum(['sent', 'replied', 'sample_requested', 'rejected', 'uncontacted']).describe('Interaction status'),
    summary: z.string().describe('Summary of interaction or buyer response'),
    date: z.string().optional().describe('Date in YYYY-MM-DD format (default: today)'),
  },
  async ({ buyer_id, channel, status, summary, date }) => {
    const { data: buyer, error: fetchErr } = await supabase.from('buyers').select('*').eq('id', buyer_id).single()
    if (fetchErr || !buyer) return { content: [{ type: 'text', text: 'Buyer not found' }] }

    const interactionDate = date || new Date().toISOString().split('T')[0]
    let updatedNotes = encodeWhatsAppStatus(buyer.notes, status, interactionDate)
    if (summary) {
      updatedNotes = `${updatedNotes}\n[Log ${interactionDate} via ${channel.toUpperCase()}]: ${summary}`
    }

    const { error: updateErr } = await supabase.from('buyers').update({ notes: updatedNotes }).eq('id', buyer_id)
    if (updateErr) return { content: [{ type: 'text', text: `Failed to log interaction: ${updateErr.message}` }] }

    return { content: [{ type: 'text', text: `Success: Logged ${channel} interaction (${status}) for "${buyer.company_name}".` }] }
  }
)

// 8. Tool: Verify Contact
server.tool(
  'htrn_verify_contact',
  'Verify an Indonesian phone number (GSM mobile, operator, WhatsApp capability, PSTN landline check) and email syntax',
  {
    phone: z.string().optional().describe('Phone number to verify'),
    email: z.string().optional().describe('Email to verify'),
  },
  async ({ phone, email }) => {
    const phoneRes = verifyPhoneNumber(phone)
    let emailRes = null
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      const valid = emailRegex.test(email.trim())
      emailRes = { email: email.trim(), isValid: valid, domain: valid ? email.trim().split('@')[1] : null }
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              phone_verification: phoneRes,
              email_verification: emailRes,
              whatsapp_direct_url: phoneRes.formattedPhone ? `https://wa.me/${phoneRes.formattedPhone}` : null,
            },
            null,
            2
          ),
        },
      ],
    }
  }
)

// 9. Tool: Price Matrix
server.tool(
  'htrn_get_price_matrix',
  'Get current commercial pricing matrix: Supplier HPP modal (Mas Parmin Bogor), Tiered selling prices, and negotiation floor',
  {
    commodity: z.string().default('Bawang Merah Goreng').describe('Commodity name'),
  },
  async () => {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              commodity: 'Bawang Merah Goreng (Fried Shallots)',
              origin_hub: 'CV Daun Mas / CV Panca Mas (Mas Parmin), Bogor, Jawa Barat',
              currency: 'IDR / kg',
              terms: 'Franco Jabodetabek & Bandung (Incoterms 2020)',
              supplier_buy_cost_hpp: 125000,
              negotiation_floor_price: 140000,
              selling_tiers: {
                tier_1_horeca: { volume_range: '100 - 499 kg / order', price_per_kg: 165000, gross_margin: 40000 },
                tier_2_catering: { volume_range: '500 - 999 kg / order', price_per_kg: 155000, gross_margin: 30000 },
                tier_3_industrial: { volume_range: '1.000 - 2.000 kg / order', price_per_kg: 149000, gross_margin: 24000 },
                tier_4_enterprise: { volume_range: '> 2.000 kg / order (Kontrak Rutin)', price_per_kg: 144000, gross_margin: 19000 },
              },
            },
            null,
            2
          ),
        },
      ],
    }
  }
)

// 10. Tool: Technical Data Sheet (TDS)
server.tool(
  'htrn_get_technical_data_sheet',
  'Get official Technical Data Sheet (TDS) physical-chemical parameters and download link',
  {
    commodity: z.enum(['bawang_goreng']).default('bawang_goreng').describe('Commodity spec identifier'),
  },
  async () => {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              product_name: 'Bawang Merah Goreng Pilihan Mutu Industri',
              hs_code: '2005.99.90',
              variety: 'Brebes Super & Sumenep Asli',
              processing: 'Penggorengan minyak nabati kelapa sawit premium + Sentrifugal De-oiling',
              parameters: {
                water_content: '< 3.0% (Standar SNI & Industri)',
                free_fatty_acid_ffa: '< 0.5% (Tiris minyak optimal, tidak mudah tengik)',
                organoleptic: 'Aroma harum gurih murni alami, warna kuning keemasan, tekstur renyah utuh',
                preservatives: '100% Bebas bahan pengawet sintetis & pewarna kimia',
              },
              packaging: 'Bal 5 kg ganda inner PE dalam karton box 10-20 kg atau karung bulk zak 25 kg',
              official_tds_pdf_url: `${appUrl}/api/pdf/spec-sheet/bawang-goreng`,
            },
            null,
            2
          ),
        },
      ],
    }
  }
)

// 11. Tool: Draft Outreach
server.tool(
  'htrn_draft_outreach',
  'Generate personalized B2B outreach email/WhatsApp draft adhering to HTRN commercial standards',
  {
    buyer_id: z.string().describe('UUID of the target buyer'),
    channel: z.enum(['email', 'whatsapp']).default('whatsapp').describe('Communication channel'),
    custom_offer: z.string().optional().describe('Custom note or emphasis'),
  },
  async ({ buyer_id, channel, custom_offer }) => {
    const { data: buyer } = await supabase.from('buyers').select('*').eq('id', buyer_id).single()
    if (!buyer) return { content: [{ type: 'text', text: 'Buyer not found' }] }

    const company = buyer.company_name
    const pic = buyer.contact_name || 'Bapak/Ibu Tim Pengadaan'
    const tier = buyer.tier || 'tier_1'
    const price = tier === 'tier_2' ? 'Rp 155.000' : 'Rp 165.000'
    const tdsUrl = `${appUrl}/api/pdf/spec-sheet/bawang-goreng`

    let text = ''
    if (channel === 'whatsapp') {
      text = `Halo ${pic}, salam hangat dari PT Haturan Spice Indonesia.\n\nMenindaklanjuti kebutuhan pasokan bahan baku di *${company}*, kami menyediakan Bawang Merah Goreng varietas asli Brebes & Sumenep mutu industri dari pusat sortasi kami di Bogor.\n\n• Renyah keemasan, tiris minyak sentrifugal (kadar air < 3%, FFA < 0.5%)\n• Harga: *${price}/kg* Franco Jabodetabek/Bandung\n• Kemasan bal 5 kg ganda PE food grade\n\nKami siap mengirimkan sampel gratis 250g ke lokasi Bapak/Ibu untuk uji dapur/QC. TDS resmi: ${tdsUrl}\n\nApakah berkenan kami kirimkan paket sampelnya besok?\n- Agung Gunawan, Direktur PT Haturan Spice Indonesia`
    } else {
      text = `Yth. ${pic} (${company}),\n\nMenjawab kebutuhan efisiensi dan kestabilan pasokan bahan baku di ${company}, berikut kami sampaikan penawaran resmi Bawang Merah Goreng mutu industri dari PT Haturan Spice Indonesia:\n\n• Produk: Bawang Merah Goreng (Crispy Flakes)\n• Penawaran: ${price} / kg (Franco)\n• Spesifikasi: Kadar air < 3.0%, low-oil sentrifugal, aroma gurih alami murni\n• Kemasan: Bal 5 kg ganda PE dalam karton box\n\nLembar spesifikasi teknis resmi (TDS) dapat ditinjau di: ${tdsUrl}\n${custom_offer ? `\nCatatan Khusus: ${custom_offer}\n` : ''}\nKami siap mengirimkan sampel uji 250 gram secara cuma-cuma. Mohon konfirmasi alamat pengiriman Bapak/Ibu.\n\nHormat kami,\nAgung Gunawan\nDirektur, PT Haturan Spice Indonesia\nhaturan.com`
    }

    return { content: [{ type: 'text', text }] }
  }
)

// Start Server via Stdio
async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('HTRN MCP Server running on stdio transport.')
}

main().catch((err) => {
  console.error('Error starting MCP server:', err)
  process.exit(1)
})
