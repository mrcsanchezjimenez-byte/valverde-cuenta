import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { serve } from '@hono/node-server'
import { crearApp } from './app.ts'
import { iniciarBd, uno } from './bd.ts'
import { config } from './config.ts'
import { limpiarCaducados } from './seguridad/sesiones.ts'

mkdirSync(config.datos, { recursive: true })
iniciarBd(join(config.datos, 'valverde.db'))
limpiarCaducados()
setInterval(limpiarCaducados, 3600_000).unref()

const app = crearApp()
serve({ fetch: app.fetch, port: config.puerto, hostname: config.produccion ? '0.0.0.0' : '127.0.0.1' }, (info) => {
  console.log(`Servidor de Valverde Cuenta en http://localhost:${info.port}`)
  const equipo = uno<{ n: number }>("SELECT COUNT(*) AS n FROM usuarios WHERE rol = 'direccion'")?.n ?? 0
  if (!equipo) console.log('Aún no hay cuentas de dirección. Crea la primera con: npm run admin -- crear-direccion correo@ejemplo.es "Nombre"')
})
