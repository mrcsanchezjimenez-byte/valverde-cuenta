import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AvisoEjemplo } from '../componentes/Avisos'
import { MapaInteractivo } from '../componentes/MapaInteractivo'
import { FilaEvento } from '../componentes/TarjetasEvento'
import { CATEGORIAS } from '../datos/eventos'
import { claveDia, esEsteFinde, esHoy, fecha, fechaLarga, mesLargo } from '../datos/fechas'
import { proximosEventos, todosLosEventos } from '../datos/repositorio'
import type { Evento } from '../datos/tipos'
import { useGuardados } from '../estado/almacen'
import { Icono } from '../componentes/Iconos'

const FILTROS = [
  { id: 'todo', nombre: 'Todo' },
  { id: 'hoy', nombre: 'Hoy' },
  { id: 'finde', nombre: 'Finde' },
  { id: 'gratis', nombre: 'Gratis' },
  { id: 'ninos', nombre: 'Niños' },
  { id: 'alrededores', nombre: 'Alrededores' },
  { id: 'guardados', nombre: 'Guardados' },
  ...CATEGORIAS.filter((c) => c.id !== 'ninos').map((c) => ({ id: c.id as string, nombre: c.nombre })),
]

function cumple(e: Evento, filtro: string, guardados: string[]) {
  switch (filtro) {
    case 'todo': return true
    case 'hoy': return esHoy(e)
    case 'finde': return esEsteFinde(e)
    case 'gratis': return e.precio === null
    case 'ninos': return Boolean(e.paraNinos) || e.categoria === 'ninos'
    case 'alrededores': return e.zona === 'alrededores'
    case 'guardados': return guardados.includes(e.id)
    default: return e.categoria === filtro
  }
}

function agruparPorDia(eventos: Evento[]) {
  const grupos = new Map<string, Evento[]>()
  for (const e of eventos) {
    const dia = claveDia(fecha(e.inicio))
    grupos.set(dia, [...(grupos.get(dia) ?? []), e])
  }
  return [...grupos.entries()]
}

function Lista({ eventos, filtro }: { eventos: Evento[]; filtro: string }) {
  if (!eventos.length) {
    return (
      <div className="vacio">
        <p>{filtro === 'guardados' ? 'Aún no has guardado ningún evento. Pulsa el corazón en su ficha.' : 'No hay eventos con este filtro.'}</p>
        <Link to="/agenda" className="boton boton-suave">Ver toda la agenda</Link>
      </div>
    )
  }
  return (
    <>
      {agruparPorDia(eventos).map(([dia, lista]) => (
        <section key={dia} className="grupo-dia">
          <h2>{fechaLarga(fecha(lista[0].inicio))}</h2>
          {lista.map((e) => <FilaEvento key={e.id} evento={e} />)}
        </section>
      ))}
    </>
  )
}

function Calendario({ eventos }: { eventos: Evento[] }) {
  const hoy = new Date()
  const primero = eventos.find((e) => fecha(e.fin) >= hoy) ?? eventos[0]
  const inicial = primero ? fecha(primero.inicio) : hoy
  const [mes, setMes] = useState(new Date(inicial.getFullYear(), inicial.getMonth(), 1))
  const [dia, setDia] = useState(claveDia(inicial))

  const porDia = useMemo(() => {
    const m = new Map<string, Evento[]>()
    for (const e of eventos) {
      const k = claveDia(fecha(e.inicio))
      m.set(k, [...(m.get(k) ?? []), e])
    }
    return m
  }, [eventos])

  const huecos = (mes.getDay() + 6) % 7 // La semana empieza en lunes.
  const diasMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate()
  const cambiarMes = (n: number) => setMes(new Date(mes.getFullYear(), mes.getMonth() + n, 1))
  const delDia = porDia.get(dia) ?? []

  return (
    <>
      <div className="calendario">
        <div className="calendario-cabecera">
          <button className="boton-redondo" onClick={() => cambiarMes(-1)} aria-label="Mes anterior"><Icono n="atras" tam={18} /></button>
          <h2>{mesLargo(mes)}</h2>
          <button className="boton-redondo" onClick={() => cambiarMes(1)} aria-label="Mes siguiente"><Icono n="adelante" tam={18} /></button>
        </div>
        <div className="calendario-rejilla">
          {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => <span key={d} className="calendario-sem">{d}</span>)}
          {Array.from({ length: huecos }, (_, i) => <span key={`h${i}`} />)}
          {Array.from({ length: diasMes }, (_, i) => {
            const k = claveDia(new Date(mes.getFullYear(), mes.getMonth(), i + 1))
            const n = porDia.get(k)?.length ?? 0
            const clases = ['calendario-dia', k === dia && 'activo', k === claveDia(hoy) && 'hoy', n > 0 && 'con-evento'].filter(Boolean).join(' ')
            return (
              <button key={k} className={clases} onClick={() => setDia(k)} aria-label={`Día ${i + 1}${n ? `, ${n} eventos` : ''}`}>
                {i + 1}
              </button>
            )
          })}
        </div>
      </div>
      <section className="grupo-dia">
        <h2>{fechaLarga(new Date(`${dia}T12:00`))}</h2>
        {delDia.length ? delDia.map((e) => <FilaEvento key={e.id} evento={e} />) : <p className="suave">Nada previsto este día.</p>}
      </section>
    </>
  )
}

export function Agenda() {
  const [params, setParams] = useSearchParams()
  const guardados = useGuardados()
  const vista = params.get('v') ?? 'lista'
  const filtro = params.get('f') ?? 'todo'

  const poner = (clave: string, valor: string) => {
    const nuevos = new URLSearchParams(params)
    nuevos.set(clave, valor)
    setParams(nuevos, { replace: true })
  }

  const proximos = proximosEventos().filter((e) => cumple(e, filtro, guardados))
  const todos = todosLosEventos().filter((e) => cumple(e, filtro, guardados))

  return (
    <div className={vista === 'mapa' ? 'pantalla pantalla-con-mapa' : 'pantalla'}>
      <header>
        <p className="antetitulo">Agenda cultural</p>
        <h1>Qué hacer en Valverde</h1>
      </header>

      <div className="segmentado" role="tablist">
        {[['lista', 'Lista'], ['calendario', 'Calendario'], ['mapa', 'Mapa']].map(([id, texto]) => (
          <button key={id} role="tab" aria-selected={vista === id} className={vista === id ? 'activo' : ''} onClick={() => poner('v', id)}>
            {texto}
          </button>
        ))}
      </div>

      <div className="chips chips-desplazables">
        {FILTROS.map((f) => (
          <button key={f.id} className={filtro === f.id ? 'chip activo' : 'chip'} aria-pressed={filtro === f.id} onClick={() => poner('f', f.id)}>
            {f.nombre}
          </button>
        ))}
      </div>

      {vista === 'lista' && (
        <>
          <AvisoEjemplo>Estos eventos son de ejemplo, no están confirmados.</AvisoEjemplo>
          <Lista eventos={proximos} filtro={filtro} />
        </>
      )}
      {vista === 'calendario' && <Calendario eventos={todos} />}
      {vista === 'mapa' && <MapaInteractivo eventos={proximos} conYincana={false} />}
    </div>
  )
}
