/**
 * HTRN B2B CRM - WhatsApp Web Auto-Sync Engine
 * Monitors web.whatsapp.com to automatically detect whether a phone number
 * has an active WhatsApp account or triggers an invalid number modal.
 * Automatically synchronizes verification status to HTRN Platform backend.
 */

(function () {
  'use strict'

  const DEFAULT_API_BASE = 'https://app.haturan.com'
  let currentPhone = null
  let isHandled = false
  let badgeEl = null
  let observer = null
  let pollInterval = null

  function getApiBase(callback) {
    chrome.storage.local.get(['htrnApiBase'], (res) => {
      const base = res?.htrnApiBase || DEFAULT_API_BASE
      callback(base.replace(/\/+$/, ''))
    })
  }

  function getPhoneFromUrl() {
    try {
      const url = new URL(window.location.href)
      const phoneParam = url.searchParams.get('phone')
      if (phoneParam) {
        return phoneParam.replace(/\D/g, '')
      }
    } catch {
      // ignore
    }
    const match = window.location.href.match(/[?&]phone=(\d+)/)
    return match ? match[1] : null
  }

  function createFloatingBadge() {
    if (document.getElementById('htrn-wa-sync-badge')) return

    badgeEl = document.createElement('div')
    badgeEl.id = 'htrn-wa-sync-badge'
    badgeEl.style.cssText = `
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 999999;
      background: #0f172a;
      color: #ffffff;
      padding: 8px 14px;
      border-radius: 9999px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 11px;
      font-weight: 600;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
      border: 1px solid rgba(255, 255, 255, 0.15);
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.3s ease;
      pointer-events: none;
    `
    badgeEl.innerHTML = `
      <span style="font-size: 13px;">🛡️</span>
      <span>HTRN CRM: Sinkronisasi WhatsApp Siap</span>
    `
    document.body.appendChild(badgeEl)
  }

  function updateBadge(type, message) {
    if (!badgeEl) createFloatingBadge()
    if (!badgeEl) return

    badgeEl.style.opacity = '1'
    if (type === 'checking') {
      badgeEl.style.background = '#0f172a'
      badgeEl.style.borderColor = '#334155'
      badgeEl.innerHTML = `
        <span style="display: inline-block; animation: spin 1s linear infinite;">⏳</span>
        <span>HTRN CRM: ${message}</span>
      `
    } else if (type === 'invalid') {
      badgeEl.style.background = '#991b1b'
      badgeEl.style.borderColor = '#f87171'
      badgeEl.innerHTML = `
        <span>🔴</span>
        <span>${message}</span>
      `
    } else if (type === 'active') {
      badgeEl.style.background = '#065f46'
      badgeEl.style.borderColor = '#34d399'
      badgeEl.innerHTML = `
        <span>✓</span>
        <span>${message}</span>
      `
      setTimeout(() => {
        if (badgeEl) {
          badgeEl.style.opacity = '0'
          setTimeout(() => badgeEl?.remove(), 500)
        }
      }, 5000)
    }
  }

  async function syncStatusToHtrn(phone, status, summary) {
    getApiBase(async (apiBase) => {
      try {
        console.log(`[HTRN Extension] Menyinkronkan nomor ${phone} dengan status: ${status} ke ${apiBase}`)
        const res = await fetch(`${apiBase}/api/crm/interaction`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone,
            channel: 'whatsapp',
            status,
            summary,
          }),
        })

        if (res.ok) {
          console.log(`[HTRN Extension] Sinkronisasi ${status} berhasil!`)
        } else {
          console.warn(`[HTRN Extension] Server mengembalikan status: ${res.status}`)
        }
      } catch (err) {
        console.error('[HTRN Extension] Gagal menyinkronkan status:', err)
      }
    })
  }

  function checkInvalidPopup() {
    // 1. Check inside modal / dialog elements
    const modals = document.querySelectorAll(
      'div[role="dialog"], div[data-animate-modal-popup="true"], [data-testid="popup-contents"], [data-testid="alert-dialog"]'
    )
    for (const m of modals) {
      const text = (m.innerText || '').toLowerCase()
      if (
        text.includes('phone number shared via url is invalid') ||
        text.includes('nomor telepon yang dibagikan melalui tautan tidak valid') ||
        text.includes('nomor telepon yang dibagikan melalui url tidak valid') ||
        (text.includes('tidak valid') && text.includes('nomor')) ||
        (text.includes('invalid') && text.includes('phone number'))
      ) {
        return true
      }
    }

    // 2. Check full body text as fallback
    const bodyText = (document.body.innerText || '').toLowerCase()
    if (
      bodyText.includes('phone number shared via url is invalid') ||
      bodyText.includes('nomor telepon yang dibagikan melalui tautan tidak valid') ||
      bodyText.includes('nomor telepon yang dibagikan melalui url tidak valid')
    ) {
      return true
    }

    return false
  }

  function checkActiveChat() {
    const mainChat = document.querySelector('#main')
    const composeBox = document.querySelector(
      'footer div[contenteditable="true"], div[data-testid="conversation-compose-box"], div[data-tab="10"]'
    )
    return !!(mainChat && composeBox)
  }

  function scanWhatsAppStatus() {
    if (isHandled || !currentPhone) return

    // 1. Detect if invalid phone popup appeared
    if (checkInvalidPopup()) {
      isHandled = true
      cleanup()
      updateBadge('invalid', `Nomor ${currentPhone} Bukan WhatsApp ✕ (Otomatis Disimpan ke Platform)`)
      syncStatusToHtrn(
        currentPhone,
        'not_registered',
        'Auto-sync via HTRN Chrome Extension: WhatsApp Web mendeteksi popup nomor tidak valid / tidak terdaftar di WhatsApp.'
      )
      return
    }

    // 2. Detect if active chat opened
    if (checkActiveChat()) {
      isHandled = true
      cleanup()
      updateBadge('active', `Nomor ${currentPhone} Terverifikasi WA Aktif ✓`)
      syncStatusToHtrn(
        currentPhone,
        'verified_active',
        'Auto-sync via HTRN Chrome Extension: Percakapan berhasil terbuka aktif di WhatsApp Web.'
      )
      return
    }
  }

  function cleanup() {
    if (observer) {
      observer.disconnect()
      observer = null
    }
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }
  }

  function initVerification() {
    const phone = getPhoneFromUrl()
    if (!phone || phone === currentPhone) return

    currentPhone = phone
    isHandled = false

    createFloatingBadge()
    updateBadge('checking', `Memeriksa nomor +${phone}...`)

    // Start DOM Mutation Observer
    cleanup()
    observer = new MutationObserver(() => {
      scanWhatsAppStatus()
    })
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })

    // Also run periodic poll for 25 seconds
    let attempts = 0
    pollInterval = setInterval(() => {
      attempts++
      scanWhatsAppStatus()
      if (attempts >= 50) {
        // 25 seconds timeout
        cleanup()
      }
    }, 500)
  }

  // Monitor URL changes (SPA)
  let lastUrl = location.href
  new MutationObserver(() => {
    const url = location.href
    if (url !== lastUrl) {
      lastUrl = url
      initVerification()
    }
  }).observe(document, { subtree: true, childList: true })

  window.addEventListener('popstate', initVerification)

  // Initial check
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVerification)
  } else {
    initVerification()
  }
})()
