export function registerSW() {
  if (!('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => {
        reg.addEventListener('updatefound', () => {
          const sw = reg.installing
          sw.addEventListener('statechange', () => {
            if (sw.state === 'installed' && navigator.serviceWorker.controller)
              console.log('[Cone] Nova versão disponível. Recarregue para atualizar.')
          })
        })
      })
      .catch(err => console.warn('[Cone] Service worker não registrado:', err))
  })
}
