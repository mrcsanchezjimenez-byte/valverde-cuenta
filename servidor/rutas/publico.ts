import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Municipio } from '../../compartido/tipos.ts'
import { CENTRO_VALVERDE, distanciaKm } from '../../compartido/tipos.ts'
import { varios } from '../bd.ts'
import type { Entorno } from '../contexto.ts'
import { eventosPublicos } from '../eventos.ts'

/**
 * Lo que lee la app sin cuenta. Solo lectura y solo datos publicados, así que se puede pedir
 * desde cualquier origen (app nativa, web de los QR, etc.) sin cookies.
 */
export const publico = new Hono<Entorno>()

publico.use(cors({ origin: '*', allowMethods: ['GET'], credentials: false }))

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
