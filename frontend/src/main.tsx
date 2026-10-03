import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { LangProvider } from './lib/i18n'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LangProvider><App /></LangProvider>
  </StrictMode>,
)

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => { navigator.serviceWorker.register("/sw.js").catch(() => {}) })
}
