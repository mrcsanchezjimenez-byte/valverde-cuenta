import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * Panel de gestión (dirección y entidades). Es una web aparte de la app: nunca va dentro
 * del paquete nativo. En producción la sirve el propio servidor en /gestion/.
 */
// En la demostración de GitHub Pages el panel va dentro de la app: /valverde-cuenta/gestion/
const base = process.env.VITE_BASE_GESTION ?? '/gestion/'
const salida = process.env.VITE_SALIDA_GESTION ?? '../dist-gestion'

export default defineConfig({
  root: 'gestion',
  base,
  plugins: [react()],
  build: { outDir: salida, emptyOutDir: true },
  server: {
    port: 5274,
    strictPort: true,
    proxy: { '/api': 'http://127.0.0.1:8787' },
  },
})
