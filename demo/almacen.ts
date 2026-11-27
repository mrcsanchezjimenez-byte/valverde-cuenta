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
import { EVENTOS } from '../compartido/ejemplo.ts'
import type { DatosEvento, EstadoEntidad, Evento, EventoGestion, Municipio, Rol } from '../compartido/tipos.ts'
import { CENTRO_VALVERDE, distanciaKm } from '../compartido/tipos.ts'

export interface UsuarioDemo {
  id: number
  email: string
  clave: string
  nombre: string
  rol: Rol
  entidadId: number | null
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

export type EventoDemo = Omit<EventoGestion, 'entidadNombre'>

export interface ApunteDemo {
  id: number
  fecha: string
  accion: string
  objeto: string
  detalle: string
  ip: string
  usuarioId: number | null
}

export interface AlmacenDemo {
  version: number
  usuarios: UsuarioDemo[]
  entidades: EntidadDemo[]
  eventos: EventoDemo[]
  municipios: Omit<Municipio, 'distanciaKm'>[]
  registro: ApunteDemo[]
  sesion: { usuarioId: number; segundoFactor: boolean } | null
  siguienteId: number
}

/** Cuentas de la demostración. Se enseñan en la propia pantalla de entrada: son ficticias. */
export const CUENTAS_DEMO = {
  direccion: { email: 'pilar@demo.valverdecuenta', clave: 'demo-valverde', codigo: '123456' },
  entidad: { email: 'pena@demo.valverdecuenta', clave: 'demo-valverde' },
}

const CLAVE = 'vc.demo'
const VERSION = 1
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
      categoria: e.categoria, paraNinos: Boolean(e.paraNinos), enlace: '', escena: e.escena,
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
      precio: null, publico: 'Todos los públicos', categoria: 'fiestas', paraNinos: true, enlace: '',
    }),
    base({
      titulo: 'Ruta al Pozo de la Nieve', resumen: 'Senderismo de dificultad media con salida desde Calañas.',
      descripcion: 'Doce kilómetros por caminos del Andévalo. Lleva agua, calzado de montaña y algo de comer.',
      inicio: dentroDe(12, '09:00'), fin: dentroDe(12, '14:00'), lugar: 'Plaza de España', municipioId: 3, lat: 37.6553, lng: -6.8789,
      precio: 3, publico: 'Adultos', categoria: 'deporte', paraNinos: false, enlace: '', estado: 'publicado', entidadId: 4,
    }),
  )
  // Un evento publicado con cambios propuestos: así se ve la comparación en el panel.
  const conCambios = base({
    titulo: 'Concierto de la Peña', resumen: 'La peña celebra su aniversario con música en directo.',
    descripcion: 'Actuación de grupos locales para celebrar el aniversario de la peña. Habrá ambigú.',
    inicio: dentroDe(16, '20:00'), fin: dentroDe(16, '23:00'), lugar: 'Plaza de la Constitución', municipioId: 1, lat: 37.573977, lng: -6.74894,
    precio: null, publico: 'Todos los públicos', categoria: 'musica', paraNinos: false, enlace: '', estado: 'publicado',
  })
  conCambios.cambios = { ...conCambios, inicio: dentroDe(16, '21:00'), fin: dentroDe(16, '23:30'), titulo: 'Concierto aniversario de la Peña' }
  eventos.push(conCambios)

  return {
    version: VERSION, usuarios, entidades, eventos, municipios: MUNICIPIOS, sesion: null, siguienteId: 1000,
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
    }
  })
}
