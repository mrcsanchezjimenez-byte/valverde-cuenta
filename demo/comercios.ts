/**
 * Comercios en la DEMOSTRACIÓN (fase 3): las mismas reglas que el servidor, con datos ficticios
 * en el navegador. Los nombres de los comercios son inventados.
 */
import type {
  AvisoEntidad, Campana, CampanaPublica, Capacidades, ComercioGestion, ComercioPublico, DatosComercio, EstadoComercio, EstadoOferta,
  EstadoPago, Oferta, OfertaPublica, Plan, TipoPlan,
} from '../compartido/tipos.ts'
import type { AlmacenDemo } from './almacen.ts'

export type ComercioDemo = DatosComercio & {
  id: number; slug: string; nif: string | null; personaContacto: string; telefonoContacto: string; estado: EstadoComercio
  motivo: string | null; nota: string; cambios: DatosComercio | null; creado: string; visitas: number
}
export interface PlanDemo {
  id: number; comercioId: number; tipo: TipoPlan; campanaId: number | null; desde: string; hasta: string; importe: number
  estadoPago: EstadoPago; metodo: string; factura: string; pagadoEl: string | null; nota: string
}
export interface CampanaDemo { id: number; slug: string; nombre: string; descripcion: string; desde: string; hasta: string; activa: boolean }
export interface OfertaDemo {
  id: number; comercioId: number; titulo: string; texto: string; imagen: string | null; desde: string; hasta: string
  campanaId: number | null; estado: EstadoOferta; motivo: string | null; creado: string
}
export type AvisoComercioDemo = AvisoEntidad & { comercioId: number }

export interface DatosComerciosDemo {
  comercios: ComercioDemo[]
  planes: PlanDemo[]
  campanas: CampanaDemo[]
  ofertas: OfertaDemo[]
  avisosComercio: AvisoComercioDemo[]
}

export const hoyDemo = () => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
const dia = (n: number) => {
  const d = new Date(Date.now() + n * 86400_000)
  const p = (x: number) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** Comercios inventados para la demostración, con varios planes para ver cada caso. */
export function sembrarComercios(t: string): DatosComerciosDemo {
  const base = (id: number, nombre: string, categoria: DatosComercio['categoria'], extra: Partial<ComercioDemo> = {}): ComercioDemo => ({
    id, slug: nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    nombre, categoria, descripcion: '', direccion: 'Calle Real', municipioId: 1, lat: 37.5745 + (id % 7) * 0.0008, lng: -6.753 + (id % 5) * 0.0009,
    telefono: '959000000', whatsapp: '', emailPublico: '', web: '', instagram: '', facebook: '', horario: 'L a S de 10:00 a 14:00 y de 17:30 a 20:30',
    logo: null, fotos: [], nif: null, personaContacto: '', telefonoContacto: '', estado: 'verificado', motivo: null, nota: '', cambios: null,
    creado: t, visitas: 0, ...extra,
  })
  const comercios: ComercioDemo[] = [
    base(1001, 'Botos La Horma (ejemplo)', 'calzado', {
      descripcion: 'Botos valverdeños cosidos a mano, de caza, de campo y de vestir. Arreglos y encargos a medida.', whatsapp: '600000010',
      web: 'https://ejemplo.es', instagram: 'https://instagram.com/ejemplo', direccion: 'Calle Real, 12', visitas: 184, personaContacto: 'Rafael (ficticio)',
    }),
    base(1002, 'Horno El Pósito (ejemplo)', 'alimentacion', {
      descripcion: 'Pan de leña, roscos y pestiños de los de siempre. Encargos para fiestas.', whatsapp: '600000011', direccion: 'Plaza de España, 3', visitas: 97,
    }),
    base(1003, 'Bar La Parra (ejemplo)', 'hosteleria', { direccion: 'Plaza de la Constitución, 5', visitas: 61, telefono: '959000002' }),
    base(1004, 'Mercería Hilo y Aguja (ejemplo)', 'moda', { descripcion: 'Lanas, botones, arreglos y regalos.', direccion: 'Calle Sevilla, 8', visitas: 40 }),
    base(1005, 'Ferretería El Clavo (ejemplo)', 'servicios', { direccion: 'Avenida de la Constitución, 40', visitas: 22 }),
    base(1006, 'Peluquería Andévalo (ejemplo)', 'salud', { direccion: 'Calle Huelva, 2', visitas: 15 }),
    base(1007, 'Regalos La Cancela (ejemplo)', 'hogar', { estado: 'pendiente', direccion: 'Calle Real, 50', nif: '12345678Z', personaContacto: 'Marisa (ficticia)', telefonoContacto: '600000020' }),
  ]
  // Cambios propuestos en una ficha, para ver la comparación.
  comercios[2].cambios = { ...comercios[2], horario: 'Todos los días de 8:00 a 24:00' }
  const campanas: CampanaDemo[] = [
    { id: 1101, slug: 'black-friday-demo', nombre: 'Black Friday en Valverde', descripcion: 'Descuentos en los comercios del pueblo esta semana.', desde: dia(-3), hasta: dia(3), activa: true },
    { id: 1102, slug: 'navidad-demo', nombre: 'Navidad y Reyes', descripcion: 'Regalos, dulces y todo lo de estas fiestas.', desde: dia(4), hasta: dia(40), activa: true },
  ]
  const planes: PlanDemo[] = [
    { id: 1201, comercioId: 1001, tipo: 'destacado', campanaId: null, desde: dia(-20), hasta: dia(10), importe: 35, estadoPago: 'pagado', metodo: 'Bizum', factura: 'VC-2026-014', pagadoEl: dia(-20), nota: 'Comercio fundador: precio a mitad el primer año.' },
    { id: 1202, comercioId: 1002, tipo: 'escaparate', campanaId: null, desde: dia(-100), hasta: dia(265), importe: 150, estadoPago: 'pagado', metodo: 'Transferencia', factura: 'VC-2026-003', pagadoEl: dia(-100), nota: '' },
    { id: 1203, comercioId: 1004, tipo: 'campana', campanaId: 1101, desde: dia(-3), hasta: dia(3), importe: 30, estadoPago: 'pendiente', metodo: '', factura: '', pagadoEl: null, nota: 'Dice que paga el lunes.' },
    { id: 1204, comercioId: 1003, tipo: 'escaparate', campanaId: null, desde: dia(-60), hasta: dia(-31), importe: 15, estadoPago: 'pagado', metodo: 'Bizum', factura: 'VC-2026-009', pagadoEl: dia(-60), nota: '' },
  ]
  const ofertas: OfertaDemo[] = [
    { id: 1301, comercioId: 1001, titulo: '10 % en botos de niño', texto: 'Para la temporada de campo. Hasta fin de mes.', imagen: null, desde: dia(-5), hasta: dia(9), campanaId: null, estado: 'publicada', motivo: null, creado: t },
    { id: 1302, comercioId: 1004, titulo: '3×2 en ovillos de lana', texto: 'Solo esta semana de Black Friday.', imagen: null, desde: dia(-3), hasta: dia(3), campanaId: 1101, estado: 'publicada', motivo: null, creado: t },
    { id: 1303, comercioId: 1002, titulo: 'Caja de pestiños de regalo con cada encargo', texto: 'Encargos de Navidad antes del 15 de diciembre.', imagen: null, desde: dia(0), hasta: dia(17), campanaId: null, estado: 'pendiente', motivo: null, creado: t },
  ]
  return { comercios, planes, campanas, ofertas, avisosComercio: [{ id: 1401, comercioId: 1001, tipo: 'bien', titulo: 'Plan Destacado activado', texto: 'Tu comercio sale como «Destacado» en la guía y como patrocinado en la agenda.', eventoId: null, leido: false, creado: t }] }
}

// ——— Reglas ———

const planesActivos = (a: AlmacenDemo, comercioId: number) => {
  const hoy = hoyDemo()
  return a.planes.filter((p) => p.comercioId === comercioId && p.desde <= hoy && p.hasta >= hoy && p.estadoPago !== 'anulado')
}

export const capacidadesDemo = (a: AlmacenDemo, comercioId: number): Capacidades => {
  const ps = planesActivos(a, comercioId)
  return {
    escaparate: ps.some((p) => p.tipo === 'escaparate' || p.tipo === 'destacado'),
    destacado: ps.some((p) => p.tipo === 'destacado'),
    ofertas: ps.some((p) => ['escaparate', 'destacado', 'campana', 'promocion'].includes(p.tipo)),
    campanas: ps.filter((p) => p.tipo === 'campana' && p.campanaId).map((p) => p.campanaId!),
  }
}

const img = (a: AlmacenDemo, clave: string | null) => (clave ? a.imagenes[clave] ?? null : null)

const ofertaPublica = (a: AlmacenDemo, o: OfertaDemo): OfertaPublica => {
  const c = a.comercios.find((x) => x.id === o.comercioId)!
  return { id: o.id, titulo: o.titulo, texto: o.texto, imagen: img(a, o.imagen), hasta: o.hasta, comercio: { slug: c.slug, nombre: c.nombre }, campana: a.campanas.find((x) => x.id === o.campanaId)?.nombre ?? null }
}

export function ofertasPublicasDemo(a: AlmacenDemo, comercioId?: number) {
  const hoy = hoyDemo()
  return a.ofertas.filter((o) => o.estado === 'publicada' && o.desde <= hoy && o.hasta >= hoy && (!comercioId || o.comercioId === comercioId)
    && a.comercios.find((c) => c.id === o.comercioId)?.estado === 'verificado' && capacidadesDemo(a, o.comercioId).ofertas).map((o) => ofertaPublica(a, o))
}

export function aPublicoDemo(a: AlmacenDemo, c: ComercioDemo): ComercioPublico {
  const cap = capacidadesDemo(a, c.id)
  const municipio = a.municipios.find((m) => m.id === c.municipioId)?.nombre ?? ''
  const base: ComercioPublico = {
    slug: c.slug, nombre: c.nombre, categoria: c.categoria, direccion: c.direccion, municipio, lat: c.lat, lng: c.lng, telefono: c.telefono,
    horario: c.horario, nivel: cap.destacado ? 'destacado' : cap.escaparate ? 'escaparate' : 'basica', ofertas: ofertasPublicasDemo(a, c.id),
  }
  if (!cap.escaparate) return base
  return {
    ...base, descripcion: c.descripcion, logo: img(a, c.logo) ?? undefined, fotos: c.fotos.map((f) => img(a, f)!).filter(Boolean),
    whatsapp: c.whatsapp || undefined, emailPublico: c.emailPublico || undefined, web: c.web || undefined, instagram: c.instagram || undefined, facebook: c.facebook || undefined,
  }
}

export const aPlanDemo = (a: AlmacenDemo, p: PlanDemo): Plan => {
  const hoy = hoyDemo()
  return {
    ...p, comercioNombre: a.comercios.find((c) => c.id === p.comercioId)?.nombre ?? '', campanaNombre: a.campanas.find((x) => x.id === p.campanaId)?.nombre ?? null,
    vigencia: hoy < p.desde ? 'futuro' : hoy > p.hasta ? 'caducado' : 'activo',
  }
}

export function aGestionDemo(a: AlmacenDemo, c: ComercioDemo): ComercioGestion {
  const planes = a.planes.filter((p) => p.comercioId === c.id).map((p) => aPlanDemo(a, p))
  const activos = planes.filter((p) => p.vigencia === 'activo' && p.estadoPago !== 'anulado')
  const principal = activos.find((p) => p.tipo === 'destacado') ?? activos.find((p) => p.tipo === 'escaparate') ?? activos[0]
  return {
    ...c, municipio: a.municipios.find((m) => m.id === c.municipioId)?.nombre ?? '', logoUrl: img(a, c.logo), fotosUrl: c.fotos.map((f) => img(a, f) ?? ''),
    capacidades: capacidadesDemo(a, c.id), planActual: principal?.tipo ?? null, caduca: principal?.hasta ?? null,
    pagoPendiente: planes.some((p) => p.estadoPago === 'pendiente' && p.vigencia !== 'caducado'),
    email: a.usuarios.find((u) => (u as { comercioId?: number | null }).comercioId === c.id)?.email ?? null, visitas30: c.visitas,
  }
}

export const aOfertaDemo = (a: AlmacenDemo, o: OfertaDemo): Oferta => ({
  ...o, comercioNombre: a.comercios.find((c) => c.id === o.comercioId)?.nombre ?? '', imagenUrl: img(a, o.imagen),
})

export const campanasDemo = (a: AlmacenDemo): Campana[] => a.campanas.map((c) => ({
  ...c, comercios: a.comercios.filter((x) => capacidadesDemo(a, x.id).campanas.includes(c.id)).length,
}))

export function campanaActualDemo(a: AlmacenDemo): CampanaPublica | null {
  const hoy = hoyDemo()
  const ca = a.campanas.find((c) => c.activa && c.desde <= hoy && c.hasta >= hoy)
  if (!ca) return null
  const comercios = a.comercios.filter((c) => c.estado === 'verificado' && capacidadesDemo(a, c.id).campanas.includes(ca.id))
  const slugs = new Set(comercios.map((c) => c.slug))
  return {
    slug: ca.slug, nombre: ca.nombre, descripcion: ca.descripcion, desde: ca.desde, hasta: ca.hasta,
    comercios: comercios.map((c) => ({ slug: c.slug, nombre: c.nombre, categoria: c.categoria, logo: img(a, c.logo) })),
    ofertas: ofertasPublicasDemo(a).filter((o) => slugs.has(o.comercio.slug)),
  }
}

export function renovacionesDemo(a: AlmacenDemo) {
  const hoy = hoyDemo()
  const limite = dia(15)
  return a.planes.filter((p) => p.estadoPago !== 'anulado' && p.hasta >= hoy && p.hasta <= limite && ['escaparate', 'destacado'].includes(p.tipo)
    && !a.planes.some((q) => q.comercioId === p.comercioId && q.tipo === p.tipo && q.desde > p.desde && q.estadoPago !== 'anulado')).map((p) => aPlanDemo(a, p))
}
