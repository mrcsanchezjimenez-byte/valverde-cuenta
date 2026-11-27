import qrcode from 'qrcode-generator'
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import type { EstadoEntidad, EstadoEvento, Municipio } from '../../../compartido/tipos.ts'
import { api } from '../api.ts'

/** Carga datos del servidor y permite recargarlos. */
export function useCarga<T>(ruta: string | null) {
  const [datos, setDatos] = useState<T | null>(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(Boolean(ruta))

  const recargar = useCallback(async () => {
    if (!ruta) return
    setCargando(true)
    try {
      setDatos(await api<T>('GET', ruta))
      setError('')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setCargando(false)
    }
  }, [ruta])

  useEffect(() => {
    void recargar()
  }, [recargar])

  return { datos, error, cargando, recargar }
}

export const useMunicipios = (todos = false) => useCarga<Municipio[]>(todos ? '/municipios/todos' : '/publico/municipios')

/** Envoltorio de una acción con botón: evita dobles clics y enseña el error. */
export function useAccion() {
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')
  const hacer = useCallback(async (fn: () => Promise<unknown>) => {
    setOcupado(true)
    setError('')
    try {
      await fn()
      return true
    } catch (e) {
      setError((e as Error).message)
      return false
    } finally {
      setOcupado(false)
    }
  }, [])
  return { ocupado, error, setError, hacer }
}

export const Fallo = ({ children }: { children: ReactNode }) =>
  children ? <p className="g-error" role="alert">{children}</p> : null

export const Bien = ({ children }: { children: ReactNode }) =>
  children ? <p className="g-bien" role="status">{children}</p> : null

export const Cargando = () => <p className="g-suave">Cargando…</p>

const TEXTO_ESTADO: Record<EstadoEvento | EstadoEntidad, string> = {
  borrador: 'Borrador', pendiente: 'Pendiente de revisión', publicado: 'Publicado', rechazado: 'No publicado',
  cancelado: 'Cancelado', retirado: 'Retirado', verificada: 'Verificada', rechazada: 'Rechazada', suspendida: 'Suspendida',
}

export const Estado = ({ estado }: { estado: EstadoEvento | EstadoEntidad }) =>
  <span className={`g-estado g-estado-${estado}`}>{TEXTO_ESTADO[estado]}</span>

const fmt = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
export const fechaCorta = (local: string) => fmt.format(new Date(local))
const fmtIso = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' })
export const fechaIso = (iso: string) => fmtIso.format(new Date(iso))

/** Código QR dibujado en SVG (sin imágenes externas). */
export function Qr({ texto, tam = 200 }: { texto: string; tam?: number }) {
  const { n, d } = useMemo(() => {
    const qr = qrcode(0, 'M')
    qr.addData(texto)
    qr.make()
    const n = qr.getModuleCount()
    let d = ''
    for (let f = 0; f < n; f++) for (let c = 0; c < n; c++) if (qr.isDark(f, c)) d += `M${c} ${f}h1v1h-1z`
    return { n, d }
  }, [texto])
  return (
    <svg className="g-qr" width={tam} height={tam} viewBox={`-2 -2 ${n + 4} ${n + 4}`} role="img" aria-label="Código QR">
      <rect x="-2" y="-2" width={n + 4} height={n + 4} fill="#fff" />
      <path d={d} fill="#000" shapeRendering="crispEdges" />
    </svg>
  )
}

/** Pide un motivo antes de confirmar (rechazar, retirar, suspender). */
export function PedirMotivo({ titulo, boton, alConfirmar, alCancelar }: {
  titulo: string
  boton: string
  alConfirmar: (motivo: string) => Promise<unknown>
  alCancelar: () => void
}) {
  const [motivo, setMotivo] = useState('')
  const { ocupado, error, hacer } = useAccion()
  const enviar = (e: FormEvent) => {
    e.preventDefault()
    void hacer(() => alConfirmar(motivo))
  }
  return (
    <form className="g-caja g-motivo" onSubmit={enviar}>
      <label className="g-campo">
        <span>{titulo}</span>
        <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} maxLength={600} required minLength={5} autoFocus
          placeholder="Lo leerá la entidad. Explica qué tiene que cambiar." />
      </label>
      <Fallo>{error}</Fallo>
      <div className="g-fila-botones">
        <button type="button" className="g-boton g-boton-suave" onClick={alCancelar}>Cancelar</button>
        <button className="g-boton g-boton-peligro" disabled={ocupado}>{boton}</button>
      </div>
    </form>
  )
}
