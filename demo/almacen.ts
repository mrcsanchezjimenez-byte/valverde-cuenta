/**
 * DEMOSTRACIÓN SIN SERVIDOR (GitHub Pages).
 *
 * Imita en el navegador los datos del servidor para enseñar la app y el panel de gestión sin
 * montar nada. Todo se guarda en el localStorage de quien lo prueba: nada sale de su navegador
 * ni lo ve nadie más. La app y el panel comparten este almacén, así que lo que se aprueba en el
 * panel aparece en la agenda.
 *
 * Solo se usa con VITE_DEMO=1. La versión real nunca carga este archivo.
 */
import { escenaPorDefecto } from '../compartido/categorias.ts'
import { EVENTOS, HISTORIAS_EJEMPLO, LUGARES_EJEMPLO } from '../compartido/ejemplo.ts'
import type { AvisoEntidad, Consentimiento, DatosEvento, EstadoEntidad, EstadoFoto, EstadoHistoria, EstadoInscripcion, Historia, Lugar, Evento, EventoGestion, Inscripcion, MiInscripcion, Municipio, Rol } from '../compartido/tipos.ts'
import { CENTRO_VALVERDE, distanciaKm, firmaPublica } from '../compartido/tipos.ts'
import type { ComercioPublico, CampanaPublica } from '../compartido/tipos.ts'
import { aPublicoDemo, campanaActualDemo, capacidadesDemo, sembrarComercios, type DatosComerciosDemo } from './comercios.ts'

export interface UsuarioDemo {
  id: number
  email: string
  clave: string
  nombre: string
  rol: Rol
  entidadId: number | null
  comercioId?: number | null
  totpActivo: boolean
}

export interface EntidadDemo {
  id: number
  nombre: string
  tipo: string
  cif: string | null
  municipioId: number
  personaContacto: string
  telefono: string
  web: string
  estado: EstadoEntidad
  motivo: string | null
  nota: string
  interna: boolean
  creado: string
  revisado: string | null
}

export type EventoDemo = Omit<EventoGestion, 'entidadNombre' | 'imagenUrl' | 'cambiosImagenUrl'>
export type AvisoDemo = AvisoEntidad & { entidadId: number }

export interface ApunteDemo {
  id: number
  fecha: string
  accion: string
  objeto: string
  detalle: string
  ip: string
  usuarioId: number | null
}

export type InscripcionDemo = Inscripcion & { eventoId: number; codigo: string }
export interface LugarDemo {
  id: number; slug: string; nombre: string; descripcion: string; direccion: string; lat: number; lng: number
  anfitrion: string; activo: boolean; escaneosTotal: number; escaneos30: number
}
export interface ArchivoDemo { id: number; clave: string; tipo: 'foto' | 'audio'; mime: string; bytes: number; publicar: boolean; pie: string; orden: number }
export interface HistoriaDemo {
  id: number; slug: string; estado: EstadoHistoria; origen: 'web' | 'entrevista'; titulo: string; texto: string; epoca: string
  lugarId: number | null; lugarTexto: string; firma: 'nombre' | 'anonimo'; autor: string
  contactoNombre: string; contactoEmail: string; contactoTelefono: string
  consentimiento: { version: string; aceptados: Consentimiento[]; fecha: string }
  motivo: string | null; nota: string; archivos: ArchivoDemo[]; creado: string; actualizado: string
}
export interface FotoDemo { id: number; eventoId: number; imagen: string; pie: string; estado: EstadoFoto; creado: string }

/** «Fotos» de ejemplo dibujadas en SVG, para no meter imágenes reales en la demo. */
function fotoDibujada(cielo: string, suelo: string, figuras: number, texto: string) {
  const personas = Array.from({ length: figuras }, (_, i) => {
    const x = 60 + i * (280 / Math.max(1, figuras - 1 || 1))
    return `<circle cx='${x}' cy='170' r='13' fill='%235B4433'/><rect x='${x - 13}' y='184' width='26' height='52' rx='11' fill='%235B4433'/>`
  }).join('')
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'><rect width='400' height='300' fill='${cielo}'/>`
    + `<path d='M0 40 Q200 90 400 30' stroke='%235B4433' fill='none'/><rect y='236' width='400' height='64' fill='${suelo}'/>${personas}`
    + `<text x='20' y='285' font-family='sans-serif' font-size='16' fill='%23fff'>${texto}</text></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replaceAll('%23', '#'))}`
}

export interface AlmacenDemo extends DatosComerciosDemo {
  version: number
  usuarios: UsuarioDemo[]
  entidades: EntidadDemo[]
  eventos: EventoDemo[]
  municipios: Omit<Municipio, 'distanciaKm'>[]
  registro: ApunteDemo[]
  avisos: AvisoDemo[]
  /** Imágenes subidas en la demo: clave → data: URL (reducidas para que quepan en el navegador). */
  imagenes: Record<string, string>
  inscripciones: InscripcionDemo[]
  fotos: FotoDemo[]
  lugares: LugarDemo[]
  historias: HistoriaDemo[]
  sesion: { usuarioId: number; segundoFactor: boolean } | null
  siguienteId: number
}

/** Cuentas de la demostración. Se enseñan en la propia pantalla de entrada: son ficticias. */
export const CUENTAS_DEMO = {
  direccion: { email: 'pilar@demo.valverdecuenta', clave: 'demo-valverde', codigo: '123456' },
  entidad: { email: 'pena@demo.valverdecuenta', clave: 'demo-valverde' },
  comercio: { email: 'comercio@demo.valverdecuenta', clave: 'demo-valverde' },
}

const CLAVE = 'vc.demo'
const VERSION = 6
const ahora = () => new Date().toISOString().replace(/\.\d+Z$/, 'Z')

/** Fecha local (AAAA-MM-DDTHH:mm) dentro de `dias` días, a la hora indicada. */
function dentroDe(dias: number, hora: string) {
  const d = new Date(Date.now() + dias * 86400_000)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${hora}`
}

const MUNICIPIOS: Omit<Municipio, 'distanciaKm'>[] = [
  { id: 1, nombre: 'Valverde del Camino', lat: 37.5752, lng: -6.752, activo: true, esValverde: true },
  { id: 2, nombre: 'Zalamea la Real', lat: 37.6794, lng: -6.6606, activo: true, esValverde: false },
  { id: 3, nombre: 'Calañas', lat: 37.6545, lng: -6.8786, activo: true, esValverde: false },
  { id: 4, nombre: 'Beas', lat: 37.4255, lng: -6.7916, activo: true, esValverde: false },
  { id: 5, nombre: 'El Campillo', lat: 37.6544, lng: -6.5967, activo: true, esValverde: false },
  { id: 6, nombre: 'Minas de Riotinto', lat: 37.6935, lng: -6.5958, activo: true, esValverde: false },
  { id: 7, nombre: 'Berrocal', lat: 37.6075, lng: -6.5408, activo: true, esValverde: false },
  { id: 8, nombre: 'Nerva', lat: 37.6942, lng: -6.5494, activo: false, esValverde: false },
  { id: 9, nombre: 'Trigueros', lat: 37.3858, lng: -6.8267, activo: false, esValverde: false },
  { id: 10, nombre: 'Niebla', lat: 37.3611, lng: -6.6778, activo: false, esValverde: false },
]

function sembrar(): AlmacenDemo {
  const t = ahora()
  const entidades: EntidadDemo[] = [
    { id: 1, nombre: 'Valverde Cuenta', tipo: 'otra', cif: null, municipioId: 1, personaContacto: '', telefono: '', web: '', estado: 'verificada', motivo: null, nota: '', interna: true, creado: t, revisado: t },
    { id: 2, nombre: 'Peña Cultural El Boto', tipo: 'pena', cif: 'G21000018', municipioId: 1, personaContacto: 'Juan Pérez', telefono: '600000000', web: '', estado: 'verificada', motivo: null, nota: 'Entidad de prueba de la demostración.', interna: false, creado: t, revisado: t },
    { id: 3, nombre: 'AMPA Colegio Las Moreras', tipo: 'ampa', cif: 'G21000026', municipioId: 1, personaContacto: 'Rosa Gil', telefono: '600000001', web: '', estado: 'pendiente', motivo: null, nota: '', interna: false, creado: t, revisado: null },
    { id: 4, nombre: 'Club de Senderismo Andévalo', tipo: 'club', cif: 'G21000034', municipioId: 3, personaContacto: 'Luis Domínguez', telefono: '600000002', web: '', estado: 'verificada', motivo: null, nota: '', interna: false, creado: t, revisado: t },
  ]
  const usuarios: UsuarioDemo[] = [
    { id: 1, email: CUENTAS_DEMO.direccion.email, clave: CUENTAS_DEMO.direccion.clave, nombre: 'Pilar', rol: 'direccion', entidadId: null, totpActivo: true },
    { id: 2, email: CUENTAS_DEMO.entidad.email, clave: CUENTAS_DEMO.entidad.clave, nombre: 'Juan Pérez', rol: 'entidad', entidadId: 2, totpActivo: false },
    { id: 3, email: 'ampa@demo.valverdecuenta', clave: CUENTAS_DEMO.entidad.clave, nombre: 'Rosa Gil', rol: 'entidad', entidadId: 3, totpActivo: false },
    { id: 4, email: 'senderismo@demo.valverdecuenta', clave: CUENTAS_DEMO.entidad.clave, nombre: 'Luis Domínguez', rol: 'entidad', entidadId: 4, totpActivo: false },
    { id: 5, email: CUENTAS_DEMO.comercio.email, clave: CUENTAS_DEMO.comercio.clave, nombre: 'Rafael (ficticio)', rol: 'comercio', entidadId: null, comercioId: 1001, totpActivo: false },
  ]

  // Los ejemplos se mueven para que siempre caigan en las próximas semanas.
  const primero = Math.min(...EVENTOS.map((e) => Date.parse(`${e.inicio}:00Z`)))
  const salto = Math.max(0, Math.ceil((Date.now() + 86400_000 - primero) / (7 * 86400_000))) * 7 * 86400_000
  const mover = (s: string) => new Date(Date.parse(`${s}:00Z`) + salto).toISOString().slice(0, 16)
  let id = 1
  const eventos: EventoDemo[] = EVENTOS.flatMap((e) => {
    const m = MUNICIPIOS.find((x) => x.nombre === e.municipio)
    if (!m) return []
    return [{
      id: id++, slug: e.id, estado: 'publicado' as const, entidadId: 1, organizador: e.organizador,
      titulo: e.titulo, resumen: e.resumen, descripcion: e.descripcion, inicio: mover(e.inicio), fin: mover(e.fin),
      lugar: e.lugar, municipioId: m.id, lat: e.lat, lng: e.lng, precio: e.precio, publico: e.publico,
      categoria: e.categoria, paraNinos: Boolean(e.paraNinos), enlace: '', imagen: null, inscripcion: null, escena: e.escena,
      enlazaYincana: Boolean(e.enlazaYincana), motivo: null, cambios: null, creado: t, actualizado: t, enviado: t,
    }]
  })

  const base = (datos: Partial<EventoDemo> & DatosEvento): EventoDemo => ({
    id: id++, slug: `demo-${id}`, estado: 'pendiente', entidadId: 2, organizador: null, escena: escenaPorDefecto(datos.categoria),
    enlazaYincana: false, motivo: null, cambios: null, creado: t, actualizado: t, enviado: t, ...datos,
  })
  eventos.push(
    base({
      titulo: 'Cata de dulces de Navidad', resumen: 'Las socias de la peña preparan los dulces de siempre para probarlos.',
      descripcion: 'Una tarde para probar pestiños, roscos y polvorones caseros, con las recetas de las abuelas del pueblo.\n\nPlazas limitadas.',
      inicio: dentroDe(9, '18:00'), fin: dentroDe(9, '20:00'), lugar: 'Sede de la Peña El Boto', municipioId: 1, lat: 37.5741, lng: -6.7512,
      precio: null, publico: 'Todos los públicos', categoria: 'fiestas', paraNinos: true, enlace: '', imagen: null, inscripcion: null,
    }),
    base({
      titulo: 'Ruta al Pozo de la Nieve', resumen: 'Senderismo de dificultad media con salida desde Calañas.',
      descripcion: 'Doce kilómetros por caminos del Andévalo. Lleva agua, calzado de montaña y algo de comer.',
      inicio: dentroDe(12, '09:00'), fin: dentroDe(12, '14:00'), lugar: 'Plaza de España', municipioId: 3, lat: 37.6553, lng: -6.8789,
      precio: 3, publico: 'Adultos', categoria: 'deporte', paraNinos: false, enlace: '', imagen: null, inscripcion: null, estado: 'publicado', entidadId: 4,
    }),
  )
  // Un evento publicado con cambios propuestos: así se ve la comparación en el panel.
  const conCambios = base({
    titulo: 'Concierto de la Peña', resumen: 'La peña celebra su aniversario con música en directo.',
    descripcion: 'Actuación de grupos locales para celebrar el aniversario de la peña. Habrá ambigú.',
    inicio: dentroDe(16, '20:00'), fin: dentroDe(16, '23:00'), lugar: 'Plaza de la Constitución', municipioId: 1, lat: 37.573977, lng: -6.74894,
    precio: null, publico: 'Todos los públicos', categoria: 'musica', paraNinos: false, enlace: '', imagen: null, inscripcion: null, estado: 'publicado',
  })
  conCambios.cambios = { ...conCambios, inicio: dentroDe(16, '21:00'), fin: dentroDe(16, '23:30'), titulo: 'Concierto aniversario de la Peña' }
  eventos.push(conCambios)
  // Un evento con inscripción y gente ya apuntada, para ver la lista en el panel.
  const taller = base({
    titulo: 'Taller de botos para principiantes', resumen: 'Un artesano enseña a coser una pieza de boto valverdeño.',
    descripcion: 'Dos horas para conocer el oficio del boto: el cuero, las herramientas y las puntadas de siempre.\n\nPlazas limitadas: hay que apuntarse.',
    inicio: dentroDe(11, '18:00'), fin: dentroDe(11, '20:00'), lugar: 'Sede de la Peña El Boto', municipioId: 1, lat: 37.5741, lng: -6.7512,
    precio: 5, publico: 'Mayores de 14 años', categoria: 'charlas', paraNinos: false, enlace: '', imagen: null,
    inscripcion: { plazas: 12, hasta: null }, estado: 'publicado',
  })
  eventos.push(taller)
  // Un evento que ya pasó, con fotos publicadas (para «Cómo fue»), y fotos por revisar en otro.
  const castanada = base({
    titulo: 'Castañada en la plaza', resumen: 'Castañas asadas, música y juegos para toda la familia.',
    descripcion: 'La peña asó castañas para todo el pueblo y hubo juegos tradicionales para los peques.',
    inicio: dentroDe(-6, '17:00'), fin: dentroDe(-6, '20:00'), lugar: 'Plaza de la Constitución', municipioId: 1, lat: 37.573977, lng: -6.74894,
    precio: null, publico: 'Todos los públicos', categoria: 'fiestas', paraNinos: true, enlace: '', imagen: null, inscripcion: null, estado: 'publicado',
  })
  eventos.push(castanada)
  const imagenes: Record<string, string> = {
    demofoto000000000000001: fotoDibujada('%23EBD6A9', '%23C9A871', 5, 'Castañada · la plaza llena'),
    demofoto000000000000002: fotoDibujada('%23F3E5C0', '%239A5A2B', 3, 'Asando castañas'),
    demofoto000000000000003: fotoDibujada('%23E2EEE7', '%231E5B43', 6, 'Juegos para los peques'),
    demofoto000000000000004: fotoDibujada('%23F6EBCD', '%23D4A23C', 4, 'Música al caer la tarde'),
    demofoto000000000000005: fotoDibujada('%23EBD6A9', '%235B4433', 2, 'Foto por revisar'),
    demofoto000000000000006: fotoDibujada('%23F3E5C0', '%23A8322A', 7, 'Otra foto por revisar'),
  }
  const fotos: FotoDemo[] = [
    ...[1, 2, 3, 4].map((n) => ({ id: 600 + n, eventoId: castanada.id, imagen: `demofoto00000000000000${n}`, pie: '', estado: 'publicada' as const, creado: t })),
    ...[5, 6].map((n) => ({ id: 600 + n, eventoId: conCambios.id, imagen: `demofoto00000000000000${n}`, pie: '', estado: 'pendiente' as const, creado: t })),
  ]
  // Lugares con placa (las paradas de la yincana) e historias de ejemplo; una de ellas, pendiente.
  const lugares: LugarDemo[] = LUGARES_EJEMPLO.map((l, i) => ({ ...l, id: 700 + i, activo: true, escaneosTotal: [42, 31, 18, 9, 27][i], escaneos30: [12, 8, 5, 2, 7][i] }))
  const todos: Consentimiento[] = ['cesion', 'autoria', 'personas', 'edad']
  const historias: HistoriaDemo[] = HISTORIAS_EJEMPLO.map((h, i) => ({
    id: 800 + i, slug: `historia-${i + 1}`, estado: 'publicada', origen: 'entrevista', titulo: h.titulo, texto: h.texto, epoca: h.epoca,
    lugarId: lugares.find((l) => l.slug === h.lugar)!.id, lugarTexto: '', firma: h.autor ? 'nombre' : 'anonimo', autor: h.autor,
    contactoNombre: '', contactoEmail: '', contactoTelefono: '', consentimiento: { version: '2026-11-27', aceptados: todos, fecha: t },
    motivo: null, nota: '', archivos: [], creado: t, actualizado: t,
  }))
  imagenes.demofoto000000000000007 = fotoDibujada('%23F5E8BE', '%238F7354', 3, 'Foto antigua de la fragua')
  historias.push({
    id: 899, slug: 'historia-pendiente', estado: 'pendiente', origen: 'web', titulo: 'La fragua de la calle Real',
    texto: 'Mi abuelo era herrero y tenía la fragua al final de la calle Real. Los arrieros paraban allí a herrar las mulas antes de bajar a Huelva, y de paso se tomaban un vaso de vino en la taberna de enfrente.\n\nDe chico me dejaba darle al fuelle, y aún me acuerdo del ruido del martillo sobre el yunque.',
    epoca: '1936–1960', lugarId: null, lugarTexto: 'Calle Real', firma: 'nombre', autor: 'Manolo, el nieto del herrero',
    contactoNombre: 'Manuel Ruiz (ejemplo)', contactoEmail: 'manuel@ejemplo.es', contactoTelefono: '',
    consentimiento: { version: '2026-11-27', aceptados: todos, fecha: t }, motivo: null, nota: '',
    archivos: [{ id: 901, clave: 'demofoto000000000000007', tipo: 'foto', mime: 'image/svg+xml', bytes: 0, publicar: true, pie: '', orden: 0 }],
    creado: t, actualizado: t,
  })
  const inscripciones: InscripcionDemo[] = [
    ['María Romero', '600100200', '', 2], ['José Manuel Vázquez', '', 'jmv@ejemplo.es', 1], ['Lucía Garrido', '600300400', '', 3],
    ['Francisco Díaz', '600500600', 'paco@ejemplo.es', 1], ['Inés Bravo', '600700800', '', 2],
  ].map(([nombre, telefono, email, personas], i) => ({
    id: 500 + i, eventoId: taller.id, codigo: `demo-${i}`, nombre: String(nombre), telefono: String(telefono), email: String(email),
    personas: Number(personas), estado: 'confirmada' as const, creado: t,
  }))

  return {
    version: VERSION, usuarios, entidades, eventos, municipios: MUNICIPIOS, sesion: null, siguienteId: 1000, imagenes, inscripciones, fotos,
    lugares, historias, ...sembrarComercios(t),
    avisos: [{
      id: 1, entidadId: 2, tipo: 'bien', titulo: 'Entidad verificada', leido: false, eventoId: null, creado: t,
      texto: '«Peña Cultural El Boto» ya puede publicar en la agenda. Cada evento lo revisaremos antes de que salga.',
    }],
    registro: [{ id: 1, fecha: t, accion: 'demo_creada', objeto: '', detalle: 'Datos de demostración', ip: '—', usuarioId: null }],
  }
}

export function leerAlmacen(): AlmacenDemo {
  try {
    const crudo = localStorage.getItem(CLAVE)
    const a = crudo ? (JSON.parse(crudo) as AlmacenDemo) : null
    if (a && a.version === VERSION) return a
  } catch {
    // Sin almacenamiento (modo privado estricto): se trabaja en memoria.
  }
  const nuevo = sembrar()
  guardarAlmacen(nuevo)
  return nuevo
}

export function guardarAlmacen(a: AlmacenDemo) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(a))
  } catch {
    // Igual que arriba: la demo sigue funcionando, pero no recuerda los cambios.
  }
}

export function reiniciarAlmacen() {
  try {
    localStorage.removeItem(CLAVE)
  } catch {
    // Nada que hacer.
  }
}

export const conDistancia = (m: Omit<Municipio, 'distanciaKm'>): Municipio =>
  ({ ...m, distanciaKm: Math.round(distanciaKm(CENTRO_VALVERDE, m)) })

/** Lo que vería la app pública: igual que /api/publico/eventos del servidor. */
export function eventosPublicosDemo(): Evento[] {
  const a = leerAlmacen()
  return a.eventos.filter((e) => e.estado === 'publicado' || e.estado === 'cancelado').map((e) => {
    const m = a.municipios.find((x) => x.id === e.municipioId)
    const en = a.entidades.find((x) => x.id === e.entidadId)
    return {
      id: e.slug, titulo: e.titulo, resumen: e.resumen, descripcion: e.descripcion, inicio: e.inicio, fin: e.fin,
      lugar: e.lugar, municipio: m?.nombre ?? '', zona: m?.esValverde ? 'valverde' : 'alrededores', lat: e.lat, lng: e.lng,
      organizador: e.organizador ?? en?.nombre ?? '', precio: e.precio || null, publico: e.publico, categoria: e.categoria,
      escena: e.escena,
      ...(e.paraNinos ? { paraNinos: true } : {}), ...(e.enlazaYincana ? { enlazaYincana: true } : {}),
      ...(e.enlace ? { enlace: e.enlace } : {}), ...(e.estado === 'cancelado' ? { cancelado: true } : {}),
      ...(e.imagen && a.imagenes[e.imagen] ? { imagen: a.imagenes[e.imagen] } : {}),
      ...(e.inscripcion ? { inscripcion: estadoInscripcionDemo(a, e) } : {}),
      ...(fotosPublicadas(a, e.id).length ? { fotos: fotosPublicadas(a, e.id) } : {}),
    }
  })
}

// ——— Inscripciones en la demo (mismas reglas que el servidor) ———

const ahoraLocalDemo = () => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

const usadas = (a: AlmacenDemo, eventoId: number) =>
  a.inscripciones.filter((i) => i.eventoId === eventoId && i.estado === 'confirmada').reduce((t, i) => t + i.personas, 0)

export function estadoInscripcionDemo(a: AlmacenDemo, e: EventoDemo) {
  const plazas = e.inscripcion?.plazas ?? null
  const hasta = e.inscripcion?.hasta ?? null
  return {
    plazas, hasta, libres: plazas === null ? null : Math.max(0, plazas - usadas(a, e.id)),
    abierta: e.estado === 'publicado' && ahoraLocalDemo() < (hasta ?? e.inicio),
  }
}

export class ErrorDemo extends Error {}

export function inscribirDemo(slug: string, d: { nombre: string; email: string; telefono: string; personas: number }) {
  const a = leerAlmacen()
  const e = a.eventos.find((x) => x.slug === slug && x.estado === 'publicado' && x.inscripcion)
  if (!e) throw new ErrorDemo('Este evento no admite inscripciones.')
  const estado = estadoInscripcionDemo(a, e)
  if (!estado.abierta) throw new ErrorDemo('La inscripción para este evento ya está cerrada.')
  const tel = d.telefono.replace(/\D/g, '')
  if (a.inscripciones.some((i) => i.eventoId === e.id && i.estado !== 'cancelada' && ((d.email && i.email === d.email) || (tel && i.telefono === tel)))) {
    throw new ErrorDemo('Ya hay una inscripción con ese teléfono o correo para este evento.')
  }
  const plaza: EstadoInscripcion = estado.libres === null || estado.libres >= d.personas ? 'confirmada' : 'espera'
  const codigo = `demo-${a.siguienteId++}-${Math.random().toString(36).slice(2, 10)}`
  a.inscripciones.push({ id: a.siguienteId++, eventoId: e.id, codigo, nombre: d.nombre, email: d.email, telefono: tel, personas: d.personas, estado: plaza, creado: new Date().toISOString() })
  guardarAlmacen(a)
  const posicion = plaza === 'espera' ? a.inscripciones.filter((i) => i.eventoId === e.id && i.estado === 'espera').length : null
  return { codigo, estado: plaza, posicion }
}

export function verInscripcionDemo(codigo: string): MiInscripcion {
  const a = leerAlmacen()
  const i = a.inscripciones.find((x) => x.codigo === codigo)
  const e = i && a.eventos.find((x) => x.id === i.eventoId)
  if (!i || !e) throw new ErrorDemo('No encontramos esa inscripción.')
  return { codigo, evento: e.slug, titulo: e.titulo, inicio: e.inicio, personas: i.personas, estado: i.estado }
}

/** Cancela y, si queda sitio, sube la primera de la lista de espera (si cabe). */
export function cancelarInscripcionDemo(a: AlmacenDemo, i: InscripcionDemo) {
  i.estado = 'cancelada'
  const e = a.eventos.find((x) => x.id === i.eventoId)
  const plazas = e?.inscripcion?.plazas
  if (!e || plazas == null) return
  let libres = plazas - usadas(a, e.id)
  for (const x of a.inscripciones.filter((y) => y.eventoId === e.id && y.estado === 'espera')) {
    if (x.personas > libres) break
    x.estado = 'confirmada'
    libres -= x.personas
  }
}

export function cancelarPorCodigoDemo(codigo: string) {
  const a = leerAlmacen()
  const i = a.inscripciones.find((x) => x.codigo === codigo)
  if (!i) throw new ErrorDemo('No encontramos esa inscripción.')
  if (i.estado !== 'cancelada') cancelarInscripcionDemo(a, i)
  guardarAlmacen(a)
  return verInscripcionDemo(codigo)
}

export function listaInscripcionesDemo(a: AlmacenDemo, eventoId: number) {
  const orden = { confirmada: 0, espera: 1, cancelada: 2 }
  const lista = a.inscripciones.filter((i) => i.eventoId === eventoId).sort((x, y) => orden[x.estado] - orden[y.estado])
  const suma = (s: EstadoInscripcion) => lista.filter((i) => i.estado === s).reduce((t, i) => t + i.personas, 0)
  return {
    lista: lista.map(({ eventoId: _, codigo: __, ...i }) => i),
    confirmadas: suma('confirmada'), enEspera: suma('espera'),
    plazas: a.eventos.find((e) => e.id === eventoId)?.inscripcion?.plazas ?? null,
  }
}

// ——— Fotos de los eventos en la demo ———

export const fotosPublicadas = (a: AlmacenDemo, eventoId: number) =>
  a.fotos.filter((f) => f.eventoId === eventoId && f.estado === 'publicada').map((f) => ({ url: a.imagenes[f.imagen] ?? '', pie: f.pie }))

export const aFotoDemo = (a: AlmacenDemo, f: FotoDemo) =>
  ({ id: f.id, eventoId: f.eventoId, url: a.imagenes[f.imagen] ?? '', pie: f.pie, estado: f.estado, creado: f.creado })

// ——— Historias y lugares en la demo ———

const urlArchivoDemo = (a: AlmacenDemo, clave: string) => a.imagenes[clave] ?? ''

export function aHistoriaPublicaDemo(a: AlmacenDemo, h: HistoriaDemo): Historia {
  const l = a.lugares.find((x) => x.id === h.lugarId)
  return {
    slug: h.slug, titulo: h.titulo, texto: h.texto, epoca: h.epoca, autor: firmaPublica(h.firma, h.autor),
    lugar: l ? { slug: l.slug, nombre: l.nombre } : null, lugarTexto: h.lugarTexto, fecha: h.actualizado,
    archivos: h.archivos.filter((x) => x.publicar).map((x) => ({ clave: x.clave, tipo: x.tipo, url: urlArchivoDemo(a, x.clave), pie: x.pie })),
  }
}

export function historiasPublicasDemo(): Historia[] {
  const a = leerAlmacen()
  return a.historias.filter((h) => h.estado === 'publicada').map((h) => aHistoriaPublicaDemo(a, h))
}

const aLugarDemo = (a: AlmacenDemo, l: LugarDemo): Lugar => ({
  slug: l.slug, nombre: l.nombre, descripcion: l.descripcion, direccion: l.direccion, lat: l.lat, lng: l.lng,
  historias: a.historias.filter((h) => h.estado === 'publicada' && h.lugarId === l.id).length,
})

export function lugaresPublicosDemo(): Lugar[] {
  const a = leerAlmacen()
  return a.lugares.filter((l) => l.activo).map((l) => aLugarDemo(a, l))
}

export function lugarPublicoDemo(slug: string, qr: boolean) {
  const a = leerAlmacen()
  const l = a.lugares.find((x) => x.slug === slug && x.activo)
  if (!l) throw new ErrorDemo('Ese lugar no existe.')
  if (qr) {
    l.escaneosTotal++
    l.escaneos30++
    guardarAlmacen(a)
  }
  return { ...aLugarDemo(a, l), historias: a.historias.filter((h) => h.estado === 'publicada' && h.lugarId === l.id).map((h) => aHistoriaPublicaDemo(a, h)) }
}

/** Guarda una historia que llega en un formulario (desde la app o en modo entrevista). */
export async function guardarHistoriaDemo(datos: FormData, origen: 'web' | 'entrevista', aDataUrl: (b: Blob, foto: boolean) => Promise<string | null>) {
  const a = leerAlmacen()
  const v = (k: string) => String(datos.get(k) ?? '').trim()
  const aceptados = (['cesion', 'autoria', 'personas', 'edad'] as Consentimiento[]).filter((k) => v(`acepta_${k}`) === 'si')
  if (aceptados.length < 4) throw new ErrorDemo('Para poder publicarla hay que marcar todas las casillas de permisos.')
  if (v('titulo').length < 3) throw new ErrorDemo('Ponle un título (al menos 3 letras).')
  const audio = datos.get('audio')
  if (v('texto').length < 30 && !(audio instanceof Blob)) throw new ErrorDemo('Cuenta la historia por escrito (al menos unas líneas) o grábala en audio.')
  if (v('firma') === 'nombre' && v('autor').length < 2) throw new ErrorDemo('Escribe con qué nombre quieres firmar, o elige firmar como «un vecino o vecina».')
  const archivos: ArchivoDemo[] = []
  for (const f of datos.getAll('fotos')) {
    if (!(f instanceof Blob)) continue
    const url = await aDataUrl(f, true)
    if (!url) continue
    const clave = `demo${a.siguienteId++}`
    a.imagenes[clave] = url
    archivos.push({ id: a.siguienteId++, clave, tipo: 'foto', mime: 'image/jpeg', bytes: f.size, publicar: true, pie: '', orden: archivos.length })
  }
  if (audio instanceof Blob) {
    const url = await aDataUrl(audio, false)
    if (url) {
      const clave = `demo${a.siguienteId++}`
      a.imagenes[clave] = url
      archivos.push({ id: a.siguienteId++, clave, tipo: 'audio', mime: audio.type, bytes: audio.size, publicar: true, pie: '', orden: archivos.length })
    }
  }
  const t = new Date().toISOString()
  const id = a.siguienteId++
  a.historias.unshift({
    id, slug: `historia-${id}`, estado: 'pendiente', origen, titulo: v('titulo'), texto: v('texto'), epoca: v('epoca'),
    lugarId: v('lugarSlug') ? a.lugares.find((l) => l.slug === v('lugarSlug'))?.id ?? null : v('lugarId') ? Number(v('lugarId')) : null, lugarTexto: v('lugarTexto'), firma: v('firma') === 'nombre' ? 'nombre' : 'anonimo', autor: v('autor'),
    contactoNombre: v('contactoNombre'), contactoEmail: v('contactoEmail'), contactoTelefono: v('contactoTelefono'),
    consentimiento: { version: '2026-11-27', aceptados, fecha: t }, motivo: null, nota: '', archivos, creado: t, actualizado: t,
  })
  guardarAlmacen(a)
  return id
}

// ——— Guía de comercios (app) ———

export function comerciosPublicosDemo(): ComercioPublico[] {
  const a = leerAlmacen()
  return a.comercios.filter((c) => c.estado === 'verificado').map((c) => aPublicoDemo(a, c)).sort((x, y) => x.nombre.localeCompare(y.nombre))
}

export function comercioPublicoDemo(slug: string): ComercioPublico {
  const a = leerAlmacen()
  const c = a.comercios.find((x) => x.slug === slug && x.estado === 'verificado')
  if (!c) throw new ErrorDemo('Ese comercio no está en la guía.')
  c.visitas++
  guardarAlmacen(a)
  return aPublicoDemo(a, c)
}

export function patrocinadosDemo(): ComercioPublico[] {
  const a = leerAlmacen()
  return a.comercios.filter((c) => c.estado === 'verificado' && capacidadesDemo(a, c.id).destacado).map((c) => aPublicoDemo(a, c))
}

export const campanaDemo = (): CampanaPublica | null => campanaActualDemo(leerAlmacen())
