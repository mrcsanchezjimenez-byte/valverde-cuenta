import { Link } from 'react-router-dom'
import { diaSemanaCorto, fecha, hora } from '../datos/fechas'
import type { Evento } from '../datos/tipos'
import { anadirACalendario } from '../nativo'
import { Escena } from './Escena'
import { Icono } from './Iconos'

export const textoPrecio = (e: Evento) => (e.precio === null ? 'Gratis' : `${e.precio} €`)

export function TarjetaGrande({ evento }: { evento: Evento }) {
  const d = fecha(evento.inicio)
  return (
    <article className="tarjeta-grande">
      <Link to={`/evento/${evento.id}`} className="tarjeta-grande-enlace">
        <div className="tarjeta-grande-imagen">
          <Escena tipo={evento.escena} />
          <div className="sello-fecha"><small>{diaSemanaCorto(d)}</small><b>{d.getDate()}</b></div>
          {evento.precio === null && <span className="etiqueta etiqueta-verde-solida">Gratis</span>}
        </div>
        <h3>{evento.titulo}</h3>
        <p className="suave">{hora(evento.inicio)} · {evento.lugar}</p>
      </Link>
      <div className="fila-botones">
        <button className="boton boton-primario boton-peq" onClick={() => anadirACalendario(evento)}>
          <Icono n="mas" tam={16} /> Calendario
        </button>
        <Link className="boton boton-suave boton-peq" to={`/evento/${evento.id}`}>Ver más</Link>
      </div>
    </article>
  )
}

export function FilaEvento({ evento }: { evento: Evento }) {
  return (
    <Link to={`/evento/${evento.id}`} className="fila-evento">
      <Escena tipo={evento.escena} clase="miniatura" />
      <div>
        <span className="etiqueta etiqueta-mostaza">{evento.organizador}</span>
        <h3>{evento.titulo}</h3>
        <p className="suave">
          {hora(evento.inicio)} · {evento.zona === 'alrededores' ? evento.municipio : evento.lugar} · {textoPrecio(evento)}
        </p>
      </div>
    </Link>
  )
}
