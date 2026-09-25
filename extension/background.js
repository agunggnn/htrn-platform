/**
 * HTRN CRM Extension Background Service Worker
 */

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    htrnApiBase: 'http://localhost:3000',
  })
  console.log('HTRN B2B Sales CRM extension installed successfully.')
})
