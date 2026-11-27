import type { EstadoFoto, FotoEvento } from '../compartido/tipos.ts'
import { MAX_FOTOS_EVENTO, urlImagen } from '../compartido/tipos.ts'
import { ahoraIso, ejecutar, uno, varios } from './bd.ts'
import { fallo } from './contexto.ts'

/**
 * Fotos de cómo fue cada evento. La entidad las sube (después de subir cada imagen con /api/imagenes)
 * y no se ven en la app hasta que dirección las aprueba, una a una.
 */

interface FilaFoto {
  id: number
  evento_id: number
  imagen: string
  pie: string
  estado: EstadoFoto
  creado: string
}

export const aFoto = (f: FilaFoto): FotoEvento =>
  ({ id: f.id, eventoId: f.evento_id, url: urlImagen(f.imagen), pie: f.pie, estado: f.estado, creado: f.creado })

export const fotosDe = (eventoId: number) => varios<FilaFoto>('SELECT * FROM fotos_evento WHERE evento_id = ? ORDER BY id', eventoId).map(aFoto)

/** Fotos aprobadas de varios eventos a la vez (para la agenda pública). */
export function fotosPublicas() {
  const filas = varios<FilaFoto>("SELECT * FROM fotos_evento WHERE estado = 'publicada' ORDER BY id")
  const porEvento = new Map<number, { url: string; pie: string }[]>()
  for (const f of filas) porEvento.set(f.evento_id, [...(porEvento.get(f.evento_id) ?? []), { url: urlImagen(f.imagen), pie: f.pie }])
  return porEvento
}

export function anadirFoto(eventoId: number, imagen: string, pie: string) {
  const n = uno<{ n: number }>("SELECT COUNT(*) AS n FROM fotos_evento WHERE evento_id = ? AND estado <> 'rechazada'", eventoId)?.n ?? 0
  if (n >= MAX_FOTOS_EVENTO) throw fallo(409, `Como mucho ${MAX_FOTOS_EVENTO} fotos por evento.`)
  if (uno('SELECT 1 FROM fotos_evento WHERE imagen = ?', imagen)) throw fallo(409, 'Esa foto ya está añadida.')
  const r = ejecutar('INSERT INTO fotos_evento (evento_id, imagen, pie) VALUES (?, ?, ?)', eventoId, imagen, pie)
  return Number(r.lastInsertRowid)
}

export function leerFoto(id: number) {
  const f = uno<FilaFoto & { entidad_id: number; titulo: string }>(
    'SELECT f.*, e.entidad_id, e.titulo FROM fotos_evento f JOIN eventos e ON e.id = f.evento_id WHERE f.id = ?', id)
  if (!f) throw fallo(404, 'Esa foto no existe.')
  return f
}

export function revisarFoto(id: number, estado: EstadoFoto, revisor: number) {
  ejecutar('UPDATE fotos_evento SET estado = ?, revisado = ?, revisado_por = ? WHERE id = ?', estado, ahoraIso(), revisor, id)
}

/** Para la bandeja de dirección: fotos pendientes agrupadas por evento. */
export function fotosPendientes() {
  const filas = varios<FilaFoto & { titulo: string; entidad_nombre: string; inicio: string }>(
    `SELECT f.*, e.titulo, e.inicio, en.nombre AS entidad_nombre FROM fotos_evento f
       JOIN eventos e ON e.id = f.evento_id JOIN entidades en ON en.id = e.entidad_id
      WHERE f.estado = 'pendiente' ORDER BY f.evento_id, f.id`)
  const grupos = new Map<number, { eventoId: number; titulo: string; entidadNombre: string; inicio: string; fotos: FotoEvento[] }>()
  for (const f of filas) {
    const g = grupos.get(f.evento_id) ?? { eventoId: f.evento_id, titulo: f.titulo, entidadNombre: f.entidad_nombre, inicio: f.inicio, fotos: [] }
    g.fotos.push(aFoto(f))
    grupos.set(f.evento_id, g)
  }
  return [...grupos.values()]
}
