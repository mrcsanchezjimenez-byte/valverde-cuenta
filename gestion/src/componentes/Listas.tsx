import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { EstadoEntidad, EventoGestion } from '../../../compartido/tipos.ts'
import { TIPOS_ENTIDAD } from '../../../compartido/tipos.ts'
import { Icono } from './Iconos.tsx'
import { Estado } from './piezas.tsx'

const dia = new Intl.DateTimeFormat('es-ES', { day: 'numeric' })
const mes = new Intl.DateTimeFormat('es-ES', { month: 'short' })
const semana = new Intl.DateTimeFormat('es-ES', { weekday: 'short' })
const hora = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' })
const mesLargo = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' })

export const nombreMes = (local: string) => {
  const t = mesLargo.format(new Date(local))
  return t.charAt(0).toUpperCase() + t.slice(1)
}

/** Fecha en forma de taco de calendario, como en la app. */
export function TacoFecha({ local }: { local: string }) {
  const d = new Date(local)
  return (
    <span className="g-taco" aria-hidden="true">
      <small>{semana.format(d).replace('.', '')}</small>
      <b>{dia.format(d)}</b>
      <small>{mes.format(d).replace('.', '')}</small>
    </span>
  )
}

/** Una fila de evento: se pulsa entera. */
export function FilaEvento({ e, a, extra, mostrarEntidad = true }: { e: EventoGestion; a: string; extra?: ReactNode; mostrarEntidad?: boolean }) {
  const pasado = e.fin < new Date().toISOString().slice(0, 16)
  return (
    <Link to={a} className={pasado ? 'g-fila g-fila-evento pasado' : 'g-fila g-fila-evento'}>
      {e.imagenUrl ? <img className="g-fila-miniatura" src={e.imagenUrl} alt="" /> : <TacoFecha local={e.inicio} />}
      <span className="g-fila-cuerpo">
        <b>{e.titulo}</b>
        <small>
          {e.imagenUrl && <>{new Date(e.inicio).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })} · </>}
          {hora.format(new Date(e.inicio))} · {e.lugar}
          {mostrarEntidad && <> · <span className="g-quien">{e.organizador ?? e.entidadNombre}</span></>}
        </small>
        {extra}
      </span>
      <span className="g-fila-final">
        <Estado estado={e.estado} />
        <Icono n="adelante" tam={18} />
      </span>
    </Link>
  )
}

export interface EntidadLista {
  id: number
  nombre: string
  tipo: string
  municipio: string
  estado: EstadoEntidad
  eventos: number
  interna: boolean
  emailVerificado?: boolean
}

const iniciales = (nombre: string) =>
  nombre.split(/\s+/).filter((p) => p.length > 2 || /^[A-ZÁÉÍÓÚ]/.test(p)).slice(0, 2).map((p) => p[0]).join('').toUpperCase()

export const nombreTipo = (t: string) => TIPOS_ENTIDAD.find((x) => x.id === t)?.nombre ?? t

export function FilaEntidad({ e }: { e: EntidadLista }) {
  return (
    <Link to={`/entidades/${e.id}`} className={e.estado === 'pendiente' ? 'g-fila g-fila-destacada' : 'g-fila'}>
      <span className="g-avatar" aria-hidden="true">{iniciales(e.nombre)}</span>
      <span className="g-fila-cuerpo">
        <b>{e.nombre}</b>
        <small>{nombreTipo(e.tipo)} · {e.municipio} · {e.eventos === 1 ? '1 evento' : `${e.eventos} eventos`}</small>
      </span>
      <span className="g-fila-final">
        {e.estado === 'pendiente' ? <span className="g-revisar">Revisar</span> : <Estado estado={e.estado} />}
        <Icono n="adelante" tam={18} />
      </span>
    </Link>
  )
}

/** Buscador con lupa y botón para borrar. */
export function Buscador({ valor, alCambiar, texto }: { valor: string; alCambiar: (v: string) => void; texto: string }) {
  return (
    <label className="g-buscador">
      <Icono n="buscar" />
      <input type="search" value={valor} onChange={(e) => alCambiar(e.target.value)} placeholder={texto} aria-label={texto} />
      {valor && <button type="button" onClick={() => alCambiar('')} aria-label="Borrar búsqueda"><Icono n="cerrar" tam={16} /></button>}
    </label>
  )
}

/** Pestañas de filtro con su número. */
export function Filtros<T extends string>({ opciones, valor, alCambiar }: {
  opciones: { id: T; texto: string; n?: number }[]
  valor: T
  alCambiar: (v: T) => void
}) {
  return (
    <div className="g-filtros" role="tablist">
      {opciones.map((o) => (
        <button key={o.id} type="button" role="tab" aria-selected={valor === o.id} className={valor === o.id ? 'activo' : ''} onClick={() => alCambiar(o.id)}>
          {o.texto}
          {o.n !== undefined && <span className="g-cuenta-filtro">{o.n}</span>}
        </button>
      ))}
    </div>
  )
}

export function Vacio({ icono, titulo, children }: { icono: Parameters<typeof Icono>[0]['n']; titulo: string; children?: ReactNode }) {
  return (
    <div className="g-vacio">
      <span className="g-vacio-icono"><Icono n={icono} tam={26} /></span>
      <b>{titulo}</b>
      {children && <p>{children}</p>}
    </div>
  )
}
