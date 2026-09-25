/**
 * HTRN B2B Sales CRM - Gmail Content Script Bridge
 * Injects non-intrusive CRM intelligence, stage controllers, and AI drafting directly into Gmail.
 */

;(function () {
  'use strict'

  const DEFAULT_API_BASE = 'https://app.haturan.com'
  let apiBase = DEFAULT_API_BASE
  let currentDetectedEmail = null
  let currentBuyer = null
  let isMinimized = false

  // Load user API base preference if stored
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['htrnApiBase'], (res) => {
      if (res && res.htrnApiBase) apiBase = res.htrnApiBase
    })
  }

  // Create or retrieve container dock
  function getOrCreateDock() {
    let dock = document.getElementById('htrn-crm-dock')
    if (!dock) {
      dock = document.createElement('div')
      dock.id = 'htrn-crm-dock'
      document.body.appendChild(dock)
    }
    return dock
  }

  // Extract email of the active open thread in Gmail
  function detectActiveThreadEmail() {
    // 1. Selector for standard Gmail email addresses in thread headers
    const emailEls = document.querySelectorAll('span[email], [data-hovercard-id], .gD')
    for (const el of Array.from(emailEls)) {
      const email = el.getAttribute('email') || el.getAttribute('data-hovercard-id') || el.textContent
      if (email && email.includes('@') && !email.includes('me') && !email.includes('no-reply')) {
        // Exclude common google domains
        if (!email.endsWith('google.com')) {
          return email.trim().toLowerCase()
        }
      }
    }

    // 2. Fallback: check compose window recipient
    const recipientTag = document.querySelector('div[peoplekit-id] span[email], span[email]')
    if (recipientTag) {
      const email = recipientTag.getAttribute('email')
      if (email && email.includes('@')) return email.trim().toLowerCase()
    }

    return null
  }

  // Fetch buyer info from HTRN API
  async function lookupBuyer(email) {
    try {
      const res = await fetch(`${apiBase}/api/crm/lookup?email=${encodeURIComponent(email)}`, {
        credentials: 'include',
      })
      if (!res.ok) return null
      const data = await res.json()
      return data.found ? data.buyer : null
    } catch {
      return null
    }
  }

  // Insert text into Gmail's active compose box
  function insertIntoGmailCompose(text) {
    // Find active compose textarea
    const composeBox = document.querySelector('div[role="textbox"][g_editable="true"]') || document.activeElement
    if (composeBox && composeBox.getAttribute('role') === 'textbox') {
      composeBox.focus()
      // Use document.execCommand to preserve undo/redo history in Gmail
      document.execCommand('insertText', false, text)
    } else {
      // Copy to clipboard fallback
      navigator.clipboard.writeText(text)
      alert('Teks draf berhasil disalin ke clipboard! Buka jendela tulis (compose) Gmail dan tekan Ctrl+V.')
    }
  }

  // Render the Dock UI
  function renderDock() {
    const dock = getOrCreateDock()

    if (isMinimized) {
      dock.innerHTML = `
        <div class="htrn-pill-minimized" id="htrn-toggle-btn">
          <div class="htrn-status-pill"></div>
          <span>HTRN CRM ${currentBuyer ? `· ${currentBuyer.company_name.slice(0, 14)}...` : ''}</span>
        </div>
      `
      document.getElementById('htrn-toggle-btn').addEventListener('click', () => {
        isMinimized = false
        renderDock()
      })
      return
    }

    if (!currentDetectedEmail) {
      dock.innerHTML = `
        <div class="htrn-card">
          <div class="htrn-header">
            <div class="htrn-brand">
              <div class="htrn-logo-badge">H</div>
              <span class="htrn-title">HTRN B2B CRM</span>
            </div>
            <button id="htrn-min-btn" style="background:none;border:none;color:#fff;cursor:pointer;font-size:16px;">−</button>
          </div>
          <div class="htrn-body" style="text-align:center;padding:24px 16px;">
            <p style="color:#6b7280;font-size:12px;margin:0;">Buka thread email buyer di Gmail untuk melihat data CRM & draf balasan otomatis.</p>
          </div>
        </div>
      `
      attachCommonListeners()
      return
    }

    if (currentBuyer) {
      const b = currentBuyer
      const tierBadgeClass = b.tier === 'tier_2' ? 'htrn-badge-tier2' : 'htrn-badge-tier1'
      const tierLabel = b.tier === 'tier_2' ? 'Tier 2: Katering (Rp 155k)' : 'Tier 1: HORECA (Rp 165k)'

      dock.innerHTML = `
        <div class="htrn-card">
          <div class="htrn-header">
            <div class="htrn-brand">
              <div class="htrn-logo-badge">H</div>
              <span class="htrn-title">HTRN B2B CRM</span>
            </div>
            <button id="htrn-min-btn" style="background:none;border:none;color:#fff;cursor:pointer;font-size:16px;">−</button>
          </div>
          <div class="htrn-body">
            <div>
              <div class="htrn-company-title">${b.company_name}</div>
              <div class="htrn-contact-sub">${b.contact_name || 'PIC'} · ${b.email}</div>
              <div style="margin-top:6px;display:flex;gap:4px;">
                <span class="htrn-badge ${tierBadgeClass}">${tierLabel}</span>
                <span class="htrn-badge" style="background:#f3f4f6;color:#4b5563;">Gacoan: ${b.gacoan_score || 90}%</span>
              </div>
            </div>

            <div class="htrn-field-group">
              <label class="htrn-label">Pipeline Stage</label>
              <select id="htrn-stage-select" class="htrn-select">
                <option value="lead" ${b.pipeline_stage === 'lead' ? 'selected' : ''}>1. Lead Baru</option>
                <option value="target_outreach" ${b.pipeline_stage === 'target_outreach' ? 'selected' : ''}>2. Target Outreach</option>
                <option value="sample_sent" ${b.pipeline_stage === 'sample_sent' ? 'selected' : ''}>3. Sample Sent / Requested</option>
                <option value="quotation_sent" ${b.pipeline_stage === 'quotation_sent' ? 'selected' : ''}>4. Quotation Sent (SPH)</option>
                <option value="in_negotiation" ${b.pipeline_stage === 'in_negotiation' ? 'selected' : ''}>5. In Negotiation</option>
                <option value="won" ${b.pipeline_stage === 'won' ? 'selected' : ''}>6. Active Deal / Won</option>
                <option value="lost" ${b.pipeline_stage === 'lost' ? 'selected' : ''}>7. Closed / Lost</option>
              </select>
            </div>

            <div class="htrn-actions-grid">
              <button id="htrn-ai-draft-btn" class="htrn-btn htrn-btn-primary">
                <span>🪄 Draf Balasan AI B2B</span>
              </button>
              <button id="htrn-attach-tds-btn" class="htrn-btn htrn-btn-accent">
                <span>📑 Sisipkan Link TDS Spek</span>
              </button>
              <button id="htrn-log-sample-btn" class="htrn-btn htrn-btn-secondary">
                <span>📦 Tandai Sampel Terkirim</span>
              </button>
            </div>
            
            <div id="htrn-msg-status" style="font-size:11px;color:#059669;display:none;text-align:center;"></div>
          </div>
        </div>
      `

      // Stage change listener
      document.getElementById('htrn-stage-select').addEventListener('change', async (e) => {
        const newStage = e.target.value
        try {
          const res = await fetch(`${apiBase}/api/crm/stage`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ buyer_id: b.id, pipeline_stage: newStage }),
          })
          if (res.ok) {
            currentBuyer.pipeline_stage = newStage
            flashStatus('✓ Stage tersinkron ke HTRN!')
          }
        } catch {
          alert('Gagal update stage. Pastikan server htrn-platform aktif.')
        }
      })

      // AI Draft Button
      document.getElementById('htrn-ai-draft-btn').addEventListener('click', async () => {
        const btn = document.getElementById('htrn-ai-draft-btn')
        btn.innerHTML = '<span>Menyusun draf...</span>'
        try {
          const res = await fetch(`${apiBase}/api/crm/ai-assist`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              buyer_id: b.id,
              action: 'draft_reply',
            }),
          })
          const data = await res.json()
          if (data && data.draft && data.draft.body) {
            insertIntoGmailCompose(data.draft.body)
            flashStatus('✓ Draf AI disisipkan ke Gmail!')
          }
        } catch {
          alert('Gagal membuat draf AI.')
        } finally {
          btn.innerHTML = '<span>🪄 Draf Balasan AI B2B</span>'
        }
      })

      // TDS Attach button
      document.getElementById('htrn-attach-tds-btn').addEventListener('click', () => {
        const tdsUrl = `${apiBase}/api/pdf/spec-sheet/bawang-goreng`
        const text = `Lembar Spesifikasi Teknis (TDS) Resmi PT Haturan Spice Indonesia: ${tdsUrl}`
        insertIntoGmailCompose(text)
        flashStatus('✓ Link TDS disisipkan!')
      })

      // Sample log button
      document.getElementById('htrn-log-sample-btn').addEventListener('click', async () => {
        const select = document.getElementById('htrn-stage-select')
        select.value = 'sample_sent'
        select.dispatchEvent(new Event('change'))
        flashStatus('✓ Status diubah: Sample Sent!')
      })
    } else {
      // Email detected but not registered in CRM
      dock.innerHTML = `
        <div class="htrn-card">
          <div class="htrn-header">
            <div class="htrn-brand">
              <div class="htrn-logo-badge">H</div>
              <span class="htrn-title">HTRN B2B CRM</span>
            </div>
            <button id="htrn-min-btn" style="background:none;border:none;color:#fff;cursor:pointer;font-size:16px;">−</button>
          </div>
          <div class="htrn-body">
            <div>
              <div class="htrn-company-title" style="font-size:13px;word-break:break-all;">${currentDetectedEmail}</div>
              <div class="htrn-contact-sub">Belum terdaftar di CRM PT Haturan</div>
            </div>

            <button id="htrn-quick-add-btn" class="htrn-btn htrn-btn-primary">
              <span>+ Tambah ke HTRN CRM</span>
            </button>
            <div id="htrn-msg-status" style="font-size:11px;color:#059669;display:none;text-align:center;"></div>
          </div>
        </div>
      `

      document.getElementById('htrn-quick-add-btn').addEventListener('click', async () => {
        const btn = document.getElementById('htrn-quick-add-btn')
        btn.innerHTML = '<span>Menyimpan...</span>'
        try {
          const res = await fetch(`${apiBase}/api/crm/quick-lead`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              email: currentDetectedEmail,
              tier: 'tier_1',
              pipeline_stage: 'target_outreach',
            }),
          })
          const data = await res.json()
          if (data.success) {
            currentBuyer = data.buyer
            flashStatus('✓ Lead berhasil disimpan!')
            setTimeout(renderDock, 600)
          }
        } catch {
          alert('Gagal menyimpan lead ke HTRN.')
        }
      })
    }

    attachCommonListeners()
  }

  function attachCommonListeners() {
    const minBtn = document.getElementById('htrn-min-btn')
    if (minBtn) {
      minBtn.addEventListener('click', () => {
        isMinimized = true
        renderDock()
      })
    }
  }

  function flashStatus(text) {
    const el = document.getElementById('htrn-msg-status')
    if (el) {
      el.textContent = text
      el.style.display = 'block'
      setTimeout(() => {
        el.style.display = 'none'
      }, 3000)
    }
  }

  // Periodic poll to detect changes in active email thread
  async function checkEmailThread() {
    const detected = detectActiveThreadEmail()
    if (detected && detected !== currentDetectedEmail) {
      currentDetectedEmail = detected
      currentBuyer = await lookupBuyer(detected)
      renderDock()
    } else if (!detected && currentDetectedEmail) {
      // Left thread
      currentDetectedEmail = null
      currentBuyer = null
      renderDock()
    }
  }

  // Initialize
  setInterval(checkEmailThread, 1500)
  renderDock()
})()
