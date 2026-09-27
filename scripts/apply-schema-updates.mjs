import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

function parseEnv(path) {
  const content = fs.readFileSync(path, 'utf8')
  const env = {}
  content.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const idx = trimmed.indexOf('=')
    if (idx > -1) {
      const k = trimmed.slice(0, idx).trim()
      let v = trimmed.slice(idx + 1).trim()
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1)
      if (v.startsWith("'") && v.endsWith("'")) v = v.slice(1, -1)
      env[k] = v
    }
  })
  return env
}

async function main() {
  const env = parseEnv('.env.local')
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  console.log('Connecting to Supabase at:', env.NEXT_PUBLIC_SUPABASE_URL)

  // 1. Update currency to IDR for all buyers
  const { data: updatedBuyers, error: bErr } = await supabase
    .from('buyers')
    .update({ currency: 'IDR' })
    .neq('currency', 'IDR')
    .select('id, company_name')

  if (bErr) {
    console.error('Error updating buyers currency:', bErr)
  } else {
    console.log(`Updated ${updatedBuyers?.length ?? 0} buyers to IDR currency.`)
  }

  // 2. Check if is_test exists on quotations
  const { data: sampleQuo, error: qErr } = await supabase
    .from('quotations')
    .select('id, quo_number, is_test')
    .limit(1)

  if (qErr) {
    console.log('Notice on quotations.is_test:', qErr.message)
  } else {
    console.log('quotations.is_test column exists!', sampleQuo)
  }

  // 3. Mark demo/test quotations
  const { data: testQuos, error: tqErr } = await supabase
    .from('quotations')
    .update({ is_test: true })
    .or('quo_number.ilike.%001%,quo_number.ilike.%DEMO%,quo_number.ilike.%TEST%')
    .select('id, quo_number, is_test')

  if (!tqErr) {
    console.log(`Marked ${testQuos?.length ?? 0} quotations as test records.`)
  }

  // 4. Mark demo/test invoices
  const { data: testInvs, error: tiErr } = await supabase
    .from('invoices')
    .update({ is_test: true })
    .or('invoice_number.ilike.%001%,invoice_number.ilike.%DEMO%,invoice_number.ilike.%TEST%')
    .select('id, invoice_number, is_test')

  if (!tiErr) {
    console.log(`Marked ${testInvs?.length ?? 0} invoices as test records.`)
  }
}

main().catch(console.error)
