import type { Context } from 'hono'
import { getConnInfo } from '@hono/node-server/conninfo'
import { HTTPException } from 'hono/http-exception'
import type { EstadoEntidad, Rol } from '../compartido/tipos.ts'
import { config } from './config.ts'

export interface UsuarioSesion {
  id: number
  email: string
  nombre: string
  rol: Rol
  totpActivo: boolean
  entidadId: number | null
  entidadNombre: string | null
  entidadEstado: EstadoEntidad | null
}

export type Entorno = {
  Variables: {
    usuario: UsuarioSesion
    sesion: string
    segundoFactor: boolean
  }
}

export type C = Context<Entorno>

export function ipDe(c: Context) {
  if (config.detrasDeProxy) {
    const reenviada = c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
    if (reenviada) return reenviada
  }
  try {
    return getConnInfo(c).remote.address ?? ''
  } catch {
    return ''
  }
}

/** Error con mensaje para enseñar tal cual a la persona. */
export const fallo = (estado: 400 | 401 | 403 | 404 | 409 | 429, mensaje: string) =>
  new HTTPException(estado, { message: mensaje })
