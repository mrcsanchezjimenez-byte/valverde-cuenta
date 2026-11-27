import { randomBytes } from 'node:crypto'
import type { ArchivoGestion, ArchivoPublico, Consentimiento, EstadoHistoria, Historia, HistoriaGestion, Lugar, LugarGestion } from '../compartido/tipos.ts'
import { firmaPublica } from '../compartido/tipos.ts'
import { borrarArchivo, type ArchivoPreparado } from './archivos.ts'
import { ahoraLocal, ejecutar, transaccion, uno, varios } from './bd.ts'
import { config } from './config.ts'
import { fallo } from './contexto.ts'

/**
 * Historias del pueblo y lugares con placa QR.
 * Las historias las manda cualquiera (sin cuenta) o las mete dirección tras una entrevista;
 * ninguna se ve hasta que dirección la publica.
 */

interface FilaHistoria {
  id: number
  slug: string
  estado: EstadoHistoria
  origen: 'web' | 'entrevista'
  titulo: string
  texto: string
  epoca: string
  lugar_id: number | null
  lugar_slug: string | null
  lugar_nombre: string | null
  lugar_texto: string
  firma: 'nombre' | 'anonimo'
  autor: string
  contacto_nombre: string
  contacto_email: string
  contacto_telefono: string
  consentimiento: string
  motivo: string | null
  nota: string
  creado: string
  actualizado: string
}

interface FilaArchivo {
  id: number
  clave: string
  historia_id: number
  tipo: 'foto' | 'audio'
  mime: string
  bytes: number
  publicar: number
  pie: string
  orden: number
}

interface FilaLugar {
  id: number
  slug: string
  nombre: string
  descripcion: string
  direccion: string
  lat: number
  lng: number
  anfitrion: string
  activo: number
}

const SELECT = `SELECT h.*, l.slug AS lugar_slug, l.nombre AS lugar_nombre FROM historias h LEFT JOIN lugares l ON l.id = h.lugar_id`

export const urlArchivoPublico = (clave: string) => `/api/publico/archivos/${clave}`
export const urlArchivoDireccion = (clave: string) => `/api/direccion/archivos/${clave}`
export const urlQr = (slug: string) => `${config.urlApp}#/lugar/${slug}?qr=1`

const archivosDe = (historiaId: number) => varios<FilaArchivo>('SELECT * FROM archivos WHERE historia_id = ? ORDER BY tipo DESC, orden, id', historiaId)

export function aHistoriaPublica(h: FilaHistoria): Historia {
  return {
    slug: h.slug, titulo: h.titulo, texto: h.texto, epoca: h.epoca, autor: firmaPublica(h.firma, h.autor),
    lugar: h.lugar_slug ? { slug: h.lugar_slug, nombre: h.lugar_nombre! } : null, lugarTexto: h.lugar_texto,
    archivos: archivosDe(h.id).filter((a) => a.publicar).map((a): ArchivoPublico => ({ clave: a.clave, tipo: a.tipo, url: urlArchivoPublico(a.clave), pie: a.pie })),
    fecha: h.actualizado,
  }
}

export function aHistoriaGestion(h: FilaHistoria): HistoriaGestion {
  return {
    id: h.id, slug: h.slug, estado: h.estado, origen: h.origen, titulo: h.titulo, texto: h.texto, epoca: h.epoca,
    lugarId: h.lugar_id, lugarNombre: h.lugar_nombre, lugarTexto: h.lugar_texto, firma: h.firma, autor: h.autor,
    contactoNombre: h.contacto_nombre, contactoEmail: h.contacto_email, contactoTelefono: h.contacto_telefono,
    consentimiento: JSON.parse(h.consentimiento), motivo: h.motivo, nota: h.nota, creado: h.creado, actualizado: h.actualizado,
    archivos: archivosDe(h.id).map((a): ArchivoGestion => ({
      id: a.id, clave: a.clave, tipo: a.tipo, url: urlArchivoDireccion(a.clave), pie: a.pie, mime: a.mime, bytes: a.bytes,
      publicar: Boolean(a.publicar), orden: a.orden,
    })),
  }
}

export const historiasPublicadas = () => varios<FilaHistoria>(`${SELECT} WHERE h.estado = 'publicada' ORDER BY h.actualizado DESC`).map(aHistoriaPublica)

export function historiaPublica(slug: string) {
  const h = uno<FilaHistoria>(`${SELECT} WHERE h.slug = ? AND h.estado = 'publicada'`, slug)
  if (!h) throw fallo(404, 'Esa historia no existe.')
  return aHistoriaPublica(h)
}

export function historiaParaDireccion(id: number) {
  const h = uno<FilaHistoria>(`${SELECT} WHERE h.id = ?`, id)
  if (!h) throw fallo(404, 'Esa historia no existe.')
  return h
}

export const listarHistorias = (estado?: EstadoHistoria) =>
  varios<FilaHistoria>(`${SELECT} ${estado ? 'WHERE h.estado = ?' : ''} ORDER BY h.creado DESC`, ...(estado ? [estado] : [])).map(aHistoriaGestion)

const nuevoSlug = () => randomBytes(8).toString('base64url').toLowerCase().replace(/[^a-z0-9]/g, 'x').slice(0, 10)

export interface DatosHistoria {
  titulo: string
  texto: string
  epoca: string
  lugarId: number | null
  lugarTexto: string
  firma: 'nombre' | 'anonimo'
  autor: string
  contactoNombre: string
  contactoEmail: string
  contactoTelefono: string
}

export function comprobarLugar(id: number | null) {
  if (id !== null && !uno('SELECT 1 FROM lugares WHERE id = ? AND activo = 1', id)) throw fallo(400, 'Ese lugar no existe.')
}

/** Guarda una historia nueva (pendiente) con sus archivos ya comprobados y en disco. */
export function crearHistoria(d: DatosHistoria, origen: 'web' | 'entrevista', aceptados: Consentimiento[], version: string, archivos: ArchivoPreparado[]) {
  try {
    return transaccion(() => {
      const r = ejecutar(
        `INSERT INTO historias (slug, estado, origen, titulo, texto, epoca, lugar_id, lugar_texto, firma, autor,
           contacto_nombre, contacto_email, contacto_telefono, consentimiento)
         VALUES (?, 'pendiente', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        nuevoSlug(), origen, d.titulo, d.texto, d.epoca, d.lugarId, d.lugarTexto, d.firma, d.autor,
        d.contactoNombre, d.contactoEmail, d.contactoTelefono, JSON.stringify({ version, aceptados, fecha: new Date().toISOString() }),
      )
      const id = Number(r.lastInsertRowid)
      archivos.forEach((a, i) => ejecutar('INSERT INTO archivos (clave, historia_id, tipo, mime, bytes, orden) VALUES (?, ?, ?, ?, ?, ?)',
        a.clave, id, a.tipo, a.mime, a.bytes, i))
      return id
    })
  } catch (e) {
    // Si no se ha podido guardar, que no queden archivos sueltos en disco.
    archivos.forEach((a) => borrarArchivo(a.clave))
    throw e
  }
}

/** Borrado definitivo (derecho de supresión): la historia y sus archivos en disco. */
export function borrarHistoria(id: number) {
  const claves = archivosDe(id).map((a) => a.clave)
  ejecutar('DELETE FROM historias WHERE id = ?', id)
  claves.forEach(borrarArchivo)
}

export function archivoPublico(clave: string) {
  const a = uno<{ mime: string }>(
    `SELECT a.mime FROM archivos a JOIN historias h ON h.id = a.historia_id
      WHERE a.clave = ? AND a.publicar = 1 AND h.estado = 'publicada'`, clave)
  if (!a) throw fallo(404, 'No existe.')
  return { clave, mime: a.mime }
}

export function archivoDireccion(clave: string) {
  const a = uno<{ mime: string }>('SELECT mime FROM archivos WHERE clave = ?', clave)
  if (!a) throw fallo(404, 'No existe.')
  return { clave, mime: a.mime }
}

// ——— Lugares ———

const historiasPorLugar = () => new Map(varios<{ lugar_id: number; n: number }>(
  "SELECT lugar_id, COUNT(*) AS n FROM historias WHERE estado = 'publicada' AND lugar_id IS NOT NULL GROUP BY lugar_id").map((x) => [x.lugar_id, x.n]))

const aLugar = (l: FilaLugar, n: number): Lugar =>
  ({ slug: l.slug, nombre: l.nombre, descripcion: l.descripcion, direccion: l.direccion, lat: l.lat, lng: l.lng, historias: n })

export function lugaresPublicos() {
  const n = historiasPorLugar()
  return varios<FilaLugar>('SELECT * FROM lugares WHERE activo = 1 ORDER BY nombre').map((l) => aLugar(l, n.get(l.id) ?? 0))
}

export function lugarPublico(slug: string) {
  const l = uno<FilaLugar>('SELECT * FROM lugares WHERE slug = ? AND activo = 1', slug)
  if (!l) throw fallo(404, 'Ese lugar no existe.')
  const historias = varios<FilaHistoria>(`${SELECT} WHERE h.lugar_id = ? AND h.estado = 'publicada' ORDER BY h.actualizado DESC`, l.id).map(aHistoriaPublica)
  return { ...aLugar(l, historias.length), historiasLista: historias, id: l.id }
}

/** Un escaneo de la placa: solo se cuenta el número por día, sin nada de quien escanea. */
export function contarEscaneo(lugarId: number) {
  ejecutar(`INSERT INTO escaneos (lugar_id, dia, cuenta) VALUES (?, ?, 1)
            ON CONFLICT (lugar_id, dia) DO UPDATE SET cuenta = cuenta + 1`, lugarId, ahoraLocal().slice(0, 10))
}

export function lugaresGestion(): LugarGestion[] {
  const n = historiasPorLugar()
  const desde = ahoraLocal(new Date(Date.now() - 30 * 86400_000)).slice(0, 10)
  const total = new Map(varios<{ lugar_id: number; n: number }>('SELECT lugar_id, SUM(cuenta) AS n FROM escaneos GROUP BY lugar_id').map((x) => [x.lugar_id, x.n]))
  const recientes = new Map(varios<{ lugar_id: number; n: number }>('SELECT lugar_id, SUM(cuenta) AS n FROM escaneos WHERE dia >= ? GROUP BY lugar_id', desde).map((x) => [x.lugar_id, x.n]))
  const pendientes = new Map(varios<{ lugar_id: number; n: number }>(
    "SELECT lugar_id, COUNT(*) AS n FROM historias WHERE estado = 'pendiente' AND lugar_id IS NOT NULL GROUP BY lugar_id").map((x) => [x.lugar_id, x.n]))
  return varios<FilaLugar>('SELECT * FROM lugares ORDER BY activo DESC, nombre').map((l) => ({
    ...aLugar(l, n.get(l.id) ?? 0), id: l.id, anfitrion: l.anfitrion, activo: Boolean(l.activo),
    pendientes: pendientes.get(l.id) ?? 0, escaneosTotal: total.get(l.id) ?? 0, escaneos30: recientes.get(l.id) ?? 0, urlQr: urlQr(l.slug),
  }))
}

/** Slug a partir del nombre («Ermita de la Trinidad» → «ermita-de-la-trinidad»). No cambia nunca: va en la placa. */
export function slugLugar(nombre: string) {
  const base = nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'lugar'
  let slug = base
  for (let i = 2; uno('SELECT 1 FROM lugares WHERE slug = ?', slug); i++) slug = `${base}-${i}`
  return slug
}
