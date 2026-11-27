import { useEffect, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { AVISO_INSCRIPCION, MAX_PERSONAS_INSCRIPCION } from '../../compartido/tipos.ts'
import { apuntarme, cancelarMiInscripcion, consultarInscripcion } from '../datos/repositorio'
import type { Evento } from '../datos/tipos'
import { guardarInscripcion, olvidarInscripcion, useMisInscripciones } from '../estado/almacen'
import { avisar } from '../nativo'
import { Icono } from './Iconos'

const textoPlazas = (n: number) => (n === 1 ? '1 persona' : `${n} personas`)

/** Formulario para apuntarse: nombre, un teléfono o correo y cuántas personas. */
function HojaApuntarse({ evento, alCerrar }: { evento: Evento; alCerrar: () => void }) {
  const [f, setF] = useState({ nombre: '', telefono: '', email: '', personas: 1, acepta: false, web: '' })
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const libres = evento.inscripcion?.libres ?? null

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    if (!f.telefono.trim() && !f.email.trim()) return setError('Deja un teléfono o un correo, por si hay cambios.')
    if (!f.acepta) return setError('Hay que aceptar el uso de los datos.')
    setOcupado(true)
    setError('')
    try {
      const r = await apuntarme(evento.id, { ...f, nombre: f.nombre.trim(), telefono: f.telefono.trim(), email: f.email.trim() })
      if (r.codigo) guardarInscripcion({ codigo: r.codigo, evento: evento.id, personas: f.personas, estado: r.estado })
      avisar(r.estado === 'confirmada' ? '¡Apuntado! Tienes plaza.' : `Estás en la lista de espera (puesto ${r.posicion}).`)
      alCerrar()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setOcupado(false)
    }
  }

  // Se pinta sobre toda la app (no dentro de la ficha, que tiene su propio recorte).
  return createPortal(
    <div className="velo" onClick={alCerrar}>
      <form className="hoja hoja-formulario" onClick={(e) => e.stopPropagation()} onSubmit={enviar}>
        <button type="button" className="hoja-cerrar" onClick={alCerrar} aria-label="Cerrar"><Icono n="cerrar" tam={18} /></button>
        <p className="antetitulo">Inscripción</p>
        <h3 className="titulo-hoja">{evento.titulo}</h3>
        {libres !== null && libres < f.personas && (
          <p className="aviso-espera">{libres === 0 ? 'Ya no quedan plazas' : `Solo quedan ${libres} plazas`}: te apuntamos en la lista de espera y te avisamos si queda sitio.</p>
        )}
        <label className="campo">
          <span>Nombre y apellido</span>
          <input autoComplete="name" value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} required minLength={2} maxLength={80} />
        </label>
        <label className="campo">
          <span>Teléfono</span>
          <input type="tel" autoComplete="tel" inputMode="tel" value={f.telefono} onChange={(e) => setF({ ...f, telefono: e.target.value })} placeholder="600 000 000" />
        </label>
        <label className="campo">
          <span>Correo <small>(opcional si dejas teléfono)</small></span>
          <input type="email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        </label>
        {/* Campo trampa para robots: las personas no lo ven. */}
        <input className="trampa" tabIndex={-1} autoComplete="off" aria-hidden="true" value={f.web} onChange={(e) => setF({ ...f, web: e.target.value })} />
        <div className="campo">
          <span>¿Cuántas personas venís?</span>
          <div className="contador">
            <button type="button" className="boton-redondo" aria-label="Una menos" disabled={f.personas <= 1} onClick={() => setF({ ...f, personas: f.personas - 1 })}>−</button>
            <b aria-live="polite">{f.personas}</b>
            <button type="button" className="boton-redondo" aria-label="Una más" disabled={f.personas >= MAX_PERSONAS_INSCRIPCION} onClick={() => setF({ ...f, personas: f.personas + 1 })}>+</button>
          </div>
        </div>
        <label className="casilla">
          <input type="checkbox" checked={f.acepta} onChange={(e) => setF({ ...f, acepta: e.target.checked })} />
          <span>{AVISO_INSCRIPCION}</span>
        </label>
        {error && <p className="error-formulario" role="alert">{error}</p>}
        <button className="boton boton-primario boton-ancho boton-grande" disabled={ocupado}>{ocupado ? 'Apuntando…' : 'Apuntarme'}</button>
      </form>
    </div>,
    document.querySelector('.app') ?? document.body,
  )
}

/** Bloque de la ficha: plazas, apuntarse o ver/cancelar la propia inscripción. */
export function BloqueInscripcion({ evento }: { evento: Evento }) {
  const mias = useMisInscripciones()
  const mia = mias.find((i) => i.evento === evento.id && i.estado !== 'cancelada')
  const [abierta, setAbierta] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const ins = evento.inscripcion!

  // Al abrir la ficha se comprueba si la plaza ha cambiado (por ejemplo, si has salido de la lista de espera).
  useEffect(() => {
    if (!mia) return
    consultarInscripcion(mia.codigo)
      .then((r) => {
        if (r.estado !== mia.estado) guardarInscripcion({ ...mia, estado: r.estado })
      })
      // Si ya no existe (por ejemplo, el evento se borró), se olvida; si es falta de cobertura, se deja como estaba.
      .catch((e) => {
        if (/No encontramos/.test((e as Error).message)) olvidarInscripcion(mia.codigo)
      })
  }, [mia])

  if (mia) {
    return (
      <div className={mia.estado === 'confirmada' ? 'inscripcion inscripcion-dentro' : 'inscripcion inscripcion-espera'}>
        <span className="circulo-icono solido"><Icono n={mia.estado === 'confirmada' ? 'check' : 'personas'} tam={20} /></span>
        <div>
          <b>{mia.estado === 'confirmada' ? 'Estás apuntado/a' : 'Estás en la lista de espera'}</b>
          <small>{textoPlazas(mia.personas)}{mia.estado === 'espera' ? ' · te avisamos si queda sitio' : ''}</small>
        </div>
        <button className="enlace-accion" disabled={ocupado} onClick={async () => {
          if (!confirm('¿Cancelar tu inscripción? Tu plaza pasará a otra persona.')) return
          setOcupado(true)
          try {
            await cancelarMiInscripcion(mia.codigo)
            olvidarInscripcion(mia.codigo)
            avisar('Inscripción cancelada. ¡Gracias por avisar!')
          } catch (e) {
            avisar((e as Error).message)
          } finally {
            setOcupado(false)
          }
        }}>Cancelar</button>
      </div>
    )
  }

  const completo = ins.libres === 0
  return (
    <div className="inscripcion">
      <span className="circulo-icono"><Icono n="personas" tam={20} /></span>
      <div>
        <b>{!ins.abierta ? 'Inscripción cerrada' : 'Hay que apuntarse'}</b>
        <small>
          {ins.libres === null ? 'Plazas sin límite' : completo ? 'Completo · queda lista de espera' : `Quedan ${ins.libres} de ${ins.plazas} plazas`}
          {ins.abierta && ins.hasta ? ` · hasta el ${new Date(ins.hasta).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}` : ''}
        </small>
      </div>
      {ins.abierta && !evento.cancelado && (
        <button className="boton boton-primario boton-peq inscripcion-boton" onClick={() => setAbierta(true)}>{completo ? 'Lista de espera' : 'Apuntarme'}</button>
      )}
      {abierta && <HojaApuntarse evento={evento} alCerrar={() => setAbierta(false)} />}
    </div>
  )
}
