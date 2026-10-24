import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/manrope'
import '@fontsource-variable/syne'
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
import './styles/main.css'
import './styles/public.css'
import './styles/admin.css'
import App from './App'

const container = document.getElementById('root')
if (!container) throw new Error('RH VISUALS could not find the root element.')

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
