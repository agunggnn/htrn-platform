import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { requireCrmAccess, crmCorsHeaders } from '@/lib/api-auth'

export async function GET(request: Request) {
  try {
    const authError = await requireCrmAccess(request)
    if (authError) return authError

    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')?.trim().toLowerCase()
    const query = searchParams.get('query')?.trim().toLowerCase()

    if (!email && !query) {
      return NextResponse.json(
        { error: 'Parameter email atau query wajib disertakan' },
        { status: 400, headers: crmCorsHeaders(request) }
      )
    }

    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let buyerData = null

    if (email) {
      // Direct email match
      const { data } = await admin
        .from('buyers')
        .select('*')
        .ilike('email', email)
        .limit(1)

      if (data && data.length > 0) {
        buyerData = data[0]
      } else {
        // Domain match (e.g. buyer@company.com -> company)
        const domain = email.split('@')[1]
        if (domain && !['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'].includes(domain)) {
          const domainName = domain.split('.')[0]
          const { data: domainMatches } = await admin
            .from('buyers')
            .select('*')
            .ilike('company_name', `%${domainName}%`)
            .limit(1)

          if (domainMatches && domainMatches.length > 0) {
            buyerData = domainMatches[0]
          }
        }
      }
    }

    if (!buyerData && query) {
      const { data: nameMatches } = await admin
        .from('buyers')
        .select('*')
        .or(`company_name.ilike.%${query}%,contact_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(1)

      if (nameMatches && nameMatches.length > 0) {
        buyerData = nameMatches[0]
      }
    }

    if (!buyerData) {
      return NextResponse.json(
        { found: false, message: 'Buyer tidak ditemukan di database HTRN' },
        { headers: crmCorsHeaders(request) }
      )
    }

    // Fetch recent quotations for this buyer
    const { data: quotations } = await admin
      .from('quotations')
      .select('id, quo_number, status, total_amount, valid_until, created_at')
      .eq('buyer_id', buyerData.id)
      .order('created_at', { ascending: false })
      .limit(3)

    return NextResponse.json(
      {
        found: true,
        buyer: {
          id: buyerData.id,
          company_name: buyerData.company_name,
          contact_name: buyerData.contact_name,
          email: buyerData.email,
          phone: buyerData.phone,
          country: buyerData.country || 'Indonesia',
          currency: buyerData.currency || 'IDR',
          pipeline_stage: buyerData.pipeline_stage || 'target_outreach',
          tier: buyerData.tier || 'tier_1',
          product_interest: buyerData.product_interest || 'Bawang Merah Goreng',
          gacoan_score: buyerData.gacoan_score || 90,
          created_at: buyerData.created_at,
        },
        quotations: quotations || [],
      },
      { headers: crmCorsHeaders(request) }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500, headers: crmCorsHeaders(request) })
  }
}

export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: crmCorsHeaders(request),
  })
}
