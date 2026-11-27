import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Municipio } from '../../compartido/tipos.ts'
import { CENTRO_VALVERDE, distanciaKm } from '../../compartido/tipos.ts'
import { varios } from '../bd.ts'
import { fallo, ipDe, type Entorno } from '../contexto.ts'
import { eventosPublicos } from '../eventos.ts'
import { avisarInscripcion, cancelarPorCodigo, inscribir, verMiInscripcion } from '../inscripciones.ts'
import { permitir } from '../seguridad/limites.ts'
import { leer, nuevaInscripcion } from '../validacion.ts'

/**
 * Lo que lee la app sin cuenta. Solo lectura y solo datos publicados, así que se puede pedir
 * desde cualquier origen (app nativa, web de los QR, etc.) sin cookies.
 */
export const publico = new Hono<Entorno>()

// Sin cookies: cualquier origen puede leer y apuntarse (la app nativa, la web de los QR…).
publico.use(cors({ origin: '*', allowMethods: ['GET', 'POST'], allowHeaders: ['Content-Type'], credentials: false }))

publico.get('/eventos', (c) => {
  c.header('Cache-Control', 'public, max-age=60')
  return c.json(eventosPublicos())
})

publico.get('/municipios', (c) => {
  const filas = varios<{ id: number; nombre: string; lat: number; lng: number; activo: number; es_valverde: number }>(
    'SELECT * FROM municipios WHERE activo = 1 ORDER BY es_valverde DESC, nombre')
  return c.json(filas.map((m): Municipio => ({
    id: m.id, nombre: m.nombre, lat: m.lat, lng: m.lng, activo: true, esValverde: Boolean(m.es_valverde),
    distanciaKm: Math.round(distanciaKm(CENTRO_VALVERDE, m)),
  })))
})

// ——— Inscripciones (sin cuenta) ———

publico.post('/eventos/:slug/inscripciones', async (c) => {
  const ip = ipDe(c)
  const slug = c.req.param('slug')
  if (!permitir(`inscribir:${ip}`, 15, 3600_000) || !permitir(`inscribir:${ip}:${slug}`, 4, 3600_000)) {
    throw fallo(429, 'Demasiadas inscripciones seguidas desde esta conexión. Prueba más tarde.')
  }
  const d = await leer(c, nuevaInscripcion)
  // Un robot rellena el campo trampa: se le responde como si nada, sin guardar.
  if (d.web) return c.json({ codigo: '', estado: 'confirmada', posicion: null })
  const r = inscribir(slug, d)
  await avisarInscripcion(d.email, r.codigo, r.evento, r.estado, d.personas)
  return c.json({ codigo: r.codigo, estado: r.estado, posicion: r.posicion }, 201)
})

publico.get('/inscripciones/:codigo', (c) => {
  c.header('Cache-Control', 'no-store')
  return c.json(verMiInscripcion(c.req.param('codigo')))
})

publico.post('/inscripciones/:codigo/cancelar', async (c) => {
  if (!permitir(`cancelar:${ipDe(c)}`, 20, 3600_000)) throw fallo(429, 'Demasiados intentos. Prueba más tarde.')
  return c.json(await cancelarPorCodigo(c.req.param('codigo')))
})
