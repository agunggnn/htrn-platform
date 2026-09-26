import { Metadata } from 'next'
import { getSecretMetadataList } from '@/lib/secrets-helper'
import { IntegrationsForm } from '@/components/settings/IntegrationsForm'
import Link from 'next/link'
import { ArrowLeft, ShieldCheck } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Integrasi & API Secret Vault | HTRN Platform',
  description: 'Kelola token Getcontact, Chatwoot WhatsApp, AI API, dan kredensial Hetzer Vault',
}

export default async function IntegrationsSettingsPage() {
  const secrets = await getSecretMetadataList()

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="mb-6">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Settings
        </Link>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: '#1a472a18' }}
          >
            <ShieldCheck className="w-5 h-5" style={{ color: '#1a472a' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Integrasi & API Secret Vault</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Konfigurasi token Getcontact, Chatwoot WhatsApp, AI LLM, dan kredensial aman di antarmuka web
            </p>
          </div>
        </div>
      </div>

      <IntegrationsForm initialSecrets={secrets} />
    </div>
  )
}
