import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { createMiddleware } from 'hono/factory'
import type { EstadoEntidad, Rol } from '../../compartido/tipos.ts'
import { ejecutar, uno } from '../bd.ts'
import { config } from '../config.ts'
import { fallo, ipDe, type Entorno, type UsuarioSesion } from '../contexto.ts'
import { fichaAleatoria, huella } from './claves.ts'

/** `__Host-` obliga al navegador a mandarla solo por HTTPS y solo a este dominio exacto. */
export const COOKIE = config.produccion ? '__Host-vc_sesion' : 'vc_sesion'

const HORA = 3600_000
/** Dirección: sesiones cortas. Entidades: más largas, para no pedir la contraseña cada vez. */
const DURACION: Record<Rol, { total: number; inactividad: number }> = {
  direccion: { total: 12 * HORA, inactividad: 2 * HORA },
  entidad: { total: 30 * 24 * HORA, inactividad: 14 * 24 * HORA },
}

export function crearSesion(c: Context, usuario: { id: number; rol: Rol }, segundoFactor: boolean) {
  const ficha = fichaAleatoria()
  const ahora = Date.now()
  const { total } = DURACION[usuario.rol]
  ejecutar(
    'INSERT INTO sesiones (hash, usuario_id, segundo_factor, creada, caduca, ultimo_uso, ip, agente) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    huella(ficha), usuario.id, segundoFactor, new Date(ahora).toISOString(), new Date(ahora + total).toISOString(),
    new Date(ahora).toISOString(), ipDe(c), (c.req.header('user-agent') ?? '').slice(0, 200),
  )
  setCookie(c, COOKIE, ficha, {
    httpOnly: true, secure: config.produccion, sameSite: 'Strict', path: '/', maxAge: Math.floor(total / 1000),
  })
}

export function cerrarSesion(c: Context) {
  const ficha = getCookie(c, COOKIE)
  if (ficha) ejecutar('DELETE FROM sesiones WHERE hash = ?', huella(ficha))
  deleteCookie(c, COOKIE, { path: '/', secure: config.produccion })
}

/** Al cambiar la contraseña o el doble factor, se cierran todas las demás sesiones abiertas. */
export function cerrarOtrasSesiones(usuarioId: number, excepto?: string) {
  ejecutar('DELETE FROM sesiones WHERE usuario_id = ? AND hash IS NOT ?', usuarioId, excepto ?? null)
}

interface FilaSesion {
  hash: string
  segundo_factor: number
  caduca: string
  ultimo_uso: string
  id: number
  email: string
  nombre: string
  rol: Rol
  activo: number
  totp_activo: number
  entidad_id: number | null
  entidad_nombre: string | null
  entidad_estado: EstadoEntidad | null
}

export function leerSesion(c: Context): { usuario: UsuarioSesion; hash: string; segundoFactor: boolean } | null {
  const ficha = getCookie(c, COOKIE)
  if (!ficha || ficha.length > 100) return null
  const hash = huella(ficha)
  const fila = uno<FilaSesion>(
    `SELECT s.hash, s.segundo_factor, s.caduca, s.ultimo_uso, u.id, u.email, u.nombre, u.rol, u.activo, u.totp_activo,
            u.entidad_id, e.nombre AS entidad_nombre, e.estado AS entidad_estado
       FROM sesiones s JOIN usuarios u ON u.id = s.usuario_id LEFT JOIN entidades e ON e.id = u.entidad_id
      WHERE s.hash = ?`,
    hash,
  )
  if (!fila) return null
  const ahora = Date.now()
  const caducada = Date.parse(fila.caduca) <= ahora || Date.parse(fila.ultimo_uso) + DURACION[fila.rol].inactividad <= ahora
  if (caducada || !fila.activo) {
    ejecutar('DELETE FROM sesiones WHERE hash = ?', hash)
    return null
  }
  // Se apunta el uso como mucho una vez por minuto, para no escribir en cada petición.
  if (ahora - Date.parse(fila.ultimo_uso) > 60_000) {
    ejecutar('UPDATE sesiones SET ultimo_uso = ? WHERE hash = ?', new Date(ahora).toISOString(), hash)
  }
  return {
    hash,
    segundoFactor: Boolean(fila.segundo_factor),
    usuario: {
      id: fila.id, email: fila.email, nombre: fila.nombre, rol: fila.rol, totpActivo: Boolean(fila.totp_activo),
      entidadId: fila.entidad_id, entidadNombre: fila.entidad_nombre, entidadEstado: fila.entidad_estado,
    },
  }
}

/**
 * Puerta de cada ruta privada.
 * - `rol`: solo ese tipo de cuenta.
 * - `aMedias`: deja pasar sesiones a las que aún les falta el segundo factor (solo para completarlo).
 */
export const exigir = (opciones: { rol?: Rol; aMedias?: boolean } = {}) =>
  createMiddleware<Entorno>(async (c, next) => {
    const s = leerSesion(c)
    if (!s) throw fallo(401, 'Tienes que entrar con tu cuenta.')
    if (!s.segundoFactor && !opciones.aMedias) throw fallo(401, 'Falta el código de verificación.')
    if (opciones.rol && s.usuario.rol !== opciones.rol) throw fallo(403, 'No tienes permiso para esto.')
    c.set('usuario', s.usuario)
    c.set('sesion', s.hash)
    c.set('segundoFactor', s.segundoFactor)
    await next()
  })

/** Las sesiones caducadas y los enlaces vencidos se limpian solos. */
export function limpiarCaducados() {
  const ahora = new Date().toISOString()
  ejecutar('DELETE FROM sesiones WHERE caduca <= ?', ahora)
  ejecutar('DELETE FROM fichas WHERE caduca <= ?', ahora)
}
