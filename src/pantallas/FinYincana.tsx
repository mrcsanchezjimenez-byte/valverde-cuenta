import { Link, useNavigate } from 'react-router-dom'
import { Icono } from '../componentes/Iconos'
import { PARADAS } from '../datos/yincana'
import { reiniciarYincana, useCompletadas } from '../estado/almacen'
import { compartir } from '../nativo'

export function FinYincana() {
  const completadas = useCompletadas()
  const navegar = useNavigate()
  const pendientes = PARADAS.filter((p) => !completadas.includes(p.numero))

  if (pendientes.length) {
    return (
      <div className="pantalla fin">
        <h1>Aún te {pendientes.length === 1 ? 'falta 1 parada' : `faltan ${pendientes.length} paradas`}</h1>
        <p className="entradilla">Responde las preguntas que quedan para completar el recorrido.</p>
        {pendientes.map((p) => (
          <Link key={p.numero} to={`/yincana/${p.numero}`} className="boton boton-suave boton-ancho">Parada {p.numero}: {p.nombre}</Link>
        ))}
      </div>
    )
  }

  return (
    <div className="pantalla fin">
      <span className="fin-medalla"><Icono n="yincana" tam={44} /></span>
      <p className="antetitulo">Yincana cultural</p>
      <h1>¡Recorrido completado!</h1>
      <p className="entradilla">Has recorrido las {PARADAS.length} paradas del casco urbano de Valverde. Gracias por escuchar al pueblo.</p>
      <button className="boton boton-primario boton-ancho boton-grande" onClick={() => compartir('Yincana de Valverde', 'He completado la yincana de Valverde. ¿Te animas?', '/yincana')}>
        <Icono n="compartir" tam={18} /> Invitar a alguien
      </button>
      <Link className="boton boton-suave boton-ancho" to="/agenda">Ver qué más hay en la agenda</Link>
      <button className="enlace-accion" onClick={() => { reiniciarYincana(); navegar('/yincana') }}>Volver a empezar</button>
    </div>
  )
}
