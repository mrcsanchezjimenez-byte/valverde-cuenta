import type {
  Campana, CampanaPublica, Capacidades, CategoriaComercio, ComercioGestion, ComercioPublico, DatosComercio, EstadoComercio,
  EstadoOferta, EstadoPago, Oferta, OfertaPublica, Plan, TipoPlan,
} from '../compartido/tipos.ts'
import { urlImagen } from '../compartido/tipos.ts'
import { ahoraLocal, ejecutar, uno, varios } from './bd.ts'
import { fallo } from './contexto.ts'
import { enlaceGestion, enviarCorreo } from './correo.ts'

/**
 * Comercios: guía con ficha básica gratis y planes de pago (ver docs/politica-cobros.md).
 * Lo de pago se activa solo por fechas: un plan cuenta si hoy está entre su inicio y su fin y no está anulado.
 */

export const hoy = () => ahoraLocal().slice(0, 10)

interface FilaComercio {
  id: number
  slug: string
  nombre: string
  categoria: CategoriaComercio
  nif: string | null
  descripcion: string
  direccion: string
  municipio_id: number
  municipio: string
  lat: number
  lng: number
  telefono: string
  whatsapp: string
  email_publico: string
  web: string
  instagram: string
  facebook: string
  horario: string
  logo: string | null
  fotos: string
  persona_contacto: string
  telefono_contacto: string
  estado: EstadoComercio
  motivo: string | null
  nota: string
  cambios: string | null
  creado: string
}

const SELECT = 'SELECT c.*, m.nombre AS municipio FROM comercios c JOIN municipios m ON m.id = c.municipio_id'

export function leerComercio(id: number) {
  const c = uno<FilaComercio>(`${SELECT} WHERE c.id = ?`, id)
  if (!c) throw fallo(404, 'Ese comercio no existe.')
  return c
}

// ——— Planes y capacidades ———

interface FilaPlan {
  id: number
  comercio_id: number
  comercio_nombre: string
  tipo: TipoPlan
  campana_id: number | null
  campana_nombre: string | null
  desde: string
  hasta: string
  importe_centimos: number
  estado_pago: EstadoPago
  metodo: string
  factura: string
  pagado_el: string | null
  nota: string
}

const SELECT_PLAN = `SELECT p.*, c.nombre AS comercio_nombre, ca.nombre AS campana_nombre
  FROM planes p JOIN comercios c ON c.id = p.comercio_id LEFT JOIN campanas ca ON ca.id = p.campana_id`

export const aPlan = (p: FilaPlan, dia = hoy()): Plan => ({
  id: p.id, comercioId: p.comercio_id, comercioNombre: p.comercio_nombre, tipo: p.tipo, campanaId: p.campana_id, campanaNombre: p.campana_nombre,
  desde: p.desde, hasta: p.hasta, importe: p.importe_centimos / 100, estadoPago: p.estado_pago, metodo: p.metodo, factura: p.factura,
  pagadoEl: p.pagado_el, nota: p.nota, vigencia: dia < p.desde ? 'futuro' : dia > p.hasta ? 'caducado' : 'activo',
})

export const planesDe = (comercioId: number) =>
  varios<FilaPlan>(`${SELECT_PLAN} WHERE p.comercio_id = ? ORDER BY p.desde DESC`, comercioId).map((p) => aPlan(p))

export const listarPlanes = (donde = '1 = 1', ...vs: (string | number)[]) =>
  varios<FilaPlan>(`${SELECT_PLAN} WHERE ${donde} ORDER BY p.desde DESC`, ...vs).map((p) => aPlan(p))

/** Planes que cuentan hoy (por fechas y no anulados), por comercio. */
function planesActivos(dia = hoy()) {
  const filas = varios<{ comercio_id: number; tipo: TipoPlan; campana_id: number | null; hasta: string; estado_pago: EstadoPago }>(
    "SELECT comercio_id, tipo, campana_id, hasta, estado_pago FROM planes WHERE desde <= ? AND hasta >= ? AND estado_pago <> 'anulado'", dia, dia)
  const porComercio = new Map<number, typeof filas>()
  for (const f of filas) porComercio.set(f.comercio_id, [...(porComercio.get(f.comercio_id) ?? []), f])
  return porComercio
}

const capacidadesDe = (planes: { tipo: TipoPlan; campana_id: number | null }[] = []): Capacidades => ({
  escaparate: planes.some((p) => p.tipo === 'escaparate' || p.tipo === 'destacado'),
  destacado: planes.some((p) => p.tipo === 'destacado'),
  ofertas: planes.some((p) => ['escaparate', 'destacado', 'campana', 'promocion'].includes(p.tipo)),
  campanas: planes.filter((p) => p.tipo === 'campana' && p.campana_id).map((p) => p.campana_id!),
})

export const capacidades = (comercioId: number) => capacidadesDe(planesActivos().get(comercioId))

const nivel = (c: Capacidades): ComercioPublico['nivel'] => (c.destacado ? 'destacado' : c.escaparate ? 'escaparate' : 'basica')

// ——— Ofertas ———

interface FilaOferta {
  id: number
  comercio_id: number
  comercio_nombre: string
  comercio_slug: string
  titulo: string
  texto: string
  imagen: string | null
  desde: string
  hasta: string
  campana_id: number | null
  campana_nombre: string | null
  estado: EstadoOferta
  motivo: string | null
  creado: string
}

const SELECT_OFERTA = `SELECT o.*, c.nombre AS comercio_nombre, c.slug AS comercio_slug, ca.nombre AS campana_nombre
  FROM ofertas o JOIN comercios c ON c.id = o.comercio_id LEFT JOIN campanas ca ON ca.id = o.campana_id`

export const aOferta = (o: FilaOferta): Oferta => ({
  id: o.id, comercioId: o.comercio_id, comercioNombre: o.comercio_nombre, titulo: o.titulo, texto: o.texto, imagen: o.imagen,
  imagenUrl: o.imagen ? urlImagen(o.imagen) : null, desde: o.desde, hasta: o.hasta, campanaId: o.campana_id, estado: o.estado,
  motivo: o.motivo, creado: o.creado,
})

const aOfertaPublica = (o: FilaOferta): OfertaPublica => ({
  id: o.id, titulo: o.titulo, texto: o.texto, imagen: o.imagen ? urlImagen(o.imagen) : null, hasta: o.hasta,
  comercio: { slug: o.comercio_slug, nombre: o.comercio_nombre }, campana: o.campana_nombre,
})

export const listarOfertas = (donde: string, ...vs: (string | number)[]) =>
  varios<FilaOferta>(`${SELECT_OFERTA} WHERE ${donde} ORDER BY o.creado DESC`, ...vs).map(aOferta)

export function leerOferta(id: number) {
  const o = uno<FilaOferta>(`${SELECT_OFERTA} WHERE o.id = ?`, id)
  if (!o) throw fallo(404, 'Esa oferta no existe.')
  return o
}

/** Ofertas que se ven hoy: publicadas, en fechas, de un comercio verificado que tiene un plan que las permite. */
export function ofertasPublicas(comercioId?: number) {
  const dia = hoy()
  const activos = planesActivos(dia)
  return varios<FilaOferta>(
    `${SELECT_OFERTA} WHERE o.estado = 'publicada' AND o.desde <= ? AND o.hasta >= ? AND c.estado = 'verificado' ${comercioId ? 'AND o.comercio_id = ?' : ''}
     ORDER BY o.hasta`, dia, dia, ...(comercioId ? [comercioId] : []),
  ).filter((o) => capacidadesDe(activos.get(o.comercio_id)).ofertas).map(aOfertaPublica)
}

// ——— Lo público ———

function aPublico(c: FilaComercio, cap: Capacidades, ofertas: OfertaPublica[]): ComercioPublico {
  const base: ComercioPublico = {
    slug: c.slug, nombre: c.nombre, categoria: c.categoria, direccion: c.direccion, municipio: c.municipio, lat: c.lat, lng: c.lng,
    telefono: c.telefono, horario: c.horario, nivel: nivel(cap), ofertas,
  }
  if (!cap.escaparate) return base
  return {
    ...base, descripcion: c.descripcion, logo: c.logo ? urlImagen(c.logo) : undefined,
    fotos: (JSON.parse(c.fotos) as string[]).map(urlImagen), whatsapp: c.whatsapp || undefined, emailPublico: c.email_publico || undefined,
    web: c.web || undefined, instagram: c.instagram || undefined, facebook: c.facebook || undefined,
  }
}

export function comerciosPublicos() {
  const activos = planesActivos()
  const ofertas = ofertasPublicas()
  return varios<FilaComercio>(`${SELECT} WHERE c.estado = 'verificado' ORDER BY c.nombre`).map((c) =>
    aPublico(c, capacidadesDe(activos.get(c.id)), ofertas.filter((o) => o.comercio.slug === c.slug)))
}

export function comercioPublico(slug: string) {
  const c = uno<FilaComercio>(`${SELECT} WHERE c.slug = ? AND c.estado = 'verificado'`, slug)
  if (!c) throw fallo(404, 'Ese comercio no está en la guía.')
  return { id: c.id, comercio: aPublico(c, capacidades(c.id), ofertasPublicas(c.id)) }
}

/** Una visita a la ficha: solo se cuenta el número por día. */
export function contarVisita(comercioId: number) {
  ejecutar(`INSERT INTO visitas_comercio (comercio_id, dia, cuenta) VALUES (?, ?, 1)
            ON CONFLICT (comercio_id, dia) DO UPDATE SET cuenta = cuenta + 1`, comercioId, hoy())
}

export function visitas30(comercioId: number) {
  const desde = ahoraLocal(new Date(Date.now() - 30 * 86400_000)).slice(0, 10)
  return uno<{ n: number }>('SELECT COALESCE(SUM(cuenta), 0) AS n FROM visitas_comercio WHERE comercio_id = ? AND dia >= ?', comercioId, desde)?.n ?? 0
}

/** Comercios con plan Destacado activo: los que pueden salir como «Patrocinado». */
export function patrocinados() {
  const activos = planesActivos()
  return varios<FilaComercio>(`${SELECT} WHERE c.estado = 'verificado'`)
    .filter((c) => capacidadesDe(activos.get(c.id)).destacado)
    .map((c) => aPublico(c, capacidadesDe(activos.get(c.id)), ofertasPublicas(c.id)))
}

/** La campaña de hoy, si hay alguna activa: sus comercios y sus ofertas. */
export function campanaActual(): CampanaPublica | null {
  const dia = hoy()
  const ca = uno<{ id: number; slug: string; nombre: string; descripcion: string; desde: string; hasta: string }>(
    'SELECT * FROM campanas WHERE activa = 1 AND desde <= ? AND hasta >= ? ORDER BY desde DESC LIMIT 1', dia, dia)
  if (!ca) return null
  const activos = planesActivos(dia)
  const comercios = varios<FilaComercio>(`${SELECT} WHERE c.estado = 'verificado'`).filter((c) => capacidadesDe(activos.get(c.id)).campanas.includes(ca.id))
  const ids = new Set(comercios.map((c) => c.slug))
  return {
    slug: ca.slug, nombre: ca.nombre, descripcion: ca.descripcion, desde: ca.desde, hasta: ca.hasta,
    comercios: comercios.map((c) => ({ slug: c.slug, nombre: c.nombre, categoria: c.categoria, logo: c.logo ? urlImagen(c.logo) : null })),
    ofertas: ofertasPublicas().filter((o) => ids.has(o.comercio.slug)),
  }
}

/** Una imagen de comercio es pública si es su logo o una foto de su escaparate, o la de una oferta que se ve hoy. */
export function imagenPublicaDeComercio(clave: string) {
  const c = uno<{ id: number }>("SELECT id FROM comercios WHERE estado = 'verificado' AND (logo = ? OR fotos LIKE ?)", clave, `%"${clave}"%`)
  if (c && capacidades(c.id).escaparate) return true
  return ofertasPublicas().some((o) => o.imagen === urlImagen(clave)) || undefined
}

// ——— Lo de dirección ———

export function aGestion(c: FilaComercio): ComercioGestion {
  const cap = capacidades(c.id)
  const planes = planesDe(c.id)
  const activos = planes.filter((p) => p.vigencia === 'activo' && p.estadoPago !== 'anulado')
  const principal = activos.find((p) => p.tipo === 'destacado') ?? activos.find((p) => p.tipo === 'escaparate') ?? activos[0]
  const fotos = JSON.parse(c.fotos) as string[]
  return {
    id: c.id, slug: c.slug, nombre: c.nombre, categoria: c.categoria, descripcion: c.descripcion, direccion: c.direccion,
    municipioId: c.municipio_id, municipio: c.municipio, lat: c.lat, lng: c.lng, telefono: c.telefono, whatsapp: c.whatsapp,
    emailPublico: c.email_publico, web: c.web, instagram: c.instagram, facebook: c.facebook, horario: c.horario, logo: c.logo, fotos,
    nif: c.nif, personaContacto: c.persona_contacto, telefonoContacto: c.telefono_contacto, estado: c.estado, motivo: c.motivo, nota: c.nota,
    cambios: c.cambios ? (JSON.parse(c.cambios) as DatosComercio) : null,
    logoUrl: c.logo ? urlImagen(c.logo) : null, fotosUrl: fotos.map(urlImagen), capacidades: cap,
    planActual: principal?.tipo ?? null, caduca: principal?.hasta ?? null, pagoPendiente: planes.some((p) => p.estadoPago === 'pendiente' && p.vigencia !== 'caducado'),
    email: uno<{ email: string }>('SELECT email FROM usuarios WHERE comercio_id = ? ORDER BY id LIMIT 1', c.id)?.email ?? null,
    visitas30: visitas30(c.id), creado: c.creado,
  }
}

export const listarComercios = (donde = '1 = 1', ...vs: (string | number)[]) =>
  varios<FilaComercio>(`${SELECT} WHERE ${donde} ORDER BY c.nombre`, ...vs).map(aGestion)

export function slugComercio(nombre: string) {
  const base = nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'comercio'
  let slug = base
  for (let i = 2; uno('SELECT 1 FROM comercios WHERE slug = ?', slug); i++) slug = `${base}-${i}`
  return slug
}

const columnas = (d: DatosComercio) => [
  d.nombre, d.categoria, d.descripcion, d.direccion, d.municipioId, d.lat, d.lng, d.telefono, d.whatsapp, d.emailPublico,
  d.web, d.instagram, d.facebook, d.horario, d.logo, JSON.stringify(d.fotos),
] as const

export function crearComercio(d: DatosComercio, extra: { nif: string | null; personaContacto: string; telefonoContacto: string; estado: EstadoComercio }) {
  const r = ejecutar(
    `INSERT INTO comercios (slug, nombre, categoria, descripcion, direccion, municipio_id, lat, lng, telefono, whatsapp, email_publico,
       web, instagram, facebook, horario, logo, fotos, nif, persona_contacto, telefono_contacto, estado)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    slugComercio(d.nombre), ...columnas(d), extra.nif, extra.personaContacto, extra.telefonoContacto, extra.estado,
  )
  return Number(r.lastInsertRowid)
}

export function guardarFicha(id: number, d: DatosComercio) {
  ejecutar(
    `UPDATE comercios SET nombre = ?, categoria = ?, descripcion = ?, direccion = ?, municipio_id = ?, lat = ?, lng = ?, telefono = ?,
       whatsapp = ?, email_publico = ?, web = ?, instagram = ?, facebook = ?, horario = ?, logo = ?, fotos = ?, cambios = NULL WHERE id = ?`,
    ...columnas(d), id,
  )
}

/** Correo y aviso en el panel del comercio. Devuelve su nombre para confirmarlo a dirección. */
export async function avisarComercio(comercioId: number, tipo: 'bien' | 'mal' | 'info', titulo: string, texto: string) {
  ejecutar('INSERT INTO avisos_comercio (comercio_id, tipo, titulo, texto) VALUES (?, ?, ?, ?)', comercioId, tipo, titulo, texto)
  const gente = varios<{ email: string; nombre: string }>('SELECT email, nombre FROM usuarios WHERE comercio_id = ? AND activo = 1', comercioId)
  await Promise.all(gente.map((u) => enviarCorreo({
    para: u.email, asunto: `${titulo} · Valverde Cuenta`,
    texto: `Hola, ${u.nombre}:\n\n${texto}\n\nPanel de tu comercio: ${enlaceGestion('/')}`,
  })))
  return uno<{ nombre: string }>('SELECT nombre FROM comercios WHERE id = ?', comercioId)?.nombre ?? ''
}

export function campanas(): Campana[] {
  const activos = planesActivos()
  const en = (id: number) => [...activos.values()].filter((ps) => ps.some((p) => p.tipo === 'campana' && p.campana_id === id)).length
  return varios<{ id: number; slug: string; nombre: string; descripcion: string; desde: string; hasta: string; activa: number }>(
    'SELECT * FROM campanas ORDER BY desde DESC').map((c) => ({ ...c, activa: Boolean(c.activa), comercios: en(c.id) }))
}

/** Planes que caducan en los próximos 15 días y que aún no tienen renovación apuntada. */
export function renovacionesProximas() {
  const dia = hoy()
  const limite = ahoraLocal(new Date(Date.now() + 15 * 86400_000)).slice(0, 10)
  return listarPlanes(`p.estado_pago <> 'anulado' AND p.hasta >= ? AND p.hasta <= ? AND p.tipo IN ('escaparate','destacado')
    AND NOT EXISTS (SELECT 1 FROM planes q WHERE q.comercio_id = p.comercio_id AND q.tipo = p.tipo AND q.desde > p.desde AND q.estado_pago <> 'anulado')`, dia, limite)
}
