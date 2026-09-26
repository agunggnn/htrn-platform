import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import {
  evaluateBuyerWhatsAppIntent,
  sendChatwootMessage,
} from '@/lib/chatwoot-helper'
import { triggerBackgroundGetcontactEnrichment } from '@/lib/getcontact'
import { encodeWhatsAppStatus } from '@/lib/buyers-helper'
import type { Buyer } from '@/types'
import { getSecret } from '@/lib/secrets-helper'
import { tokensMatch } from '@/lib/api-auth'

export async function POST(request: Request) {
  try {
    // 0. Authenticate Webhook Secret (Fail-Closed)
    const expectedSecret = (await getSecret('CHATWOOT_WEBHOOK_SECRET')) || process.env.CHATWOOT_WEBHOOK_SECRET
    if (!expectedSecret) {
      return NextResponse.json(
        {
          error:
            'Unauthorized: CHATWOOT_WEBHOOK_SECRET belum dikonfigurasi di vault sistem. Pemrosesan webhook ditolak (fail-closed) demi keamanan.',
        },
        { status: 401 }
      )
    }

    const url = new URL(request.url)
    const tokenFromQuery = url.searchParams.get('token') || url.searchParams.get('secret')
    const tokenFromHeader =
      request.headers.get('x-chatwoot-webhook-token') ||
      request.headers.get('x-webhook-secret') ||
      (request.headers.get('authorization')?.startsWith('Bearer ')
        ? request.headers.get('authorization')?.slice(7)
        : null)

    const providedToken = tokenFromQuery || tokenFromHeader || ''
    if (!tokensMatch(expectedSecret, providedToken)) {
      return NextResponse.json({ error: 'Unauthorized: Invalid Chatwoot webhook secret' }, { status: 401 })
    }

    const payload = await request.json()
    const { event, message_type, content, conversation, sender } = payload

    // 1. Only process incoming buyer messages (ignore outgoing or system activities)
    if (event !== 'message_created' || message_type !== 'incoming' || !content) {
      return NextResponse.json({ received: true, ignored: true })
    }

    const chatwootConvId = conversation?.id
    if (!chatwootConvId) {
      return NextResponse.json({ error: 'Conversation ID missing' }, { status: 400 })
    }

    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 2. Extract phone number
    const rawPhone = sender?.phone_number || conversation?.meta?.sender?.phone_number || ''
    const cleanDigits = rawPhone.replace(/\D/g, '')

    // 3. Match Buyer in HTRN database
    let matchedBuyer: Buyer | null = null
    if (cleanDigits) {
      let altDigits = cleanDigits
      if (cleanDigits.startsWith('62')) altDigits = '0' + cleanDigits.slice(2)
      else if (cleanDigits.startsWith('0')) altDigits = '62' + cleanDigits.slice(1)

      const { data: buyers } = await admin
        .from('buyers')
        .select('*')
        .or(`phone.ilike.%${cleanDigits}%,phone.ilike.%${altDigits}%`)
        .limit(1)

      if (buyers && buyers.length > 0) {
        matchedBuyer = buyers[0] as Buyer

        // Asynchronous background KYC enrichment via Getcontact (non-blocking)
        triggerBackgroundGetcontactEnrichment({
          buyerId: matchedBuyer.id,
          phone: rawPhone,
          companyName: matchedBuyer.company_name,
          contactName: matchedBuyer.contact_name,
        }).catch((err) => console.error('[Chatwoot Webhook] Background KYC error:', err))
      }
    }

    // 4. Upsert Chatwoot Conversation record
    let currentAgentMode = 'auto_pilot'
    const { data: existingConv } = await admin
      .from('chatwoot_conversations')
      .select('*')
      .eq('chatwoot_conversation_id', chatwootConvId)
      .single()

    let conversationUuid = existingConv?.id

    if (existingConv) {
      currentAgentMode = existingConv.agent_mode || 'auto_pilot'
      await admin
        .from('chatwoot_conversations')
        .update({
          last_buyer_message: content,
          last_message_at: new Date().toISOString(),
          status: 'open',
          updated_at: new Date().toISOString(),
          buyer_id: matchedBuyer ? matchedBuyer.id : existingConv.buyer_id,
        })
        .eq('id', existingConv.id)
    } else {
      const { data: newConv } = await admin
        .from('chatwoot_conversations')
        .insert({
          chatwoot_conversation_id: chatwootConvId,
          buyer_id: matchedBuyer ? matchedBuyer.id : null,
          contact_phone: rawPhone,
          contact_name: sender?.name || matchedBuyer?.contact_name || 'Buyer WhatsApp',
          channel: 'whatsapp',
          status: 'open',
          agent_mode: 'auto_pilot',
          last_buyer_message: content,
          last_message_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (newConv) {
        conversationUuid = newConv.id
      }
    }

    // 5. Insert incoming message
    if (conversationUuid) {
      await admin.from('chatwoot_messages').insert({
        conversation_id: conversationUuid,
        chatwoot_message_id: payload.id || null,
        sender_type: 'buyer',
        sender_name: sender?.name || 'Buyer',
        content,
        message_type: 'incoming',
      })
    }

    // 6. Autonomous Agent Evaluation
    const evaluation = evaluateBuyerWhatsAppIntent(content, matchedBuyer)

    // Record AI reasoning in message log
    if (conversationUuid) {
      await admin.from('chatwoot_messages').insert({
        conversation_id: conversationUuid,
        sender_type: 'ai_agent',
        sender_name: 'Antigravity / Hermes Agent',
        content: evaluation.recommendedReply,
        message_type: 'outgoing',
        ai_suggested_reply: evaluation.recommendedReply,
        ai_reasoning: evaluation.reasoning,
        mcp_tool_calls: {
          intent: evaluation.intent,
          actionType: evaluation.actionType,
          confidence: evaluation.confidence,
          metadata: evaluation.metadata || null,
        },
      })
    }

    // 7. Dispatch Response or Notify
    if (currentAgentMode === 'auto_pilot') {
      if (evaluation.actionType === 'reply_immediately') {
        // Send reply directly to WhatsApp via Chatwoot
        await sendChatwootMessage(chatwootConvId, evaluation.recommendedReply, 'outgoing')

        // Log audit
        await admin.from('mcp_audit_logs').insert({
          conversation_id: conversationUuid,
          tool_name: 'htrn_chatwoot_auto_reply',
          tool_args: { intent: evaluation.intent, buyer_phone: rawPhone },
          tool_result: { sent: true, replyLength: evaluation.recommendedReply.length },
          status: 'success',
          execution_note: evaluation.reasoning,
        })
      } else {
        // High stakes / PO / Large Volume -> Send private internal note to Chatwoot for Pak Agung
        const internalNote =
          `🤖 [HTRN AI AGENTIC ADVICE]\n` +
          `Intent: ${evaluation.intent.toUpperCase()} (Confidence: ${(evaluation.confidence * 100).toFixed(0)}%)\n` +
          `Alasan: ${evaluation.reasoning}\n\n` +
          `Draf balasan yang disiapkan:\n` +
          `"${evaluation.recommendedReply}"\n\n` +
          `Silakan tinjau dan kirim langsung dari Chatwoot app.`

        await sendChatwootMessage(chatwootConvId, internalNote, 'private_note')

        await admin.from('mcp_audit_logs').insert({
          conversation_id: conversationUuid,
          tool_name: 'htrn_chatwoot_require_approval',
          tool_args: { intent: evaluation.intent, buyer_phone: rawPhone },
          tool_result: { privateNoteSent: true },
          status: 'success',
          execution_note: 'Intervensi Pak Agung diperlukan untuk konfirmasi order / penawaran volume besar.',
        })
      }
    }

    // 8. If buyer is matched, record interaction in HTRN CRM
    if (matchedBuyer) {
      const today = new Date().toISOString().split('T')[0]
      const updatedNotes = encodeWhatsAppStatus(matchedBuyer.notes, 'replied', today)
      await admin
        .from('buyers')
        .update({
          notes: `${updatedNotes}\n[Chatwoot ${today}]: Buyer mengirim pesan WhatsApp (${evaluation.intent})`,
        })
        .eq('id', matchedBuyer.id)
    }

    return NextResponse.json({
      success: true,
      handled: true,
      intent: evaluation.intent,
      mode: currentAgentMode,
      action: evaluation.actionType,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error'
    console.error('[Chatwoot Webhook] Error processing event:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'active',
    endpoint: 'HTRN Chatwoot Autonomous WhatsApp Webhook',
    timestamp: new Date().toISOString(),
  })
}
