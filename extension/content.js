/**
 * content.js — Add to Affiliate OS
 * Injected on Shopee product pages.
 * Reads ONLY visible DOM data — no cookies, no session, no aggressive scraping.
 */

;(function () {
  'use strict'

  /**
   * Try to extract product data from the visible page DOM.
   * Uses heuristics; Shopee DOM structure may change over time.
   */
  function extractProduct() {
    const url = window.location.href
    const title =
      document.querySelector('._44qnta')?.textContent?.trim() ||          // Shopee product title (class may vary)
      document.querySelector('[data-sqe="name"]')?.textContent?.trim() ||
      document.querySelector('h1')?.textContent?.trim() ||
      ''

    // Price: look for structured price elements
    const priceEl =
      document.querySelector('._3n5NQx') ||   // main price span
      document.querySelector('.pyzxvq.pw3J3G') || // Shopee product price (2026 layout)
      document.querySelector('.PcnXj1') ||        // Shopee product price fallback
      document.querySelector('[class*="price"]')
    const priceText = priceEl?.textContent?.replace(/[^0-9,.]/g, '').replace(',', '.') || ''
    const price = parseFloat(priceText) || 0

    // Main product image
    const imgEl =
      document.querySelector('._3XEBOt img') ||
      document.querySelector('[class*="mainImage"] img') ||
      document.querySelector('._3cUJSf img') ||
      document.querySelector('img[class*="product"]') ||
      document.querySelector('img[alt^="Imagem do produto"]')
    const imageUrl =
      imgEl?.currentSrc ||
      imgEl?.src ||
      document.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
      ''

    return { title, price, imageUrl, url }
  }

  // Listen for messages from the popup
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'EXTRACT_PRODUCT') {
      sendResponse({ product: extractProduct() })
    }
    return true // keep channel open for async
  })
})()
