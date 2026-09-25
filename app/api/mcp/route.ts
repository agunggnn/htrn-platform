import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import {
  encodeBuyerNotes,
  encodeWhatsAppStatus,
  verifyPhoneNumber,
  getBuyerStage,
  getBuyerTier,
  getBuyerScore,
  getWhatsAppStatus,
} from '@/lib/buyers-helper'
import { lookupGetcontact } from '@/lib/getcontact'
import { parseBuyerKyc, encodeBuyerKycNotes } from '@/lib/kyc-helper'
import {
  getCurrentBawangGorengMarketData,
  analyzeCompetitorOffer,
  SALES_OBJECTIONS_PLAYBOOK,
} from '@/lib/commodity-mentor'
import {
  calculatePackagingBreakdown,
  calculateFulfillmentFinancials,
  generateMasParminSpkWhatsAppText,
} from '@/lib/fulfillment-helper'
import type { Buyer } from '@/types'

const TOOLS_MANIFEST = [
  {
    name: 'htrn_search_buyers',
    description: 'Search buyers directory by company name, contact, email, region, or pipeline stage',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search term for company name, contact, or email' },
        pipeline_stage: { type: 'string', description: 'Filter by pipeline stage (lead, target_outreach, sample_sent, quotation_sent, negotiation, active_customer, closed_lost)' },
        tier: { type: 'string', description: 'Filter by buyer volume tier (tier_1, tier_2, tier_3, tier_4)' },
        limit: { type: 'number', default: 10 },
      },
    },
  },
  {
    name: 'htrn_get_buyer_details',
    description: 'Get comprehensive details, contact info, WhatsApp status, and recent quotation history for a specific buyer',
    inputSchema: {
      type: 'object',
      properties: {
        buyer_id: { type: 'string', description: 'UUID of the buyer in HTRN CRM' },
      },
      required: ['buyer_id'],
    },
  },
  {
    name: 'htrn_create_buyer',
    description: 'Create a new buyer prospect in HTRN CRM with contact verification, tier, and pipeline stage',
    inputSchema: {
      type: 'object',
      properties: {
        company_name: { type: 'string', description: 'Company or business name (e.g. PT Resto Nusantara)' },
        contact_name: { type: 'string', description: 'Name of the contact person / PIC' },
        phone: { type: 'string', description: 'Phone number or WhatsApp (will be verified automatically)' },
        email: { type: 'string', description: 'Email address' },
        country: { type: 'string', description: 'Region or city (default: Indonesia)' },
        pipeline_stage: {
          type: 'string',
          enum: ['lead', 'target_outreach', 'sample_sent', 'quotation_sent', 'negotiation', 'active_customer', 'closed_lost'],
          description: 'Initial pipeline stage (default: lead)',
        },
        tier: {
          type: 'string',
          enum: ['tier_1', 'tier_2', 'tier_3', 'tier_4'],
          description: 'Volume tier: tier_1 (100-499kg), tier_2 (500-999kg), tier_3 (1-2 ton), tier_4 (>2 ton)',
        },
        payment_terms: { type: 'string', description: 'Payment terms (e.g. CBD, COD, TOP 14 Hari)' },
        notes: { type: 'string', description: 'Notes regarding buyer requirements or commercial background' },
      },
      required: ['company_name'],
    },
  },
  {
    name: 'htrn_update_buyer',
    description: 'Update an existing buyer prospect (company name, contact, phone, email, terms, stage, tier, notes)',
    inputSchema: {
      type: 'object',
      properties: {
        buyer_id: { type: 'string', description: 'UUID of the buyer to update' },
        company_name: { type: 'string', description: 'Updated company name' },
        contact_name: { type: 'string', description: 'Updated contact person' },
        phone: { type: 'string', description: 'Updated phone/WA number' },
        email: { type: 'string', description: 'Updated email' },
        country: { type: 'string', description: 'Updated region/city' },
        payment_terms: { type: 'string', description: 'Updated payment terms' },
        pipeline_stage: { type: 'string', description: 'Updated pipeline stage' },
        tier: { type: 'string', description: 'Updated buyer tier' },
        notes: { type: 'string', description: 'Updated notes' },
      },
      required: ['buyer_id'],
    },
  },
  {
    name: 'htrn_delete_buyer',
    description: 'Delete or soft-delete (archive) a buyer prospect from HTRN CRM',
    inputSchema: {
      type: 'object',
      properties: {
        buyer_id: { type: 'string', description: 'UUID of the buyer to delete' },
        permanent: { type: 'boolean', description: 'If true, hard-deletes record from database. Default is false (soft delete).' },
      },
      required: ['buyer_id'],
    },
  },
  {
    name: 'htrn_update_pipeline_stage',
    description: 'Move a buyer through the sales pipeline stages',
    inputSchema: {
      type: 'object',
      properties: {
        buyer_id: { type: 'string', description: 'UUID of the buyer' },
        new_stage: {
          type: 'string',
          enum: ['lead', 'target_outreach', 'sample_sent', 'quotation_sent', 'negotiation', 'active_customer', 'closed_lost'],
          description: 'New pipeline stage',
        },
        notes: { type: 'string', description: 'Optional log note for this transition' },
      },
      required: ['buyer_id', 'new_stage'],
    },
  },
  {
    name: 'htrn_log_interaction',
    description: 'Log a sales outreach or inbound engagement touchpoint (WhatsApp sent, WhatsApp replied, sample requested, call)',
    inputSchema: {
      type: 'object',
      properties: {
        buyer_id: { type: 'string', description: 'UUID of the buyer' },
        channel: { type: 'string', enum: ['whatsapp', 'email', 'phone_call', 'meeting'], default: 'whatsapp' },
        status: {
          type: 'string',
          enum: ['sent', 'replied', 'sample_requested', 'rejected', 'uncontacted'],
          description: 'Status of the interaction',
        },
        summary: { type: 'string', description: 'Summary of what was communicated or buyer response' },
        date: { type: 'string', description: 'Date in YYYY-MM-DD format (default: today)' },
      },
      required: ['buyer_id', 'status'],
    },
  },
  {
    name: 'htrn_verify_contact',
    description: 'Verify an Indonesian phone number (GSM mobile, operator, WhatsApp capability, PSTN landline check) and email syntax',
    inputSchema: {
      type: 'object',
      properties: {
        phone: { type: 'string', description: 'Phone number to verify' },
        email: { type: 'string', description: 'Email address to verify' },
      },
    },
  },
  {
    name: 'htrn_verify_kyc_getcontact',
    description: 'Perform B2B KYC and personal phone verification using reverse-engineered Getcontact intelligence, tag cloud extraction, and fraud risk analysis',
    inputSchema: {
      type: 'object',
      properties: {
        phone: { type: 'string', description: 'Phone number to verify with Getcontact' },
        buyer_id: { type: 'string', description: 'Optional UUID of the buyer in CRM to attach verified KYC tags' },
        company_name: { type: 'string', description: 'Company name for contextual matching' },
        contact_name: { type: 'string', description: 'PIC name to cross-check with Getcontact caller name' },
      },
      required: ['phone'],
    },
  },
  {
    name: 'htrn_approve_kyc',
    description: 'Approve or update B2B KYC decision for a buyer (set credit limit, unlock TOP 14/30 days, save NPWP/NIB)',
    inputSchema: {
      type: 'object',
      properties: {
        buyer_id: { type: 'string', description: 'UUID of the buyer' },
        status: { type: 'string', enum: ['verified', 'pending', 'unverified', 'rejected'], default: 'verified' },
        credit_limit: { type: 'number', description: 'Credit limit in IDR (e.g. 50000000)' },
        allowed_terms: { type: 'string', enum: ['CBD', 'COD', 'TOP 7 Hari', 'TOP 14 Hari', 'TOP 30 Hari'], default: 'TOP 14 Hari' },
        tax_id: { type: 'string', description: 'NPWP / Tax ID' },
        nib: { type: 'string', description: 'Nomor Induk Berusaha' },
      },
      required: ['buyer_id', 'status'],
    },
  },
  {
    name: 'htrn_get_price_matrix',
    description: 'Get current commercial pricing matrix: Supplier HPP modal, Tiered selling prices, and negotiation floor',
    inputSchema: {
      type: 'object',
      properties: {
        commodity: { type: 'string', default: 'Bawang Merah Goreng' },
      },
    },
  },
  {
    name: 'htrn_get_technical_data_sheet',
    description: 'Get official Technical Data Sheet (TDS) parameters and download link for Bawang Merah Goreng',
    inputSchema: {
      type: 'object',
      properties: {
        commodity: { type: 'string', default: 'bawang_goreng' },
      },
    },
  },
  {
    name: 'htrn_draft_outreach',
    description: 'Generate personalized B2B outreach email or WhatsApp copy adhering to HTRN commercial standards',
    inputSchema: {
      type: 'object',
      properties: {
        buyer_id: { type: 'string', description: 'UUID of target buyer' },
        channel: { type: 'string', enum: ['email', 'whatsapp'], default: 'whatsapp' },
        custom_offer: { type: 'string', description: 'Specific notes or terms to highlight' },
      },
      required: ['buyer_id'],
    },
  },
  {
    name: 'htrn_commodity_mentor',
    description: 'Consult the commodity sales mentor for Bawang Merah Goreng: decomposes competitor prices into raw vs flour costs, calculates kitchen yield advantage, and generates negotiation defense scripts',
    inputSchema: {
      type: 'object',
      properties: {
        competitor_price: { type: 'number', description: 'Competitor price offer per kg in IDR (e.g. 115000)' },
        target_tier_price: { type: 'number', description: 'Our target selling price in IDR (default: 165000)' },
        buyer_objection: { type: 'string', description: 'Buyer objection topic or keyword (e.g. "kemahalan", "tempo 30 hari", "supplier lama", "follow up sampel")' },
      },
    },
  },
  {
    name: 'htrn_get_weekly_market_briefing',
    description: 'Get the latest Monday market price briefing for Bawang Merah Goreng, raw Brebes farmgate trends, shrinkage ratios, and executive procurement strategy',
    inputSchema: {
      type: 'object',
      properties: {
        commodity: { type: 'string', default: 'bawang_goreng', description: 'Commodity identifier' },
      },
    },
  },
  {
    name: 'htrn_generate_mas_parmin_spk',
    description: 'Generate automated B2B maklon/dropship Work Order (SPK) for supplier Mas Parmin (Bogor hub), calculate packaging breakdown (bal 5kg & master cartons), locked gross profit, and formatted WhatsApp dispatch message',
    inputSchema: {
      type: 'object',
      properties: {
        buyer_id: { type: 'string', description: 'UUID of buyer (optional, to autofill company details)' },
        buyer_company: { type: 'string', description: 'Buyer company or restaurant name' },
        quantity_kg: { type: 'number', default: 500, description: 'Volume in kilograms' },
        unit_selling_price: { type: 'number', default: 155000, description: 'Selling price per kg in IDR' },
        commodity_name: { type: 'string', default: 'Bawang Merah Goreng', description: 'Commodity name' },
        delivery_address: { type: 'string', description: 'Destination address for Franco delivery' },
        target_ready_date: { type: 'string', description: 'Target ready date YYYY-MM-DD' },
      },
    },
  },
  {
    name: 'htrn_get_surat_jalan_link',
    description: 'Get the official PT Haturan Spice Indonesia delivery order (Surat Jalan & BAST) printable PDF link for an order or quotation ID',
    inputSchema: {
      type: 'object',
      properties: {
        order_id: { type: 'string', description: 'Quotation or Invoice ID' },
      },
      required: ['order_id'],
    },
  },
]

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { jsonrpc = '2.0', method, params, id = 1 } = body

    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.haturan.com'

    // Handle tools/list
    if (method === 'tools/list') {
      return NextResponse.json(
        {
          jsonrpc: '2.0',
          result: { tools: TOOLS_MANIFEST },
          id,
        },
        { headers: corsHeaders() }
      )
    }

    // Handle tools/call
    if (method === 'tools/call') {
      const toolName = params?.name
      const args = params?.arguments || {}

      switch (toolName) {
        case 'htrn_search_buyers': {
          let q = admin.from('buyers').select('*').eq('is_active', true).limit(args.limit || 10)
          if (args.query) {
            q = q.or(`company_name.ilike.%${args.query}%,contact_name.ilike.%${args.query}%,email.ilike.%${args.query}%`)
          }
          const { data, error } = await q
          if (error) throw new Error(error.message)

          let buyers = (data as Buyer[]) || []
          if (args.pipeline_stage) {
            buyers = buyers.filter((b) => (b.pipeline_stage || getBuyerStage(b)) === args.pipeline_stage)
          }
          if (args.tier) {
            buyers = buyers.filter((b) => (b.buyer_tier || getBuyerTier(b)) === args.tier)
          }

          const formatted = buyers.map((b) => ({
            id: b.id,
            company_name: b.company_name,
            contact_name: b.contact_name,
            email: b.email,
            phone: b.phone,
            phone_verification: verifyPhoneNumber(b.phone),
            region: b.country || 'Indonesia',
            stage: b.pipeline_stage || getBuyerStage(b),
            tier: b.buyer_tier || getBuyerTier(b),
            gacoan_fit_score: getBuyerScore(b),
            whatsapp_status: getWhatsAppStatus(b),
          }))

          return NextResponse.json(
            { jsonrpc: '2.0', result: { content: [{ type: 'text', text: JSON.stringify(formatted, null, 2) }] }, id },
            { headers: corsHeaders() }
          )
        }

        case 'htrn_get_buyer_details': {
          const { data: rawBuyer, error } = await admin.from('buyers').select('*').eq('id', args.buyer_id).single()
          if (error || !rawBuyer) throw new Error(`Buyer not found: ${error?.message}`)

          const buyer = rawBuyer as Buyer
          const { data: quotations } = await admin
            .from('quotations')
            .select('*')
            .eq('buyer_id', args.buyer_id)
            .order('created_at', { ascending: false })
            .limit(5)

          const enriched = {
            ...buyer,
            stage: buyer.pipeline_stage || getBuyerStage(buyer),
            tier: buyer.buyer_tier || getBuyerTier(buyer),
            gacoan_fit_score: getBuyerScore(buyer),
            phone_verification: verifyPhoneNumber(buyer.phone),
            whatsapp_status: getWhatsAppStatus(buyer),
            recent_quotations: quotations || [],
          }

          return NextResponse.json(
            { jsonrpc: '2.0', result: { content: [{ type: 'text', text: JSON.stringify(enriched, null, 2) }] }, id },
            { headers: corsHeaders() }
          )
        }

        case 'htrn_create_buyer': {
          const { company_name, contact_name, phone, email, country, pipeline_stage = 'lead', tier = 'tier_1', payment_terms = 'CBD', notes } = args
          if (!company_name) throw new Error('company_name is required')

          // Deduplication check
          if (email) {
            const { data: existing } = await admin.from('buyers').select('id, company_name').ilike('email', email.trim().toLowerCase()).limit(1)
            if (existing && existing.length > 0) {
              return NextResponse.json(
                {
                  jsonrpc: '2.0',
                  result: {
                    content: [
                      {
                        type: 'text',
                        text: `Buyer already exists: ${existing[0].company_name} (ID: ${existing[0].id})`,
                      },
                    ],
                  },
                  id,
                },
                { headers: corsHeaders() }
              )
            }
          }

          const encodedNotes = encodeBuyerNotes(notes || null, pipeline_stage, tier, 60)
          const newRecord = {
            company_name: company_name.trim(),
            contact_name: contact_name ? contact_name.trim() : null,
            email: email ? email.trim().toLowerCase() : null,
            phone: phone ? phone.trim() : null,
            country: country ? country.trim() : 'Indonesia',
            currency: 'IDR',
            payment_terms: payment_terms || 'CBD',
            source: 'hermes_gateway',
            notes: encodedNotes,
            is_active: true,
          }

          const { data, error } = await admin.from('buyers').insert([newRecord]).select().single()
          if (error) throw new Error(error.message)

          return NextResponse.json(
            {
              jsonrpc: '2.0',
              result: {
                content: [
                  {
                    type: 'text',
                    text: `Success: Created buyer "${data.company_name}" (ID: ${data.id}) in stage "${pipeline_stage}".`,
                  },
                ],
              },
              id,
            },
            { headers: corsHeaders() }
          )
        }

        case 'htrn_update_buyer': {
          const { buyer_id, company_name, contact_name, phone, email, country, payment_terms, pipeline_stage, tier, notes } = args
          if (!buyer_id) throw new Error('buyer_id is required')

          const { data: existing, error: fetchErr } = await admin.from('buyers').select('*').eq('id', buyer_id).single()
          if (fetchErr || !existing) throw new Error(`Buyer not found: ${fetchErr?.message}`)

          const currentStage = pipeline_stage || getBuyerStage(existing as Buyer)
          const currentTier = tier || getBuyerTier(existing as Buyer)
          const currentScore = getBuyerScore(existing as Buyer)
          const updatedNotes = encodeBuyerNotes(notes !== undefined ? notes : existing.notes, currentStage, currentTier, currentScore)

          const updatePayload: Record<string, unknown> = {
            notes: updatedNotes,
          }
          if (company_name !== undefined) updatePayload.company_name = company_name
          if (contact_name !== undefined) updatePayload.contact_name = contact_name
          if (phone !== undefined) updatePayload.phone = phone
          if (email !== undefined) updatePayload.email = email
          if (country !== undefined) updatePayload.country = country
          if (payment_terms !== undefined) updatePayload.payment_terms = payment_terms

          const { data, error } = await admin.from('buyers').update(updatePayload).eq('id', buyer_id).select().single()
          if (error) throw new Error(error.message)

          return NextResponse.json(
            {
              jsonrpc: '2.0',
              result: {
                content: [{ type: 'text', text: `Success: Updated buyer "${data.company_name}" (ID: ${data.id}).` }],
              },
              id,
            },
            { headers: corsHeaders() }
          )
        }

        case 'htrn_delete_buyer': {
          const { buyer_id, permanent = false } = args
          if (!buyer_id) throw new Error('buyer_id is required')

          if (permanent) {
            const { error } = await admin.from('buyers').delete().eq('id', buyer_id)
            if (error) throw new Error(error.message)
            return NextResponse.json(
              {
                jsonrpc: '2.0',
                result: { content: [{ type: 'text', text: `Success: Permanently deleted buyer ${buyer_id}.` }] },
                id,
              },
              { headers: corsHeaders() }
            )
          } else {
            const { error } = await admin.from('buyers').update({ is_active: false }).eq('id', buyer_id)
            if (error) throw new Error(error.message)
            return NextResponse.json(
              {
                jsonrpc: '2.0',
                result: { content: [{ type: 'text', text: `Success: Soft-deleted (archived) buyer ${buyer_id}.` }] },
                id,
              },
              { headers: corsHeaders() }
            )
          }
        }

        case 'htrn_update_pipeline_stage': {
          const { buyer_id, new_stage, notes } = args
          const { data: existingBuyer } = await admin.from('buyers').select('notes, company_name').eq('id', buyer_id).single()
          if (!existingBuyer) throw new Error(`Buyer not found`)

          const tierMatch = existingBuyer.notes?.match(/\[Tier:\s*([a-z0-9_]+)\]/i)
          const scoreMatch = existingBuyer.notes?.match(/\[Fit:\s*(\d+)%?\]/i)
          const updatedNotes = encodeBuyerNotes(
            notes !== undefined ? notes : existingBuyer.notes,
            new_stage,
            tierMatch ? tierMatch[1] : null,
            scoreMatch ? parseInt(scoreMatch[1], 10) : null
          )

          const { error } = await admin.from('buyers').update({ notes: updatedNotes }).eq('id', buyer_id)
          if (error) throw new Error(error.message)

          return NextResponse.json(
            {
              jsonrpc: '2.0',
              result: {
                content: [{ type: 'text', text: `Success: ${existingBuyer.company_name} stage updated to ${new_stage}.` }],
              },
              id,
            },
            { headers: corsHeaders() }
          )
        }

        case 'htrn_log_interaction': {
          const { buyer_id, channel = 'whatsapp', status, summary, date } = args
          if (!buyer_id || !status) throw new Error('buyer_id and status are required')

          const { data: buyer, error: fetchErr } = await admin.from('buyers').select('*').eq('id', buyer_id).single()
          if (fetchErr || !buyer) throw new Error('Buyer not found')

          const interactionDate = date || new Date().toISOString().split('T')[0]
          let updatedNotes = encodeWhatsAppStatus(buyer.notes, status, interactionDate)
          if (summary) {
            updatedNotes = `${updatedNotes}\n[Log ${interactionDate} via ${channel.toUpperCase()}]: ${summary}`
          }

          const stageMatch = buyer.notes?.match(/\[Stage:\s*([a-z_]+)\]/i)
          let currentStage = stageMatch ? stageMatch[1] : (buyer.pipeline_stage || 'lead')
          if (status === 'sample_requested' && (currentStage === 'lead' || currentStage === 'target_outreach')) {
            currentStage = 'sample_sent'
          } else if (status === 'replied' && currentStage === 'lead') {
            currentStage = 'target_outreach'
          }

          const tierMatch = buyer.notes?.match(/\[Tier:\s*([a-z0-9_]+)\]/i)
          const scoreMatch = buyer.notes?.match(/\[Fit:\s*(\d+)%?\]/i)
          updatedNotes = encodeBuyerNotes(
            updatedNotes,
            currentStage,
            tierMatch ? tierMatch[1] : null,
            scoreMatch ? parseInt(scoreMatch[1], 10) : null
          )

          const { error: updateErr } = await admin.from('buyers').update({ notes: updatedNotes }).eq('id', buyer_id)
          if (updateErr) throw new Error(updateErr.message)

          return NextResponse.json(
            {
              jsonrpc: '2.0',
              result: {
                content: [
                  {
                    type: 'text',
                    text: `Success: Logged ${channel} interaction with status "${status}" for buyer "${buyer.company_name}". Stage is now "${currentStage}".`,
                  },
                ],
              },
              id,
            },
            { headers: corsHeaders() }
          )
        }

        case 'htrn_verify_contact': {
          const phoneRes = verifyPhoneNumber(args.phone)
          let emailRes = null
          if (args.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            const valid = emailRegex.test(args.email.trim())
            emailRes = {
              email: args.email.trim(),
              isValid: valid,
              domain: valid ? args.email.trim().split('@')[1] : null,
            }
          }

          return NextResponse.json(
            {
              jsonrpc: '2.0',
              result: {
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
              },
              id,
            },
            { headers: corsHeaders() }
          )
        }

        case 'htrn_verify_kyc_getcontact': {
          const { phone, buyer_id, company_name, contact_name } = args
          if (!phone) throw new Error('phone is required')

          const gtcRes = await lookupGetcontact(phone, {
            companyName: company_name,
            contactName: contact_name,
          })

          if (buyer_id) {
            const { data: rawBuyer } = await admin.from('buyers').select('*').eq('id', buyer_id).single()
            if (rawBuyer) {
              const currentKyc = parseBuyerKyc(rawBuyer as Buyer)
              const mergedTags = Array.from(new Set([...gtcRes.tags, ...currentKyc.getcontactTags])).slice(0, 15)
              const updatedNotes = encodeBuyerKycNotes(rawBuyer.notes, {
                ...currentKyc,
                getcontactName: gtcRes.name || currentKyc.getcontactName,
                getcontactTags: mergedTags,
                spamCount: gtcRes.spamCount,
                riskLevel: gtcRes.riskLevel,
                lastCheckedAt: new Date().toISOString().split('T')[0],
              })
              await admin.from('buyers').update({ notes: updatedNotes }).eq('id', buyer_id)
            }
          }

          return NextResponse.json(
            {
              jsonrpc: '2.0',
              result: {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(gtcRes, null, 2),
                  },
                ],
              },
              id,
            },
            { headers: corsHeaders() }
          )
        }

        case 'htrn_approve_kyc': {
          const { buyer_id, status = 'verified', credit_limit = 0, allowed_terms = 'TOP 14 Hari', tax_id, nib } = args
          if (!buyer_id) throw new Error('buyer_id is required')

          const { data: rawBuyer, error: fetchErr } = await admin.from('buyers').select('*').eq('id', buyer_id).single()
          if (fetchErr || !rawBuyer) throw new Error('Buyer not found')

          const currentKyc = parseBuyerKyc(rawBuyer as Buyer)
          const today = new Date().toISOString().split('T')[0]
          const updatedProfile = {
            ...currentKyc,
            status: status as any,
            isVerified: status === 'verified',
            verifiedAt: status === 'verified' ? today : null,
            verifiedBy: status === 'verified' ? 'Hermes Agent Gateway (Authorized)' : null,
            creditLimit: Number(credit_limit) || 0,
            allowedTerms: allowed_terms,
            taxId: tax_id !== undefined ? tax_id : rawBuyer.tax_id,
            nib: nib !== undefined ? nib : currentKyc.nib,
          }

          const updatedNotes = encodeBuyerKycNotes(rawBuyer.notes, updatedProfile)
          const { error: updateErr } = await admin
            .from('buyers')
            .update({ notes: updatedNotes, payment_terms: allowed_terms })
            .eq('id', buyer_id)

          if (updateErr) throw new Error(updateErr.message)

          return NextResponse.json(
            {
              jsonrpc: '2.0',
              result: {
                content: [
                  {
                    type: 'text',
                    text: `Success: Buyer "${rawBuyer.company_name}" KYC updated to "${status}". Terms unlocked: ${allowed_terms}, Credit Limit: Rp ${credit_limit.toLocaleString('id-ID')}.`,
                  },
                ],
              },
              id,
            },
            { headers: corsHeaders() }
          )
        }

        case 'htrn_get_price_matrix': {
          const matrix = {
            commodity: 'Bawang Merah Goreng (Fried Shallots)',
            origin_hub: 'CV Daun Mas / CV Panca Mas (Mas Parmin), Bogor',
            terms: 'Franco Jabodetabek & Bandung',
            supplier_hpp_modal: 125000,
            negotiation_floor: 140000,
            selling_tiers: {
              tier_1_horeca: { volume: '100 - 499 kg', price: 165000, margin: 40000 },
              tier_2_catering: { volume: '500 - 999 kg', price: 155000, margin: 30000 },
              tier_3_industrial: { volume: '1.000 - 2.000 kg', price: 149000, margin: 24000 },
              tier_4_enterprise: { volume: '> 2.000 kg', price: 144000, margin: 19000 },
            },
          }
          return NextResponse.json(
            { jsonrpc: '2.0', result: { content: [{ type: 'text', text: JSON.stringify(matrix, null, 2) }] }, id },
            { headers: corsHeaders() }
          )
        }

        case 'htrn_get_technical_data_sheet': {
          const tds = {
            product_name: 'Bawang Merah Goreng Pilihan Mutu Industri',
            hs_code: '2005.99.90',
            variety: 'Brebes Super & Sumenep Asli',
            water_content: '< 3.0%',
            free_fatty_acid_ffa: '< 0.5%',
            packaging: 'Bal 5 kg ganda PE dalam karton box / zak bulk 25 kg',
            tds_url: `${appUrl}/api/pdf/spec-sheet/bawang-goreng`,
          }
          return NextResponse.json(
            { jsonrpc: '2.0', result: { content: [{ type: 'text', text: JSON.stringify(tds, null, 2) }] }, id },
            { headers: corsHeaders() }
          )
        }

        case 'htrn_draft_outreach': {
          const { data: rawBuyer } = await admin.from('buyers').select('*').eq('id', args.buyer_id).single()
          if (!rawBuyer) throw new Error('Buyer not found')

          const buyer = rawBuyer as Buyer
          const company = buyer.company_name
          const pic = buyer.contact_name || 'Bapak/Ibu Tim Pengadaan'
          const tier = buyer.buyer_tier || getBuyerTier(buyer)
          const price = tier === 'tier_2' ? 'Rp 155.000' : 'Rp 165.000'
          const tdsUrl = `${appUrl}/api/pdf/spec-sheet/bawang-goreng`

          let text = ''
          if (args.channel === 'whatsapp') {
            text = `Halo ${pic}, salam hangat dari PT Haturan Spice Indonesia.\n\nMenindaklanjuti kebutuhan pasokan bahan baku di *${company}*, kami menyediakan Bawang Merah Goreng varietas asli Brebes & Sumenep mutu industri dari pusat sortasi kami di Bogor.\n\n• Renyah keemasan, tiris minyak sentrifugal (kadar air < 3%, FFA < 0.5%)\n• Harga: *${price}/kg* Franco Jabodetabek/Bandung\n• Kemasan bal 5 kg ganda PE food grade\n\nKami siap mengirimkan sampel gratis 250g ke lokasi Bapak/Ibu untuk uji dapur/QC. TDS resmi: ${tdsUrl}\n\nApakah berkenan kami kirimkan paket sampelnya besok?\n- Agung Gunawan, Direktur PT Haturan Spice Indonesia`
          } else {
            text = `Yth. ${pic} (${company}),\n\nMenjawab kebutuhan efisiensi dan kestabilan pasokan bahan baku di ${company}, berikut kami sampaikan penawaran resmi Bawang Merah Goreng mutu industri dari PT Haturan Spice Indonesia:\n\n• Produk: Bawang Merah Goreng (Crispy Flakes)\n• Penawaran: ${price} / kg (Franco)\n• Spesifikasi: Kadar air < 3.0%, low-oil sentrifugal, aroma gurih alami murni\n• Kemasan: Bal 5 kg ganda PE dalam karton box\n\nLembar spesifikasi teknis resmi (TDS) dapat ditinjau di: ${tdsUrl}\n${args.custom_offer ? `\nCatatan Khusus: ${args.custom_offer}\n` : ''}\nKami siap mengirimkan sampel uji 250 gram secara cuma-cuma. Mohon konfirmasi alamat pengiriman Bapak/Ibu.\n\nHormat kami,\nAgung Gunawan\nDirektur, PT Haturan Spice Indonesia\nhaturan.com`
          }

          return NextResponse.json(
            { jsonrpc: '2.0', result: { content: [{ type: 'text', text }] }, id },
            { headers: corsHeaders() }
          )
        }

        case 'htrn_commodity_mentor': {
          const compPrice = args.competitor_price ? Number(args.competitor_price) : 115000
          const targetPrice = args.target_tier_price ? Number(args.target_tier_price) : 165000
          const analysis = analyzeCompetitorOffer(compPrice, targetPrice)

          let objectionHandling = null
          if (args.buyer_objection) {
            const query = String(args.buyer_objection).toLowerCase()
            objectionHandling =
              SALES_OBJECTIONS_PLAYBOOK.find(
                (o) =>
                  o.id.toLowerCase().includes(query) ||
                  o.question.toLowerCase().includes(query) ||
                  o.coreReason.toLowerCase().includes(query)
              ) || SALES_OBJECTIONS_PLAYBOOK[0]
          }

          const response = {
            competitor_analysis: analysis,
            all_objection_topics: SALES_OBJECTIONS_PLAYBOOK.map((o) => ({ id: o.id, question: o.question })),
            targeted_objection_advice: objectionHandling,
          }

          return NextResponse.json(
            { jsonrpc: '2.0', result: { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] }, id },
            { headers: corsHeaders() }
          )
        }

        case 'htrn_get_weekly_market_briefing': {
          const marketData = getCurrentBawangGorengMarketData()
          return NextResponse.json(
            { jsonrpc: '2.0', result: { content: [{ type: 'text', text: JSON.stringify(marketData, null, 2) }] }, id },
            { headers: corsHeaders() }
          )
        }

        case 'htrn_generate_mas_parmin_spk': {
          let companyName = args.buyer_company || 'PT Klien Haturan'
          let picName = 'Kepala Dapur / Tim Pengadaan'
          let picPhone = ''
          let address = args.delivery_address || 'Jabodetabek (Franco)'

          if (args.buyer_id) {
            const { data: b } = await admin.from('buyers').select('*').eq('id', args.buyer_id).single()
            if (b) {
              companyName = b.company_name
              picName = b.contact_name || picName
              picPhone = b.phone || picPhone
              address = b.country ? `Kawasan Industri / Area ${b.country}` : address
            }
          }

          const qty = Number(args.quantity_kg) || 500
          const price = Number(args.unit_selling_price) || 155000
          const spkNo = `SPK/MP/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`
          const readyDate = args.target_ready_date || new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]
          const orderId = args.buyer_id || 'DEMO'
          const suratJalanUrl = `${appUrl}/api/pdf/surat-jalan/${orderId}`

          const packaging = calculatePackagingBreakdown(qty)
          const financials = calculateFulfillmentFinancials(qty, price)
          const whatsappMsg = generateMasParminSpkWhatsAppText({
            spkNumber: spkNo,
            commodityName: args.commodity_name || 'Bawang Merah Goreng',
            gradeCode: 'GRADE_A_SLICE',
            gradeName: 'Grade A Slice Renyah (Brebes Super Murni)',
            quantityKg: qty,
            unitSellingPrice: price,
            readyDateWib: readyDate,
            buyerCompany: companyName,
            buyerPic: picName,
            buyerPhone: picPhone,
            buyerDeliveryAddress: address,
            suratJalanUrl,
          })

          const response = {
            spk_number: spkNo,
            financials,
            packaging,
            surat_jalan_url: suratJalanUrl,
            whatsapp_instruction_text: whatsappMsg,
          }

          return NextResponse.json(
            { jsonrpc: '2.0', result: { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] }, id },
            { headers: corsHeaders() }
          )
        }

        case 'htrn_get_surat_jalan_link': {
          const orderId = args.order_id
          const suratJalanUrl = `${appUrl}/api/pdf/surat-jalan/${orderId}`
          return NextResponse.json(
            {
              jsonrpc: '2.0',
              result: {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(
                      {
                        order_id: orderId,
                        surat_jalan_url: suratJalanUrl,
                        document_name: 'Surat Jalan & BAST Resmi PT Haturan Spice Indonesia',
                        instructions: 'Buka tautan ini untuk mencetak 2 rangkap dokumen resmi pengiriman bagi armada Mas Parmin di Bogor.',
                      },
                      null,
                      2
                    ),
                  },
                ],
              },
              id,
            },
            { headers: corsHeaders() }
          )
        }

        default:
          return NextResponse.json(
            { jsonrpc: '2.0', error: { code: -32601, message: `Method or tool ${toolName} not found` }, id },
            { status: 404, headers: corsHeaders() }
          )
      }
    }

    return NextResponse.json(
      { jsonrpc: '2.0', error: { code: -32600, message: 'Invalid JSON-RPC request' }, id },
      { status: 400, headers: corsHeaders() }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json(
      { jsonrpc: '2.0', error: { code: -32000, message }, id: null },
      { status: 500, headers: corsHeaders() }
    )
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() })
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}
