import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * Panel de gestión (dirección y entidades). Es una web aparte de la app: nunca va dentro
 * del paquete nativo. En producción la sirve el propio servidor en /gestion/.
 */
export default defineConfig({
  root: 'gestion',
  base: '/gestion/',
  plugins: [react()],
  build: { outDir: '../dist-gestion', emptyOutDir: true },
  server: {
    port: 5274,
    strictPort: true,
    proxy: { '/api': 'http://127.0.0.1:8787' },
  },
})
