/**
 * Tipos que comparten la app, el panel de gestión y el servidor.
 * Solo tipos y datos puros: nada de navegador ni de Node.
 */

export type Categoria = 'teatro' | 'musica' | 'fiestas' | 'ninos' | 'patrimonio' | 'mercados' | 'deporte' | 'charlas'
export type Zona = 'valverde' | 'alrededores'
export type TipoEscena =
  | 'fiesta' | 'iglesia' | 'calle' | 'comercio' | 'dolmen' | 'teatro' | 'musica' | 'libro' | 'casa' | 'ermita'

/** Un evento tal y como lo ve el público en la app. */
export interface Evento {
  id: string
  titulo: string
  resumen: string
  descripcion: string
  /** Hora local de Valverde, formato AAAA-MM-DDTHH:mm */
  inicio: string
  fin: string
  lugar: string
  municipio: string
  zona: Zona
  lat: number
  lng: number
  organizador: string
  /** null significa gratis */
  precio: number | null
  publico: string
  categoria: Categoria
  paraNinos?: boolean
  escena: TipoEscena
  enlazaYincana?: boolean
  /** Web o venta de entradas del organizador. */
  enlace?: string
  /** El organizador lo ha cancelado: se sigue viendo, marcado, para que nadie vaya en balde. */
  cancelado?: boolean
}

export type EstadoEvento = 'borrador' | 'pendiente' | 'publicado' | 'rechazado' | 'cancelado' | 'retirado'
export type EstadoEntidad = 'pendiente' | 'verificada' | 'rechazada' | 'suspendida'
export type Rol = 'direccion' | 'entidad'

export const TIPOS_ENTIDAD = [
  { id: 'asociacion', nombre: 'Asociación' },
  { id: 'hermandad', nombre: 'Hermandad o cofradía' },
  { id: 'ampa', nombre: 'AMPA' },
  { id: 'club', nombre: 'Club deportivo' },
  { id: 'pena', nombre: 'Peña' },
  { id: 'fundacion', nombre: 'Fundación' },
  { id: 'institucion', nombre: 'Ayuntamiento u organismo público' },
  { id: 'centro', nombre: 'Colegio, instituto o biblioteca' },
  { id: 'otra', nombre: 'Otra entidad sin ánimo de lucro' },
] as const
export type TipoEntidad = (typeof TIPOS_ENTIDAD)[number]['id']

/** Lo que el formulario de evento manda al servidor (entidades y dirección). */
export interface DatosEvento {
  titulo: string
  resumen: string
  descripcion: string
  inicio: string
  fin: string
  lugar: string
  municipioId: number
  lat: number
  lng: number
  /** En euros; null es gratis. */
  precio: number | null
  publico: string
  categoria: Categoria
  paraNinos: boolean
  enlace: string
}

/** Un evento visto desde el panel de gestión. */
export interface EventoGestion extends DatosEvento {
  id: number
  slug: string
  estado: EstadoEvento
  entidadId: number
  entidadNombre: string
  /** Solo en eventos que mete dirección por cuenta de alguien que no tiene cuenta. */
  organizador: string | null
  escena: TipoEscena
  enlazaYincana: boolean
  motivo: string | null
  /** Cambios propuestos por la entidad sobre un evento ya publicado, a la espera de revisión. */
  cambios: DatosEvento | null
  creado: string
  actualizado: string
  enviado: string | null
}

export interface Municipio {
  id: number
  nombre: string
  lat: number
  lng: number
  distanciaKm: number
  activo: boolean
  esValverde: boolean
}

/** Centro de Valverde del Camino: el radio de la agenda se mide desde aquí. */
export const CENTRO_VALVERDE = { lat: 37.5752, lng: -6.752 }

export function distanciaKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = (g: number) => (g * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}
