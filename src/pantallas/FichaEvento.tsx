import { Link, useNavigate, useParams } from 'react-router-dom'
import { Escena } from '../componentes/Escena'
import { Icono } from '../componentes/Iconos'
import { textoPrecio } from '../componentes/TarjetasEvento'
import { fecha, fechaLarga, hora } from '../datos/fechas'
import { obtenerEvento } from '../datos/repositorio'
import { alternarGuardado, useGuardados } from '../estado/almacen'
import { abrirIndicaciones, anadirACalendario, compartir } from '../nativo'

export function FichaEvento() {
  const { id = '' } = useParams()
  const navegar = useNavigate()
  const guardados = useGuardados()
  const evento = obtenerEvento(id)

  if (!evento) {
    return (
      <div className="pantalla vacio">
        <p>Este evento ya no está en la agenda.</p>
        <Link to="/agenda" className="boton boton-suave">Ver la agenda</Link>
      </div>
    )
  }

  const guardado = guardados.includes(evento.id)

  return (
    <div className="ficha">
      <div className="ficha-imagen">
        <Escena tipo={evento.escena} />
        <button className="boton-redondo boton-sobre izquierda" onClick={() => navegar(-1)} aria-label="Volver"><Icono n="atras" tam={20} /></button>
        <div className="botones-sobre">
          <button
            className={guardado ? 'boton-redondo boton-sobre guardado' : 'boton-redondo boton-sobre'}
            onClick={() => alternarGuardado(evento.id)} aria-pressed={guardado}
            aria-label={guardado ? 'Quitar de guardados' : 'Guardar evento'}
          >
            <Icono n="corazon" tam={20} relleno={guardado} />
          </button>
          <button className="boton-redondo boton-sobre" onClick={() => compartir(evento.titulo, evento.resumen, `/evento/${evento.id}`)} aria-label="Compartir evento">
            <Icono n="compartir" tam={20} />
          </button>
        </div>
      </div>

      <div className="ficha-cuerpo">
        <div className="etiquetas">
          <span className="etiqueta etiqueta-mostaza">{evento.organizador}</span>
          {evento.precio === null && <span className="etiqueta etiqueta-verde-solida">Gratis</span>}
          <span className="etiqueta etiqueta-ejemplo">Evento de ejemplo</span>
        </div>
        <h1>{evento.titulo}</h1>

        <div className="dato">
          <span className="circulo-icono"><Icono n="agenda" tam={20} /></span>
          <div><b>{fechaLarga(fecha(evento.inicio))}</b><small>{hora(evento.inicio)} – {hora(evento.fin)}</small></div>
        </div>
        <div className="dato">
          <span className="circulo-icono"><Icono n="pin" tam={20} /></span>
          <div><b>{evento.lugar}</b><small>{evento.municipio}</small></div>
          <button className="enlace-accion" onClick={() => abrirIndicaciones(evento.lat, evento.lng)}>Cómo llegar</button>
        </div>
        <div className="dato">
          <span className="circulo-icono"><Icono n="entrada" tam={20} /></span>
          <div><b>{textoPrecio(evento)}</b><small>{evento.publico}</small></div>
        </div>

        <p className="ficha-texto">{evento.descripcion}</p>

        {evento.enlazaYincana && (
          <Link to="/yincana" className="relacionado">
            <span className="circulo-icono solido"><Icono n="yincana" tam={20} /></span>
            <span><small>También por tu cuenta</small><b>Ver el recorrido de la yincana</b></span>
          </Link>
        )}
      </div>

      <div className="ficha-accion">
        <button className="boton boton-primario boton-ancho" onClick={() => anadirACalendario(evento)}>
          <Icono n="mas" tam={18} /> Añadir a mi calendario
        </button>
      </div>
    </div>
  )
}
