/**
 * background.js — service worker (Manifest V3)
 * Minimal — no persistent state, no cookie access.
 */
chrome.runtime.onInstalled.addListener(() => {
  // Set default settings on install
  chrome.storage.local.get(['affiliateOsUrl', 'affiliateOsToken'], (result) => {
    if (!result.affiliateOsUrl) {
      chrome.storage.local.set({ affiliateOsUrl: 'http://localhost:3000' })
    }
    if (!result.affiliateOsToken) {
      // Generate a cryptographically random local token on first install
      const arr = new Uint8Array(24)
      crypto.getRandomValues(arr)
      const token = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
      chrome.storage.local.set({ affiliateOsToken: token })
    }
  })
})
