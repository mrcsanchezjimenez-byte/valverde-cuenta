import { existsSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { HTTPException } from 'hono/http-exception'
import { secureHeaders } from 'hono/secure-headers'
import { CENTRO_VALVERDE, distanciaKm, type Municipio } from '../compartido/tipos.ts'
import { varios } from './bd.ts'
import { config, RAIZ } from './config.ts'
import type { Entorno } from './contexto.ts'
import { cuenta } from './rutas/cuenta.ts'
import { direccion } from './rutas/direccion.ts'
import { entidad } from './rutas/entidad.ts'
import { imagenes } from './rutas/imagenes.ts'
import { publico } from './rutas/publico.ts'
import { exigir } from './seguridad/sesiones.ts'

const SEGUROS = new Set(['GET', 'HEAD', 'OPTIONS'])

export function crearApp() {
  const app = new Hono<Entorno>()

  app.onError((e, c) => {
    if (e instanceof HTTPException) return c.json({ error: e.message || 'Error' }, e.status)
    console.error('[error]', c.req.method, c.req.path, e)
    return c.json({ error: 'Algo ha fallado en el servidor. Inténtalo otra vez.' }, 500)
  })
  app.notFound((c) => c.json({ error: 'No existe.' }, 404))

  app.use(secureHeaders({
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      // Leaflet pone estilos en línea en el mapa.
      styleSrc: ["'self'", "'unsafe-inline'"],
      // blob: para ver la imagen elegida antes de subirla.
      imgSrc: ["'self'", 'data:', 'blob:', 'https://tile.openstreetmap.org'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
    },
    strictTransportSecurity: config.produccion ? 'max-age=63072000; includeSubDomains' : false,
    referrerPolicy: 'same-origin',
    crossOriginResourcePolicy: false,
    permissionsPolicy: { camera: [], microphone: [], geolocation: [], payment: [] },
  }))

  // ——— API ———
  // Las peticiones normales son pequeñas; solo la subida de imágenes admite más (una foto ya reducida).
  const limiteNormal = bodyLimit({ maxSize: 64 * 1024, onError: (c) => c.json({ error: 'Demasiados datos.' }, 413) })
  const limiteImagen = bodyLimit({ maxSize: 7 * 1024 * 1024, onError: (c) => c.json({ error: 'La imagen pesa demasiado (máximo 6 MB).' }, 413) })
  app.use('/api/*', (c, next) => (c.req.method === 'POST' && c.req.path === '/api/imagenes' ? limiteImagen : limiteNormal)(c, next))

  /**
   * Contra peticiones falsificadas desde otras webs: toda escritura debe venir en JSON, con una
   * cabecera propia (que un formulario ajeno no puede poner) y, si el navegador dice su origen, desde el panel.
   */
  app.use('/api/*', async (c, next) => {
    if (!SEGUROS.has(c.req.method) && c.req.path.startsWith('/api/publico/')) {
      if (!(c.req.header('content-type') ?? '').startsWith('application/json')) return c.json({ error: 'Petición no permitida.' }, 403)
    } else if (!SEGUROS.has(c.req.method)) {
      const origen = c.req.header('origin')
      // El panel siempre manda JSON (aunque sea {}) o, para subir imágenes, un formulario multipart; DELETE va sin cuerpo.
      const tipo = c.req.header('content-type') ?? ''
      const valido = tipo.startsWith('application/json') || (c.req.path === '/api/imagenes' && tipo.startsWith('multipart/form-data'))
      if (c.req.header('x-vc') !== '1' || (origen && origen !== config.origenGestion) || (!valido && c.req.method !== 'DELETE')) {
        return c.json({ error: 'Petición no permitida.' }, 403)
      }
    }
    await next()
    if (!c.req.path.startsWith('/api/publico/')) c.header('Cache-Control', 'no-store')
  })

  app.route('/api/publico', publico)
  app.route('/api/cuenta', cuenta)
  app.route('/api/entidad', entidad)
  app.route('/api/direccion', direccion)
  app.route('/api/imagenes', imagenes)

  /** Municipios con los inactivos incluidos: para dirección. Los demás usan /api/publico/municipios. */
  app.get('/api/municipios/todos', exigir({ rol: 'direccion' }), (c) => {
    const filas = varios<{ id: number; nombre: string; lat: number; lng: number; activo: number; es_valverde: number }>(
      'SELECT * FROM municipios ORDER BY es_valverde DESC, activo DESC, nombre')
    return c.json(filas.map((m): Municipio => ({
      id: m.id, nombre: m.nombre, lat: m.lat, lng: m.lng, activo: Boolean(m.activo), esValverde: Boolean(m.es_valverde),
      distanciaKm: Math.round(distanciaKm(CENTRO_VALVERDE, m)),
    })))
  })

  app.get('/api/salud', (c) => c.json({ ok: true }))

  // ——— Panel de gestión ya compilado (en local se usa el de Vite, en el puerto 5274) ———
  const carpeta = resolve(RAIZ, 'dist-gestion')
  if (existsSync(carpeta)) {
    const raiz = relative(process.cwd(), carpeta) || '.'
    app.use('/gestion/*', serveStatic({ root: raiz, rewriteRequestPath: (p) => p.replace(/^\/gestion/, '') }))
    app.get('/gestion/*', serveStatic({ root: raiz, path: 'index.html' }))
    app.get('/', (c) => c.redirect('/gestion/'))
  }

  return app
}
