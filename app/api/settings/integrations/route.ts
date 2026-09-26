import { NextResponse } from 'next/server'
import { requireUser, isDirectorUser, isStaffOrDirector, tokensMatch } from '@/lib/api-auth'
import {
  getSecretMetadataList,
  saveSecret,
  getSecret,
  KNOWN_SECRET_DEFINITIONS,
} from '@/lib/secrets-helper'

export async function GET() {
  try {
    const auth = await requireUser()
    if (auth.response) return auth.response
    if (!isStaffOrDirector(auth.user)) {
      return NextResponse.json(
        { error: 'Akses Ditolak: Hanya staf internal atau direksi yang berhak melihat integrasi.' },
        { status: 403 }
      )
    }

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
    if (!isStaffOrDirector(auth.user)) {
      return NextResponse.json(
        { error: 'Akses Ditolak: Hanya staf internal atau direksi yang berhak mengonfigurasi integrasi.' },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Determine if DIRECTOR_PIN is being modified
    const isUpdatingDirectorPin =
      body.key === 'DIRECTOR_PIN' ||
      (body.secrets && typeof body.secrets === 'object' && 'DIRECTOR_PIN' in body.secrets)

    if (isUpdatingDirectorPin) {
      // 1. Role verification: Only confirmed Director/Admin
      if (!isDirectorUser(auth.user)) {
        return NextResponse.json(
          {
            error:
              'Akses Ditolak: Perubahan DIRECTOR_PIN hanya dapat dilakukan oleh Direktur / Administrator resmi.',
          },
          { status: 403 }
        )
      }

      // 2. Existing PIN verification (if already configured)
      const existingPin = (await getSecret('DIRECTOR_PIN')) || process.env.DIRECTOR_PIN
      if (existingPin) {
        const currentPin = String(
          body.current_director_pin || request.headers.get('x-director-pin') || ''
        ).trim()

        if (!currentPin || !tokensMatch(existingPin, currentPin)) {
          return NextResponse.json(
            {
              error:
                'Otorisasi Gagal: PIN Direktur saat ini (current PIN) tidak valid atau belum disertakan.',
            },
            { status: 403 }
          )
        }
      }

      // 3. New PIN format check
      const newPin = String(body.key === 'DIRECTOR_PIN' ? body.value : body.secrets?.DIRECTOR_PIN || '').trim()
      if (newPin && newPin.length < 6) {
        return NextResponse.json(
          { error: 'PIN Direktur baru harus minimal 6 karakter.' },
          { status: 400 }
        )
      }
    }

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
