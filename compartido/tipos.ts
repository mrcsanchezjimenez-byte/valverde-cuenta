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
  /** Fotos de cómo fue (ya aprobadas por dirección). */
  fotos?: { url: string; pie: string }[]
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
export type Rol = 'direccion' | 'entidad' | 'comercio'

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

// ——— Fotos de los eventos ———

export type EstadoFoto = 'pendiente' | 'publicada' | 'rechazada'

export interface FotoEvento {
  id: number
  eventoId: number
  url: string
  pie: string
  estado: EstadoFoto
  creado: string
}

export const MAX_FOTOS_EVENTO = 30

/** Una historia vista desde el panel de dirección (con lo privado). */
export interface ArchivoGestion extends ArchivoPublico {
  id: number
  mime: string
  bytes: number
  publicar: boolean
  orden: number
}

export interface HistoriaGestion {
  id: number
  slug: string
  estado: EstadoHistoria
  origen: 'web' | 'entrevista'
  titulo: string
  texto: string
  epoca: string
  lugarId: number | null
  lugarNombre: string | null
  lugarTexto: string
  firma: 'nombre' | 'anonimo'
  autor: string
  contactoNombre: string
  contactoEmail: string
  contactoTelefono: string
  consentimiento: { version: string; aceptados: Consentimiento[]; fecha: string }
  motivo: string | null
  nota: string
  archivos: ArchivoGestion[]
  creado: string
  actualizado: string
}

export interface LugarGestion extends Lugar {
  id: number
  anfitrion: string
  activo: boolean
  pendientes: number
  escaneosTotal: number
  escaneos30: number
  /** Lo que lleva dentro el código QR de la placa. */
  urlQr: string
}

/** Firma pública de una historia. */
export const firmaPublica = (firma: 'nombre' | 'anonimo', autor: string) => (firma === 'nombre' && autor ? autor : 'Un vecino o vecina de Valverde')

// ——— Comercios (fase 3) ———

export const CATEGORIAS_COMERCIO = [
  { id: 'alimentacion', nombre: 'Alimentación', emoji: '🥖' },
  { id: 'hosteleria', nombre: 'Bares y restaurantes', emoji: '☕' },
  { id: 'calzado', nombre: 'Botos y calzado', emoji: '👢' },
  { id: 'moda', nombre: 'Moda y complementos', emoji: '👗' },
  { id: 'salud', nombre: 'Salud y belleza', emoji: '💇' },
  { id: 'hogar', nombre: 'Hogar y regalos', emoji: '🎁' },
  { id: 'artesania', nombre: 'Artesanía', emoji: '🧵' },
  { id: 'servicios', nombre: 'Servicios', emoji: '🔧' },
  { id: 'ocio', nombre: 'Ocio y turismo', emoji: '🌳' },
] as const
export type CategoriaComercio = (typeof CATEGORIAS_COMERCIO)[number]['id']

export type TipoPlan = 'escaparate' | 'destacado' | 'campana' | 'promocion' | 'patrocinio'
export type EstadoPago = 'pendiente' | 'pagado' | 'anulado'
export type EstadoComercio = 'pendiente' | 'verificado' | 'rechazado' | 'suspendido'
export type EstadoOferta = 'pendiente' | 'publicada' | 'rechazada' | 'retirada'

/** Lo que incluye cada plan y su precio orientativo (ver docs/politica-cobros.md). */
export const PLANES: Record<TipoPlan, { nombre: string; resumen: string; precio: string }> = {
  escaparate: { nombre: 'Escaparate', resumen: 'Descripción, logo, fotos, web y redes, y ofertas.', precio: '15 €/mes · 150 €/año' },
  destacado: { nombre: 'Destacado', resumen: 'Escaparate + tarjeta «Patrocinado» en portada, agenda y guía.', precio: '35 €/mes · 350 €/año' },
  campana: { nombre: 'Campaña', resumen: 'Sale en la sección de la campaña con sus ofertas.', precio: '30–60 € por campaña' },
  promocion: { nombre: 'Promoción puntual', resumen: 'Una oferta destacada durante una semana.', precio: '10 €' },
  patrocinio: { nombre: 'Patrocinio', resumen: 'Su nombre en un contenido (yincana, historia, placa).', precio: 'A medida' },
}

/** Qué puede hacer un comercio hoy según sus planes activos. */
export interface Capacidades {
  escaparate: boolean
  destacado: boolean
  /** Puede publicar ofertas (cualquier plan de pago activo). */
  ofertas: boolean
  campanas: number[]
}

export interface DatosComercio {
  nombre: string
  categoria: CategoriaComercio
  descripcion: string
  direccion: string
  municipioId: number
  lat: number
  lng: number
  telefono: string
  whatsapp: string
  emailPublico: string
  web: string
  instagram: string
  facebook: string
  horario: string
  logo: string | null
  fotos: string[]
}

/** Lo que ve el público de un comercio (lo de pago, solo si tiene plan). */
export interface ComercioPublico {
  slug: string
  nombre: string
  categoria: CategoriaComercio
  direccion: string
  municipio: string
  lat: number
  lng: number
  telefono: string
  horario: string
  nivel: 'basica' | 'escaparate' | 'destacado'
  descripcion?: string
  logo?: string
  fotos?: string[]
  whatsapp?: string
  emailPublico?: string
  web?: string
  instagram?: string
  facebook?: string
  ofertas: OfertaPublica[]
}

export interface OfertaPublica {
  id: number
  titulo: string
  texto: string
  imagen: string | null
  hasta: string
  comercio: { slug: string; nombre: string }
  campana: string | null
}

export interface CampanaPublica {
  slug: string
  nombre: string
  descripcion: string
  desde: string
  hasta: string
  comercios: { slug: string; nombre: string; categoria: CategoriaComercio; logo: string | null }[]
  ofertas: OfertaPublica[]
}

export interface Plan {
  id: number
  comercioId: number
  comercioNombre: string
  tipo: TipoPlan
  campanaId: number | null
  campanaNombre: string | null
  desde: string
  hasta: string
  importe: number
  estadoPago: EstadoPago
  metodo: string
  factura: string
  pagadoEl: string | null
  nota: string
  /** activo hoy, futuro o pasado. */
  vigencia: 'activo' | 'futuro' | 'caducado'
}

export interface Campana {
  id: number
  slug: string
  nombre: string
  descripcion: string
  desde: string
  hasta: string
  activa: boolean
  comercios: number
}

export interface Oferta {
  id: number
  comercioId: number
  comercioNombre: string
  titulo: string
  texto: string
  imagen: string | null
  imagenUrl: string | null
  desde: string
  hasta: string
  campanaId: number | null
  estado: EstadoOferta
  motivo: string | null
  creado: string
}

export interface ComercioGestion extends DatosComercio {
  id: number
  slug: string
  municipio: string
  nif: string | null
  personaContacto: string
  telefonoContacto: string
  estado: EstadoComercio
  motivo: string | null
  nota: string
  cambios: DatosComercio | null
  logoUrl: string | null
  fotosUrl: string[]
  capacidades: Capacidades
  planActual: TipoPlan | null
  caduca: string | null
  pagoPendiente: boolean
  email: string | null
  visitas30: number
  creado: string
}

/** Cuánto contenido patrocinado se mete en la agenda: uno cada tantos eventos. */
export const PATROCINADO_CADA = 8
