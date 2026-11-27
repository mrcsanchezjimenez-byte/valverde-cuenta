import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { escribir, leer } from '../nativo'
import { fecha, noHaTerminado } from './fechas'
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
export const URL_GESTION = import.meta.env.VITE_URL_GESTION ?? 'http://localhost:5274/gestion/'

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
    const { EVENTOS } = await import('../../compartido/ejemplo.ts')
    poner({ eventos: ordenar(EVENTOS), estado: 'listo' })
    return
  }
  enCurso ??= (async () => {
    try {
      const r = await fetch(`${API}/api/publico/eventos`, { credentials: 'omit' })
      if (!r.ok) throw new Error(String(r.status))
      const datos: unknown = await r.json()
      if (!Array.isArray(datos)) throw new Error('formato')
      const eventos = ordenar(datos.filter(esEvento))
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
    if (document.visibilityState === 'visible' && Date.now() - ultimaDescarga > REFRESCO_MS) void descargar()
  })
}

export function useAgenda() {
  const a = useSyncExternalStore(suscribir, () => agenda)
  useEffect(() => {
    if (!ultimaDescarga || Date.now() - ultimaDescarga > REFRESCO_MS) void descargar()
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
