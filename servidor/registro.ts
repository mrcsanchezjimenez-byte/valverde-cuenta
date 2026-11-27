import type { Context } from 'hono'
import { ejecutar } from './bd.ts'
import { ipDe } from './contexto.ts'

/**
 * Deja constancia de cada acción importante: entradas, aprobaciones, rechazos, cambios.
 * Dirección lo consulta en el panel («Actividad»).
 */
export function anotar(c: Context | null, usuarioId: number | null, accion: string, objeto = '', detalle = '') {
  ejecutar(
    'INSERT INTO registro (usuario_id, accion, objeto, detalle, ip) VALUES (?, ?, ?, ?, ?)',
    usuarioId, accion, objeto, detalle.slice(0, 500), c ? ipDe(c) : 'consola',
  )
}
