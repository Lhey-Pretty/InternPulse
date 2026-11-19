import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

try {
  document.documentElement.classList.toggle('dark', localStorage.getItem('ip-theme') === 'dark')
} catch {
  // Keep the default light theme if browser storage is unavailable.
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
