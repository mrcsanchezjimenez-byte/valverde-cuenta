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
  /** Cartel o foto del evento. Si no hay, la app pone una ilustración según la categoría. */
  imagen?: string
  /** Si hay que apuntarse: cómo está la inscripción ahora mismo. */
  inscripcion?: EstadoInscripcionPublica
}

export interface EstadoInscripcionPublica {
  /** null: sin límite de plazas. */
  plazas: number | null
  libres: number | null
  /** Hasta cuándo se admite gente (hora local); si es null, hasta que empiece. */
  hasta: string | null
  abierta: boolean
}

/** Configuración de la inscripción de un evento (la decide la entidad). */
export interface ConfigInscripcion {
  plazas: number | null
  hasta: string | null
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
  /** Clave de la imagen subida (cartel), o null para usar la ilustración genérica. */
  imagen: string | null
  /** null: no hace falta apuntarse. */
  inscripcion: ConfigInscripcion | null
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
  /** Dónde ver el cartel actual y el propuesto en los cambios (si los hay). */
  imagenUrl: string | null
  cambiosImagenUrl: string | null
  creado: string
  actualizado: string
  enviado: string | null
}

/** Aviso que le llega a una entidad dentro de su panel (además del correo). */
export interface AvisoEntidad {
  id: number
  tipo: 'bien' | 'mal' | 'info'
  titulo: string
  texto: string
  eventoId: number | null
  leido: boolean
  creado: string
}

/** Dirección de una imagen de evento a partir de su clave. */
export const urlImagen = (clave: string) => `/api/imagenes/${clave}`

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

// ——— Fase 2: historias del pueblo y lugares con QR ———

export type EstadoHistoria = 'pendiente' | 'publicada' | 'rechazada' | 'retirada'

export interface ArchivoPublico {
  clave: string
  tipo: 'foto' | 'audio'
  /** Dirección para cargarlo: relativa al servidor (/api/...) o, en la demo, un data: URL. */
  url: string
  pie: string
}

export interface LugarResumen {
  slug: string
  nombre: string
}

/** Una historia tal y como la ve el público. */
export interface Historia {
  slug: string
  titulo: string
  texto: string
  epoca: string
  /** Firma pública: el nombre o «Un vecino o vecina». */
  autor: string
  lugar: LugarResumen | null
  lugarTexto: string
  archivos: ArchivoPublico[]
  fecha: string
}

export interface Lugar {
  slug: string
  nombre: string
  descripcion: string
  direccion: string
  lat: number
  lng: number
  historias: number
}

/** Textos de consentimiento: si cambian, se sube la versión y queda guardado qué aceptó cada persona. */
export const VERSION_CONSENTIMIENTO = '2026-11-27'
export const CONSENTIMIENTOS = {
  cesion: 'Cedo a Valverde Cuenta, sin cobrar nada, el permiso para publicar esta historia, sus fotos y su audio en la app, la web y materiales del proyecto. Puedo pedir que se retire cuando quiera.',
  autoria: 'La historia es mía o me la contó alguien que está de acuerdo en compartirla, y las fotos y el audio son míos o tengo permiso para enviarlos.',
  personas: 'Si en las fotos o en el audio aparecen otras personas, tengo su permiso (o el de su familia).',
  edad: 'Soy mayor de 14 años (o lo envío con permiso de mi madre, padre o tutor).',
} as const
export type Consentimiento = keyof typeof CONSENTIMIENTOS

export const EPOCAS = ['Antes de 1936', '1936–1960', '1960–1980', '1980–2000', 'Desde 2000', 'No lo sé'] as const

/** Límites de los archivos: el servidor los comprueba; la app los avisa antes de enviar. */
export const LIMITES_ARCHIVOS = { fotos: 4, bytesFoto: 6 * 1024 * 1024, bytesAudio: 20 * 1024 * 1024 }

/**
 * Aviso de responsabilidad de la agenda. Valverde Cuenta difunde, no organiza: cada actividad es
 * de quien la anuncia. Solo se garantiza que la entidad que publica es quien dice ser.
 */
export const AVISO_AGENDA = {
  corto: 'Valverde Cuenta solo difunde la agenda: no organiza esta actividad ni responde de cómo se desarrolla. Lo organiza y es responsable {organizador}. Nosotros comprobamos que la entidad que la anuncia es quien dice ser.',
  general: 'Valverde Cuenta difunde las actividades que anuncian asociaciones e instituciones, pero no las organiza ni responde de su desarrollo: cada una es responsabilidad de quien la organiza. Lo único que garantizamos es la identidad de la entidad que publica.',
  entidad: 'Nuestra entidad organiza (o coorganiza) lo que publica y es la única responsable de su desarrollo, permisos, seguros y seguridad. Valverde Cuenta solo difunde la información.',
}

// ——— Inscripciones a eventos ———

export type EstadoInscripcion = 'confirmada' | 'espera' | 'cancelada'

/** Lo que ve la entidad de cada persona apuntada. */
export interface Inscripcion {
  id: number
  nombre: string
  email: string
  telefono: string
  personas: number
  estado: EstadoInscripcion
  creado: string
}

/** Lo que ve quien se apunta (con su código para consultarla o cancelarla). */
export interface MiInscripcion {
  codigo: string
  evento: string
  titulo: string
  inicio: string
  personas: number
  estado: EstadoInscripcion
}

export const MAX_PERSONAS_INSCRIPCION = 6

export const AVISO_INSCRIPCION = 'Tus datos se usan solo para gestionar esta inscripción: los ve la entidad que organiza y se borran un mes después del evento. No los usamos para nada más.'
