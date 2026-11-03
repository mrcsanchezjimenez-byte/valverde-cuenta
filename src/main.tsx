import '@fontsource-variable/inter'
import '@fontsource-variable/lora'
import 'leaflet/dist/leaflet.css'
import './estilos.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
