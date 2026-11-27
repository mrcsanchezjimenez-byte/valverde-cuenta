import { Hono } from 'hono'
import { ejecutar, uno } from '../bd.ts'
import { guardarSubida, servirArchivo } from '../archivos.ts'
import { fallo, type Entorno } from '../contexto.ts'
import { anotar } from '../registro.ts'
import { permitir } from '../seguridad/limites.ts'
import { exigir, leerSesion } from '../seguridad/sesiones.ts'
import { urlImagen } from '../../compartido/tipos.ts'

/** Carteles de los eventos: los suben entidades y dirección; se ven en la app cuando el evento está publicado. */
export const imagenes = new Hono<Entorno>()

imagenes.post('/', exigir(), async (c) => {
  const u = c.get('usuario')
  if (u.rol === 'entidad' && (u.entidadEstado === 'rechazada' || u.entidadEstado === 'suspendida')) {
    throw fallo(403, 'Vuestra entidad no puede subir imágenes ahora mismo.')
  }
  if (!permitir(`imagenes:${u.id}`, 30, 3600_000)) throw fallo(429, 'Demasiadas imágenes seguidas. Prueba dentro de un rato.')
  const cuerpo = await c.req.parseBody()
  const f = cuerpo.imagen
  if (!(f instanceof File)) throw fallo(400, 'No ha llegado ninguna imagen.')
  const a = await guardarSubida(f, 'foto')
  ejecutar('INSERT INTO imagenes (clave, entidad_id, usuario_id, mime, bytes) VALUES (?, ?, ?, ?, ?)',
    a.clave, u.entidadId, u.id, a.mime, a.bytes)
  anotar(c, u.id, 'imagen_subida', `imagen:${a.clave}`)
  return c.json({ clave: a.clave, url: urlImagen(a.clave) }, 201)
})

/**
 * Se ve en público si es el cartel de un evento publicado o cancelado. Si no, solo la ven
 * dirección y la entidad que la subió (por ejemplo, mientras el evento está en revisión).
 */
imagenes.get('/:clave', (c) => {
  const clave = c.req.param('clave')
  if (!/^[a-z0-9]{24}$/.test(clave)) throw fallo(404, 'No existe.')
  const img = uno<{ mime: string; entidad_id: number | null }>('SELECT mime, entidad_id FROM imagenes WHERE clave = ?', clave)
  if (!img) throw fallo(404, 'No existe.')
  const publica = uno("SELECT 1 FROM eventos WHERE imagen = ? AND estado IN ('publicado','cancelado')", clave)
    ?? uno(`SELECT 1 FROM fotos_evento f JOIN eventos e ON e.id = f.evento_id
             WHERE f.imagen = ? AND f.estado = 'publicada' AND e.estado IN ('publicado','cancelado')`, clave)
  if (publica) return servirArchivo(c, { clave, mime: img.mime }, true)
  const s = leerSesion(c)
  const puede = s?.segundoFactor && (s.usuario.rol === 'direccion' || s.usuario.entidadId === img.entidad_id)
  if (!puede) throw fallo(404, 'No existe.')
  return servirArchivo(c, { clave, mime: img.mime }, false)
})
