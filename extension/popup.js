document.addEventListener('DOMContentLoaded', () => {
  const apiInput = document.getElementById('api-base-input')
  const saveBtn = document.getElementById('save-btn')
  const statusEl = document.getElementById('conn-status')

  const DEFAULT_API_BASE = 'https://app.haturan.com'

  chrome.storage.local.get(['htrnApiBase'], (res) => {
    let target = DEFAULT_API_BASE
    if (res && res.htrnApiBase && res.htrnApiBase !== 'http://localhost:3000') {
      target = res.htrnApiBase
    } else {
      chrome.storage.local.set({ htrnApiBase: DEFAULT_API_BASE })
    }
    apiInput.value = target
    checkConnection(target)
  })

  const btnCloud = document.getElementById('btn-cloud')
  const btnLocal = document.getElementById('btn-local')

  if (btnCloud) {
    btnCloud.addEventListener('click', () => {
      apiInput.value = DEFAULT_API_BASE
      saveAndCheck(DEFAULT_API_BASE)
    })
  }

  if (btnLocal) {
    btnLocal.addEventListener('click', () => {
      apiInput.value = 'http://localhost:3000'
      saveAndCheck('http://localhost:3000')
    })
  }

  function saveAndCheck(val) {
    const cleanVal = val.trim().replace(/\/$/, '')
    chrome.storage.local.set({ htrnApiBase: cleanVal }, () => {
      saveBtn.textContent = '✓ Tersimpan!'
      setTimeout(() => {
        saveBtn.textContent = 'Simpan Pengaturan'
      }, 1500)
      checkConnection(cleanVal)
    })
  }

  saveBtn.addEventListener('click', () => {
    saveAndCheck(apiInput.value)
  })

  async function checkConnection(url) {
    statusEl.textContent = 'Memeriksa koneksi...'
    try {
      const res = await fetch(`${url}/api/crm/snippets`, {
        headers: { 'x-htrn-client': 'gmail_extension' },
      })
      if (res.ok) {
        const isCloud = url.includes('app.haturan.com')
        statusEl.textContent = isCloud ? 'Terhubung (Cloud app.haturan.com)' : 'Terhubung (Local)'
      } else {
        statusEl.textContent = `Server merespons ${res.status}`
      }
    } catch {
      statusEl.textContent = 'Offline / Gagal terhubung'
    }
  }
})
