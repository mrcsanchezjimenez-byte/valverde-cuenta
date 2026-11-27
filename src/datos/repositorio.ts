import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { escribir, leer } from '../nativo'
import { fecha, noHaTerminado } from './fechas'
import type { Historia, Lugar, MiInscripcion } from '../../compartido/tipos.ts'
import type { Evento } from './tipos'

/**
 * Único punto por el que las pantallas piden la agenda.
 *
 * - Normal: la pide al servidor y guarda una copia en el dispositivo, así abre al instante y
 *   funciona sin cobertura con lo último que se descargó.
 * - Demostración (VITE_DEMO=1, la versión de GitHub Pages): usa los eventos de ejemplo, sin servidor.
 */
export const MODO_DEMO = import.meta.env.VITE_DEMO === '1'
/** En local el propio Vite reenvía /api al servidor. En la app nativa será la dirección pública. */
const API = import.meta.env.VITE_API ?? ''
/** Panel donde las entidades publican sus eventos. */
export const URL_GESTION = import.meta.env.VITE_URL_GESTION ?? (MODO_DEMO ? './gestion/' : 'http://localhost:5274/gestion/')

const CLAVE_COPIA = 'vc.agenda'
const REFRESCO_MS = 5 * 60_000

type Estado = 'cargando' | 'listo' | 'sin-conexion'
interface Agenda {
  eventos: Evento[]
  estado: Estado
}

const ordenar = (lista: Evento[]) => [...lista].sort((a, b) => fecha(a.inicio).getTime() - fecha(b.inicio).getTime())

const copia = leer<Evento[] | null>(CLAVE_COPIA, null)
let agenda: Agenda = { eventos: ordenar(copia ?? []), estado: copia ? 'listo' : 'cargando' }
let ultimaDescarga = 0
const oyentes = new Set<() => void>()

function poner(nueva: Agenda) {
  agenda = nueva
  oyentes.forEach((o) => o())
}

/** Comprobación mínima de lo que llega: si el servidor manda algo raro, no se rompe la app. */
const esEvento = (e: unknown): e is Evento => {
  const x = e as Evento
  return Boolean(x) && typeof x.id === 'string' && typeof x.titulo === 'string' && typeof x.inicio === 'string'
    && typeof x.fin === 'string' && typeof x.lat === 'number' && typeof x.lng === 'number'
}

let enCurso: Promise<void> | null = null
async function descargar() {
  if (MODO_DEMO) {
    // Los mismos datos que el panel de la demo: lo que se aprueba allí sale aquí.
    const { eventosPublicosDemo } = await import('../../demo/almacen.ts')
    ultimaDescarga = Date.now()
    poner({ eventos: ordenar(eventosPublicosDemo()), estado: 'listo' })
    return
  }
  enCurso ??= (async () => {
    try {
      const r = await fetch(`${API}/api/publico/eventos`, { credentials: 'omit' })
      if (!r.ok) throw new Error(String(r.status))
      const datos: unknown = await r.json()
      if (!Array.isArray(datos)) throw new Error('formato')
      // Los carteles vienen con ruta del servidor: en la app nativa hay que ponerles delante su dirección.
      const eventos = ordenar(datos.filter(esEvento).map((e) => (e.imagen?.startsWith('/') ? { ...e, imagen: `${API}${e.imagen}` } : e)))
      ultimaDescarga = Date.now()
      escribir(CLAVE_COPIA, eventos)
      poner({ eventos, estado: 'listo' })
    } catch {
      poner({ ...agenda, estado: agenda.eventos.length ? 'listo' : 'sin-conexion' })
    } finally {
      enCurso = null
    }
  })()
  return enCurso
}

function suscribir(o: () => void) {
  oyentes.add(o)
  return () => {
    oyentes.delete(o)
  }
}

/** Vuelve a pedir la agenda al abrir la app y al volver a ella tras un rato. */
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && (MODO_DEMO || Date.now() - ultimaDescarga > REFRESCO_MS)) void descargar()
  })
}

export function useAgenda() {
  const a = useSyncExternalStore(suscribir, () => agenda)
  useEffect(() => {
    if (MODO_DEMO || !ultimaDescarga || Date.now() - ultimaDescarga > REFRESCO_MS) void descargar()
  }, [])
  const proximos = useMemo(() => a.eventos.filter((e) => noHaTerminado(e)), [a.eventos])
  return {
    todos: a.eventos,
    proximos,
    estado: a.estado,
    reintentar: descargar,
  }
}

export function useEvento(id: string) {
  const { todos, estado } = useAgenda()
  return { evento: todos.find((e) => e.id === id), estado }
}

// ——— Inscripciones (sin cuenta) ———

export interface DatosInscripcion {
  nombre: string
  email: string
  telefono: string
  personas: number
  acepta: boolean
  web: string
}

async function pedirJson<T>(ruta: string, cuerpo?: unknown): Promise<T> {
  let r: Response
  try {
    r = await fetch(`${API}/api/publico${ruta}`, {
      method: cuerpo === undefined ? 'GET' : 'POST',
      credentials: 'omit',
      headers: cuerpo === undefined ? {} : { 'Content-Type': 'application/json' },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    })
  } catch {
    throw new Error('No hay conexión. Inténtalo de nuevo en un momento.')
  }
  const datos = await r.json().catch(() => null) as (T & { error?: string }) | null
  if (!r.ok || !datos) throw new Error(datos?.error ?? 'Algo ha fallado. Inténtalo otra vez.')
  return datos
}

export async function apuntarme(slug: string, d: DatosInscripcion) {
  if (MODO_DEMO) {
    const { inscribirDemo } = await import('../../demo/almacen.ts')
    const r = inscribirDemo(slug, d)
    void descargar()
    return r
  }
  const r = await pedirJson<{ codigo: string; estado: 'confirmada' | 'espera'; posicion: number | null }>(`/eventos/${slug}/inscripciones`, d)
  void descargar()
  return r
}

export async function consultarInscripcion(codigo: string) {
  if (MODO_DEMO) {
    const { verInscripcionDemo } = await import('../../demo/almacen.ts')
    return verInscripcionDemo(codigo)
  }
  return pedirJson<MiInscripcion>(`/inscripciones/${codigo}`)
}

export async function cancelarMiInscripcion(codigo: string) {
  if (MODO_DEMO) {
    const { cancelarPorCodigoDemo } = await import('../../demo/almacen.ts')
    const r = cancelarPorCodigoDemo(codigo)
    void descargar()
    return r
  }
  const r = await pedirJson<MiInscripcion>(`/inscripciones/${codigo}/cancelar`, {})
  void descargar()
  return r
}

// ——— Historias del pueblo y lugares con placa ———

/** Las rutas de archivos vienen relativas al servidor: en la app nativa hay que ponerles su dirección. */
const conServidor = <T extends { archivos: { url: string }[] }>(h: T): T =>
  ({ ...h, archivos: h.archivos.map((a) => (a.url.startsWith('/') ? { ...a, url: `${API}${a.url}` } : a)) })

export async function cargarHistorias(): Promise<Historia[]> {
  if (MODO_DEMO) return (await import('../../demo/almacen.ts')).historiasPublicasDemo()
  return (await pedirJson<Historia[]>('/historias')).map(conServidor)
}

export async function cargarLugares(): Promise<Lugar[]> {
  if (MODO_DEMO) return (await import('../../demo/almacen.ts')).lugaresPublicosDemo()
  return pedirJson<Lugar[]>('/lugares')
}

/** La página del QR. Con `qr`, cuenta un escaneo de la placa. */
export async function cargarLugar(slug: string, qr: boolean): Promise<Omit<Lugar, 'historias'> & { historias: Historia[] }> {
  if (MODO_DEMO) {
    const r = (await import('../../demo/almacen.ts')).lugarPublicoDemo(slug, qr)
    return r as Omit<Lugar, 'historias'> & { historias: Historia[] }
  }
  const r = await pedirJson<Omit<Lugar, 'historias'> & { historias: Historia[] }>(`/lugares/${slug}${qr ? '?qr=1' : ''}`)
  return { ...r, historias: r.historias.map(conServidor) }
}

export async function enviarHistoria(datos: FormData) {
  if (MODO_DEMO) {
    const { guardarHistoriaDemo } = await import('../../demo/almacen.ts')
    const { prepararFoto, blobADataUrl } = await import('../../navegador/medios.ts')
    await guardarHistoriaDemo(datos, 'web', async (b, foto) =>
      foto ? blobADataUrl(await prepararFoto(new File([b], 'f.jpg', { type: b.type || 'image/jpeg' }), 900, 0.8)) : b.size <= 1_500_000 ? blobADataUrl(b) : null)
    return
  }
  let r: Response
  try {
    r = await fetch(`${API}/api/publico/historias`, { method: 'POST', credentials: 'omit', body: datos })
  } catch {
    throw new Error('No hay conexión. Tu historia no se ha enviado: inténtalo de nuevo cuando tengas cobertura.')
  }
  if (!r.ok) {
    const e = await r.json().catch(() => null) as { error?: string } | null
    throw new Error(e?.error ?? 'No se ha podido enviar. Inténtalo otra vez.')
  }
}
