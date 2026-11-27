import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { varios } from './bd.ts'
import { config } from './config.ts'

export interface Correo {
  para: string
  asunto: string
  texto: string
}

/** Últimos correos «enviados»: lo usan las pruebas para leer los enlaces. */
export const bandeja: Correo[] = []

/**
 * En local los correos no salen: se guardan en servidor/datos/correos y se ven en la consola.
 * Para producción se conectará un proveedor (Fase 5, ver docs/fases.md).
 */
export async function enviarCorreo(correo: Correo) {
  bandeja.push(correo)
  if (bandeja.length > 50) bandeja.shift()
  if (process.env.VC_PRUEBAS) return
  if (config.produccion) {
    console.error('[correo] No hay proveedor de correo configurado: no se ha enviado', correo.asunto)
    return
  }
  const carpeta = join(config.datos, 'correos')
  mkdirSync(carpeta, { recursive: true })
  const nombre = `${new Date().toISOString().replace(/[:.]/g, '-')}.txt`
  writeFileSync(join(carpeta, nombre), `Para: ${correo.para}\nAsunto: ${correo.asunto}\n\n${correo.texto}\n`)
  console.log(`[correo] Para ${correo.para}: ${correo.asunto}\n${correo.texto}\n`)
}

export const enlaceGestion = (ruta: string) => `${config.urlGestion}#${ruta}`

/** Aviso a todo el equipo de dirección (cosas nuevas que revisar). */
export async function avisarDireccion(asunto: string, texto: string) {
  const equipo = varios<{ email: string }>("SELECT email FROM usuarios WHERE rol = 'direccion' AND activo = 1")
  await Promise.all(equipo.map((u) => enviarCorreo({ para: u.email, asunto, texto: `${texto}\n\nRevísalo en ${enlaceGestion('/pendientes')}` })))
}
