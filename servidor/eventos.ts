import { randomBytes } from 'node:crypto'
import { escenaPorDefecto } from '../compartido/categorias.ts'
import type { Categoria, DatosEvento, EstadoEvento, Evento, EventoGestion, TipoEscena } from '../compartido/tipos.ts'
import { ahoraIso, ahoraLocal, ejecutar, uno, varios } from './bd.ts'
import { fallo } from './contexto.ts'

export interface FilaEvento {
  id: number
  slug: string
  entidad_id: number
  entidad_nombre: string
  estado: EstadoEvento
  titulo: string
  resumen: string
  descripcion: string
  inicio: string
  fin: string
  lugar: string
  municipio_id: number
  municipio: string
  es_valverde: number
  lat: number
  lng: number
  precio_centimos: number | null
  publico: string
  categoria: Categoria
  para_ninos: number
  enlace: string
  escena: TipoEscena
  enlaza_yincana: number
  organizador: string | null
  motivo: string | null
  cambios: string | null
  creado: string
  actualizado: string
  enviado: string | null
}

const SELECT = `
  SELECT ev.*, en.nombre AS entidad_nombre, m.nombre AS municipio, m.es_valverde
    FROM eventos ev JOIN entidades en ON en.id = ev.entidad_id JOIN municipios m ON m.id = ev.municipio_id`

export const nuevoSlug = () => randomBytes(8).toString('base64url').replace(/[-_]/g, 'x').slice(0, 10).toLowerCase()

const datosDe = (f: FilaEvento): DatosEvento => ({
  titulo: f.titulo, resumen: f.resumen, descripcion: f.descripcion, inicio: f.inicio, fin: f.fin, lugar: f.lugar,
  municipioId: f.municipio_id, lat: f.lat, lng: f.lng,
  precio: f.precio_centimos === null ? null : f.precio_centimos / 100,
  publico: f.publico, categoria: f.categoria, paraNinos: Boolean(f.para_ninos), enlace: f.enlace,
})

export const aGestion = (f: FilaEvento): EventoGestion => ({
  ...datosDe(f),
  id: f.id, slug: f.slug, estado: f.estado, entidadId: f.entidad_id, entidadNombre: f.entidad_nombre,
  organizador: f.organizador, escena: f.escena, enlazaYincana: Boolean(f.enlaza_yincana), motivo: f.motivo,
  cambios: f.cambios ? (JSON.parse(f.cambios) as DatosEvento) : null,
  creado: f.creado, actualizado: f.actualizado, enviado: f.enviado,
})

/** Lo que ve el público: sin datos internos (motivos, notas, estados de revisión). */
export const aPublico = (f: FilaEvento): Evento => ({
  id: f.slug, titulo: f.titulo, resumen: f.resumen, descripcion: f.descripcion, inicio: f.inicio, fin: f.fin,
  lugar: f.lugar, municipio: f.municipio, zona: f.es_valverde ? 'valverde' : 'alrededores', lat: f.lat, lng: f.lng,
  organizador: f.organizador ?? f.entidad_nombre,
  precio: f.precio_centimos ? f.precio_centimos / 100 : null,
  publico: f.publico, categoria: f.categoria, escena: f.escena,
  ...(f.para_ninos ? { paraNinos: true } : {}),
  ...(f.enlaza_yincana ? { enlazaYincana: true } : {}),
  ...(f.enlace ? { enlace: f.enlace } : {}),
  ...(f.estado === 'cancelado' ? { cancelado: true } : {}),
})

export const leerEvento = (id: number) => uno<FilaEvento>(`${SELECT} WHERE ev.id = ?`, id)

export function eventoDeEntidad(id: number, entidadId: number) {
  const f = leerEvento(id)
  // Mismo mensaje si no existe o si es de otra entidad: no se da pista de lo que hay.
  if (!f || f.entidad_id !== entidadId) throw fallo(404, 'Ese evento no existe.')
  return f
}

export function eventoParaDireccion(id: number) {
  const f = leerEvento(id)
  if (!f) throw fallo(404, 'Ese evento no existe.')
  return f
}

export const listarEventos = (donde: string, ...vs: (string | number)[]) =>
  varios<FilaEvento>(`${SELECT} WHERE ${donde} ORDER BY ev.inicio`, ...vs)

/** Eventos de la agenda pública: publicados o cancelados, desde dos meses atrás (para el calendario). */
export function eventosPublicos() {
  const desde = ahoraLocal(new Date(Date.now() - 60 * 86400_000))
  return listarEventos("ev.estado IN ('publicado','cancelado') AND ev.fin >= ?", desde).map(aPublico)
}

/** Comprueba que el municipio existe y está dentro de la zona de la agenda. */
export function comprobarMunicipio(id: number) {
  const m = uno<{ activo: number }>('SELECT activo FROM municipios WHERE id = ?', id)
  if (!m || !m.activo) throw fallo(400, 'Ese municipio no está en la zona de la agenda.')
}

/** Un evento que se manda a revisión no puede haber terminado ya. */
export function comprobarFuturo(d: DatosEvento) {
  if (d.fin <= ahoraLocal()) throw fallo(400, 'Ese evento ya ha terminado.')
}

const columnas = (d: DatosEvento) => [
  d.titulo, d.resumen, d.descripcion, d.inicio, d.fin, d.lugar, d.municipioId, d.lat, d.lng,
  d.precio === null || d.precio === 0 ? null : Math.round(d.precio * 100), d.publico, d.categoria, d.paraNinos, d.enlace,
] as const

export function crearEvento(entidadId: number, d: DatosEvento, estado: EstadoEvento, extra: { organizador?: string | null } = {}) {
  const ahora = ahoraIso()
  const r = ejecutar(
    `INSERT INTO eventos (slug, entidad_id, estado, titulo, resumen, descripcion, inicio, fin, lugar, municipio_id, lat, lng,
       precio_centimos, publico, categoria, para_ninos, enlace, escena, organizador, enviado, creado, actualizado)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    nuevoSlug(), entidadId, estado, ...columnas(d), escenaPorDefecto(d.categoria), extra.organizador ?? null,
    estado === 'borrador' ? null : ahora, ahora, ahora,
  )
  return Number(r.lastInsertRowid)
}

export function guardarDatos(id: number, d: DatosEvento) {
  ejecutar(
    `UPDATE eventos SET titulo = ?, resumen = ?, descripcion = ?, inicio = ?, fin = ?, lugar = ?, municipio_id = ?, lat = ?, lng = ?,
       precio_centimos = ?, publico = ?, categoria = ?, para_ninos = ?, enlace = ?, actualizado = ? WHERE id = ?`,
    ...columnas(d), ahoraIso(), id,
  )
}

export function cambiarEstado(id: number, estado: EstadoEvento, extra: { motivo?: string | null; revisor?: number; enviado?: boolean } = {}) {
  const ahora = ahoraIso()
  ejecutar(
    `UPDATE eventos SET estado = ?, motivo = ?, actualizado = ?,
       revisado = CASE WHEN ? THEN ? ELSE revisado END, revisado_por = COALESCE(?, revisado_por),
       enviado = CASE WHEN ? THEN ? ELSE enviado END
     WHERE id = ?`,
    estado, extra.motivo ?? null, ahora, extra.revisor !== undefined, ahora, extra.revisor ?? null, Boolean(extra.enviado), ahora, id,
  )
}
