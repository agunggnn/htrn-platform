document.addEventListener('DOMContentLoaded', () => {
  const apiInput = document.getElementById('api-base-input')
  const saveBtn = document.getElementById('save-btn')
  const statusEl = document.getElementById('conn-status')

  chrome.storage.local.get(['htrnApiBase'], (res) => {
    if (res && res.htrnApiBase) {
      apiInput.value = res.htrnApiBase
    }
    checkConnection(apiInput.value)
  })

  const btnCloud = document.getElementById('btn-cloud')
  const btnLocal = document.getElementById('btn-local')

  if (btnCloud) {
    btnCloud.addEventListener('click', () => {
      apiInput.value = 'https://app.haturan.com'
      checkConnection('https://app.haturan.com')
    })
  }

  if (btnLocal) {
    btnLocal.addEventListener('click', () => {
      apiInput.value = 'http://localhost:3000'
      checkConnection('http://localhost:3000')
    })
  }

  saveBtn.addEventListener('click', () => {
    const val = apiInput.value.trim().replace(/\/$/, '')
    chrome.storage.local.set({ htrnApiBase: val }, () => {
      saveBtn.textContent = '✓ Tersimpan!'
      setTimeout(() => {
        saveBtn.textContent = 'Simpan Pengaturan'
      }, 1500)
      checkConnection(val)
    })
  })

  async function checkConnection(url) {
    try {
      const res = await fetch(`${url}/api/crm/snippets`)
      if (res.ok) {
        statusEl.textContent = 'Terhubung ke HTRN Server'
      } else {
        statusEl.textContent = 'Server merespons error'
      }
    } catch {
      statusEl.textContent = 'Server offline / tidak terjangkau'
    }
  }
})
