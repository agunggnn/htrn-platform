import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/api-auth'
import {
  getSecretMetadataList,
  saveSecret,
  KNOWN_SECRET_DEFINITIONS,
} from '@/lib/secrets-helper'

export async function GET() {
  try {
    const auth = await requireUser()
    if (auth.response) return auth.response

    const secrets = await getSecretMetadataList()

    return NextResponse.json({
      success: true,
      secrets,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Gagal memuat metadata kredensial'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireUser()
    if (auth.response) return auth.response

    const body = await request.json()

    // Support single save or bulk save
    // Format 1: { key: string, value: string }
    // Format 2: { secrets: Record<string, string> }
    const savedKeys: string[] = []

    if (body.key && typeof body.value === 'string') {
      const { key, value } = body
      const def = KNOWN_SECRET_DEFINITIONS.find((d) => d.key === key)
      if (!def) {
        return NextResponse.json({ error: `Kunci kredensial tidak valid: ${key}` }, { status: 400 })
      }

      if (value.trim() !== '') {
        await saveSecret(key, value.trim(), def.category, def.description)
        savedKeys.push(key)
      }
    } else if (body.secrets && typeof body.secrets === 'object') {
      const entries = Object.entries(body.secrets as Record<string, string>)
      for (const [key, value] of entries) {
        if (typeof value === 'string' && value.trim() !== '') {
          const def = KNOWN_SECRET_DEFINITIONS.find((d) => d.key === key)
          if (def) {
            await saveSecret(key, value.trim(), def.category, def.description)
            savedKeys.push(key)
          }
        }
      }
    } else {
      return NextResponse.json(
        { error: 'Format data tidak valid. Sertakan key dan value atau object secrets.' },
        { status: 400 }
      )
    }

    const updatedMetadata = await getSecretMetadataList()

    return NextResponse.json({
      success: true,
      message: `${savedKeys.length} kredensial berhasil disimpan dengan proteksi Hetzer Vault.`,
      savedKeys,
      secrets: updatedMetadata,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Gagal menyimpan kredensial'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
