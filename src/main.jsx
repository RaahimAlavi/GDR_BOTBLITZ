import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// An open kiosk may reference chunks from the previous deployment.
window.addEventListener('vite:preloadError', event => {
  if (navigator.onLine === false || document.querySelector('.result-shell, .game-screen')) return
  const address = event.payload?.message?.match(/https?:\/\/[^\s]+/)?.[0]
  if (!address) return
  // Confirm an obsolete chunk instead of reloading for every network failure.
  try {
    const url = new URL(address)
    if (url.origin !== location.origin) return
    void fetch(url, {method:'HEAD', cache:'no-store'}).then(response => {
      if ((response.status === 404 || (response.status === 200 && response.headers.get('content-type')?.includes('text/html'))) &&
        !document.querySelector('.result-shell, .game-screen')) window.location.reload()
    }).catch(() => {})
  } catch { /* The page boundary supplies a retry for other load failures. */ }
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
