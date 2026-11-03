import { useState } from 'react'
import { MapaInteractivo } from '../componentes/MapaInteractivo'
import { proximosEventos } from '../datos/repositorio'

const CAPAS = [
  { id: 'todo', nombre: 'Eventos y yincana' },
  { id: 'yincana', nombre: 'Solo yincana' },
  { id: 'alrededores', nombre: 'Alrededores' },
] as const

type Capa = (typeof CAPAS)[number]['id']

export function Mapa() {
  const [capa, setCapa] = useState<Capa>('todo')
  const proximos = proximosEventos()
  const eventos =
    capa === 'yincana' ? [] : proximos.filter((e) => e.zona === (capa === 'alrededores' ? 'alrededores' : 'valverde'))

  return (
    <div className="pantalla-mapa">
      <div className="chips chips-sobre-mapa">
        {CAPAS.map((c) => (
          <button key={c.id} className={capa === c.id ? 'chip activo' : 'chip'} aria-pressed={capa === c.id} onClick={() => setCapa(c.id)}>
            {c.nombre}
          </button>
        ))}
      </div>
      <MapaInteractivo eventos={eventos} conYincana={capa !== 'alrededores'} />
    </div>
  )
}
