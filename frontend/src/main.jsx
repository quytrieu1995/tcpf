import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { registerServiceWorker } from './utils/serviceWorkerRegistration'

// Register service worker for push notifications
// Works in both dev and prod, but you can restrict to PROD if needed
registerServiceWorker().catch(console.error)

// Global error handler to catch and suppress errors from browser extensions
window.addEventListener('error', (event) => {
  // Suppress errors from browser extensions (share-modal, etc.)
  if (event.filename && (
    event.filename.includes('share-modal') ||
    event.filename.includes('extension://') ||
    event.filename.includes('chrome-extension://') ||
    event.filename.includes('moz-extension://')
  )) {
    event.preventDefault()
    console.warn('Suppressed error from browser extension:', event.filename)
    return false
  }
}, true)

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  // Suppress rejections from browser extensions
  if (event.reason && typeof event.reason === 'string' && event.reason.includes('share-modal')) {
    event.preventDefault()
    console.warn('Suppressed unhandled rejection from browser extension')
    return false
  }
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

