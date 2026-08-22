/**
 * popup.js — Add to Affiliate OS
 * Handles product extraction, form management, and sending to the local API.
 */
;(function () {
  'use strict'

  let extractedProduct = null
  let settings = { url: 'http://localhost:3000', token: '' }

  // DOM refs
  const productImg = document.getElementById('productImg')
  const productTitle = document.getElementById('productTitle')
  const productPrice = document.getElementById('productPrice')
  const affiliateUrlInput = document.getElementById('affiliateUrl')
  const commissionRateInput = document.getElementById('commissionRate')
  const subIdInput = document.getElementById('subId')
  const categoryInput = document.getElementById('category')
  const addBtn = document.getElementById('addBtn')
  const statusMsg = document.getElementById('statusMsg')
  const notShopee = document.getElementById('notShopee')
  const mainForm = document.getElementById('mainForm')
  const settingsToggle = document.getElementById('settingsToggle')
  const settingsSection = document.getElementById('settingsSection')
  const settingsUrlInput = document.getElementById('settingsUrl')
  const settingsTokenInput = document.getElementById('settingsToken')
  const saveSettingsBtn = document.getElementById('saveSettingsBtn')

  function showMsg(text, type = 'warn') {
    statusMsg.textContent = text
    statusMsg.className = `msg ${type}`
  }

  function clearMsg() {
    statusMsg.textContent = ''
    statusMsg.className = ''
  }

  // Load settings from storage
  chrome.storage.local.get(['affiliateOsUrl', 'affiliateOsToken'], (result) => {
    settings.url = result.affiliateOsUrl || 'http://localhost:3000'
    // onInstalled normally creates this token. Keep the popup resilient when
    // Chrome reloads an unpacked extension without firing that lifecycle hook.
    if (!result.affiliateOsToken) {
      const bytes = new Uint8Array(24)
      crypto.getRandomValues(bytes)
      settings.token = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
      chrome.storage.local.set({ affiliateOsToken: settings.token })
    } else {
      settings.token = result.affiliateOsToken
    }
    settingsUrlInput.value = settings.url
    settingsTokenInput.value = settings.token
  })

  // Settings toggle
  settingsToggle.addEventListener('click', () => {
    settingsSection.classList.toggle('open')
  })

  saveSettingsBtn.addEventListener('click', () => {
    const url = settingsUrlInput.value.trim().replace(/\/$/, '')
    const token = settingsTokenInput.value.trim()
    if (!url) { showMsg('URL inválida', 'error'); return }
    chrome.storage.local.set({ affiliateOsUrl: url, affiliateOsToken: token }, () => {
      settings.url = url
      settings.token = token
      showMsg('✓ Configurações salvas', 'success')
      setTimeout(clearMsg, 2000)
    })
  })

  // Check if current tab is Shopee product page and extract product data
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0]
    const url = tab?.url || ''
    const isShopee = /shopee\.com\.br/.test(url)

    if (!isShopee) {
      notShopee.style.display = 'block'
      // Keep settings visible when the popup is opened as its own page. This
      // is the recovery path for configuring the local token before visiting
      // a Shopee product.
      productTitle.textContent = 'Configure o token e abra um produto Shopee'
      addBtn.disabled = true
      return
    }

    // Pre-fill URL from current tab
    affiliateUrlInput.placeholder = 'Cole o link de afiliado Shopee aqui'

    // Ask content script to extract product data
    chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_PRODUCT' }, (response) => {
      if (chrome.runtime.lastError || !response?.product) {
        // Content script may not be injected yet (e.g., page still loading)
        productTitle.textContent = 'Preencha os dados manualmente'
        return
      }

      const p = response.product
      extractedProduct = p

      if (p.title) productTitle.textContent = p.title
      if (p.price > 0) productPrice.textContent = `R$ ${p.price.toFixed(2).replace('.', ',')}`
      if (p.imageUrl) {
        productImg.src = p.imageUrl
        productImg.onerror = () => { productImg.src = '' }
      }
    })
  })

  // Add to Affiliate OS
  addBtn.addEventListener('click', async () => {
    clearMsg()

    const affiliateUrl = affiliateUrlInput.value.trim()
    if (!affiliateUrl) {
      showMsg('Cole o link de afiliado primeiro', 'error')
      affiliateUrlInput.focus()
      return
    }

    const commissionRate = parseFloat(commissionRateInput.value) || 8
    const subId = subIdInput.value.trim()
    const category = categoryInput.value.trim() || 'geral'

    // Build title from extracted data or fallback
    const title = extractedProduct?.title || 'Produto Shopee'
    const price = extractedProduct?.price || 0
    const imageUrl = extractedProduct?.imageUrl || ''
    const productUrl = extractedProduct?.url || ''

    // IMPORTANTE: sub_id NÃO é adicionado ao link de afiliado automaticamente.
    // O link de afiliado deve ser gerado pelo Portal Shopee Affiliate já com o sub_id correto.
    // O sub_id é salvo apenas como metadado em raw_data.sub_id para rastreamento interno.
    addBtn.disabled = true
    addBtn.textContent = 'Enviando...'

    try {
      const endpoint = `${settings.url}/api/extension/add-product`
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Extension-Token': settings.token,
        },
        body: JSON.stringify({
          title,
          price,
          commissionRate,
          affiliateUrl,        // link exato colado pelo usuário — nunca modificado
          imageUrl,
          url: productUrl,
          category,
          subId: subId || undefined,  // salvo em raw_data, não no URL
          source: 'chrome_extension',
        }),
      })

      const data = await resp.json()
      if (resp.status === 409 && data.duplicate) {
        showMsg('⚠️ Produto já cadastrado com esse link.', 'warn')
        addBtn.disabled = false
        addBtn.textContent = '➕ Adicionar ao Affiliate OS'
        return
      }
      if (!resp.ok) throw new Error(data.error || `HTTP ${resp.status}`)

      showMsg('✅ Produto adicionado! Acesse /products para ver.', 'success')
      addBtn.textContent = '✓ Adicionado!'
      setTimeout(() => {
        addBtn.disabled = false
        addBtn.textContent = '➕ Adicionar ao Affiliate OS'
        clearMsg()
      }, 3000)
    } catch (err) {
      showMsg(`Erro: ${String(err).replace('Error: ', '')}`, 'error')
      addBtn.disabled = false
      addBtn.textContent = '➕ Adicionar ao Affiliate OS'
    }
  })
})()
