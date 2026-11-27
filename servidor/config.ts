import { randomBytes } from 'node:crypto'
import { appendFileSync, existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export const RAIZ = resolve(import.meta.dirname, '..')
const ARCHIVO_ENV = resolve(RAIZ, '.env')

const produccion = process.env.NODE_ENV === 'production'

/**
 * En local, la primera vez se crea un .env con una clave aleatoria para cifrar los secretos
 * de doble factor. En producción la clave la pone quien despliega y nunca se genera sola.
 */
if (!produccion && !process.env.VC_CLAVE && !process.env.VC_PRUEBAS) {
  const actual = existsSync(ARCHIVO_ENV) ? readFileSync(ARCHIVO_ENV, 'utf8') : ''
  if (!/^VC_CLAVE=/m.test(actual)) {
    appendFileSync(ARCHIVO_ENV, `${actual && !actual.endsWith('\n') ? '\n' : ''}VC_CLAVE=${randomBytes(32).toString('base64')}\n`)
    console.log('[config] Creado .env con una clave nueva. No la subas nunca al repositorio.')
  }
}
if (existsSync(ARCHIVO_ENV) && !process.env.VC_PRUEBAS) process.loadEnvFile(ARCHIVO_ENV)

function obligatoria(nombre: string) {
  const v = process.env[nombre]
  if (!v) throw new Error(`Falta la variable ${nombre}. Mira docs/seguridad.md.`)
  return v
}

const urlGestion = process.env.VC_URL_GESTION ?? 'http://localhost:5274/gestion/'

export const config = {
  produccion,
  puerto: Number(process.env.VC_PUERTO ?? 8787),
  /** Carpeta con la base de datos, las copias y (en local) los correos. Fuera del repositorio en producción. */
  datos: resolve(RAIZ, process.env.VC_DATOS ?? 'servidor/datos'),
  /** Clave de 32 bytes en base64 para cifrar secretos guardados. */
  clave: () => Buffer.from(obligatoria('VC_CLAVE'), 'base64'),
  /** Dirección pública del panel de gestión; se usa en los enlaces de los correos. */
  urlGestion,
  origenGestion: new URL(urlGestion).origin,
  /** Dirección pública de la app (web). Va dentro de los QR de las placas: cambiarla obliga a reimprimirlas. */
  urlApp: process.env.VC_URL_APP ?? 'http://localhost:5273/valverde-cuenta/',
  /** Solo si el servidor está detrás de un proxy de confianza se lee la IP de X-Forwarded-For. */
  detrasDeProxy: process.env.VC_PROXY === '1',
}

if (config.produccion && config.clave().length !== 32) throw new Error('VC_CLAVE debe tener 32 bytes en base64')
