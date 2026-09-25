/**
 * HTRN CRM Extension Background Service Worker
 */

const DEFAULT_API_BASE = 'https://app.haturan.com'

function syncDefaultEndpoint() {
  chrome.storage.local.get(['htrnApiBase'], (res) => {
    // If not set, or legacy localhost:3000, enforce https://app.haturan.com
    if (!res || !res.htrnApiBase || res.htrnApiBase === 'http://localhost:3000') {
      chrome.storage.local.set({
        htrnApiBase: DEFAULT_API_BASE,
      })
    }
  })
}

chrome.runtime.onInstalled.addListener(() => {
  syncDefaultEndpoint()
  console.log('HTRN B2B Sales CRM extension installed/updated successfully. Target endpoint: ' + DEFAULT_API_BASE)
})

chrome.runtime.onStartup.addListener(() => {
  syncDefaultEndpoint()
})
