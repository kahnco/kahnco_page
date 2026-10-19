import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './App.css'
import '../shared/design/tokens.css'
import '../shared/design/chrome.css'
import '../shared/design/prose.css'
import './styles/site.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
