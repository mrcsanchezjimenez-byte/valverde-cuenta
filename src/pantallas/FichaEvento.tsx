import { Link, useNavigate, useParams } from 'react-router-dom'
import { Escena } from '../componentes/Escena'
import { Icono } from '../componentes/Iconos'
import { textoPrecio } from '../componentes/TarjetasEvento'
import { fecha, fechaLarga, hora } from '../datos/fechas'
import { MODO_DEMO, useEvento } from '../datos/repositorio'
import { alternarGuardado, useGuardados } from '../estado/almacen'
import { AVISO_AGENDA } from '../../compartido/tipos.ts'
import { Galeria } from '../componentes/Galeria'
import { BloqueInscripcion } from '../componentes/Inscripcion'
import { abrirEnlace, abrirIndicaciones, anadirACalendario, compartir } from '../nativo'

export function FichaEvento() {
  const { id = '' } = useParams()
  const navegar = useNavigate()
  const guardados = useGuardados()
  const { evento, estado } = useEvento(id)

  if (!evento && estado === 'cargando') return <div className="pantalla"><p className="suave">Cargando…</p></div>
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
      <div className={evento.imagen ? 'ficha-imagen con-cartel' : 'ficha-imagen'}>
        {evento.imagen ? (
          <>
            {/* El cartel entero, sobre una versión difuminada de sí mismo para rellenar el hueco. */}
            <img className="cartel-fondo" src={evento.imagen} alt="" aria-hidden="true" />
            <a href={evento.imagen} target="_blank" rel="noopener noreferrer" className="cartel-enlace">
              <img className="cartel" src={evento.imagen} alt={`Cartel de ${evento.titulo}`} />
            </a>
          </>
        ) : <Escena tipo={evento.escena} />}
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
          <span className="etiqueta etiqueta-cuero">{evento.organizador}</span>
          {evento.precio === null && <span className="etiqueta etiqueta-verde-solida">Gratis</span>}
          {evento.cancelado && <span className="etiqueta etiqueta-cancelado">Cancelado</span>}
          {MODO_DEMO && <span className="etiqueta etiqueta-ejemplo">Evento de ejemplo</span>}
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

        {evento.inscripcion && <BloqueInscripcion evento={evento} />}

        {evento.cancelado && <p className="aviso-cancelado">La organización ha cancelado este evento.</p>}
        <p className="ficha-texto">{evento.descripcion}</p>
        {evento.enlace && (
          <button className="enlace-externo" onClick={() => abrirEnlace(evento.enlace!)}>
            <Icono n="adelante" tam={16} /> Más información de la organización
          </button>
        )}

        {!!evento.fotos?.length && <Galeria fotos={evento.fotos} />}

        {evento.enlazaYincana && (
          <Link to="/yincana" className="relacionado">
            <span className="circulo-icono solido"><Icono n="yincana" tam={20} /></span>
            <span><small>También por tu cuenta</small><b>Ver el recorrido de la yincana</b></span>
          </Link>
        )}

        <p className="nota-legal">{AVISO_AGENDA.corto.replace('{organizador}', evento.organizador)}</p>
      </div>

      {fecha(evento.fin) >= new Date() && !evento.cancelado && (
        <div className="ficha-accion">
          <button className="boton boton-primario boton-ancho" onClick={() => anadirACalendario(evento)}>
            <Icono n="mas" tam={18} /> Añadir a mi calendario
          </button>
        </div>
      )}
    </div>
  )
}
