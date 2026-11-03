import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Escena } from '../componentes/Escena'
import { Icono } from '../componentes/Iconos'
import { obtenerParada, PARADAS } from '../datos/yincana'
import { completarParada, useCompletadas } from '../estado/almacen'
import { abrirIndicaciones } from '../nativo'

export function ParadaYincana() {
  const { numero = '' } = useParams()
  const navegar = useNavigate()
  const completadas = useCompletadas()
  const parada = obtenerParada(Number(numero))
  const [elegida, setElegida] = useState<number | null>(null)

  if (!parada) {
    return (
      <div className="pantalla vacio">
        <p>Esta parada no existe.</p>
        <Link to="/yincana" className="boton boton-suave">Ver el recorrido</Link>
      </div>
    )
  }

  const hecha = completadas.includes(parada.numero)
  const marcada = elegida ?? (hecha ? parada.correcta : null)
  const acierto = marcada === parada.correcta
  const siguiente = obtenerParada(parada.numero + 1)

  function responder(indice: number) {
    setElegida(indice)
    if (indice === parada!.correcta) completarParada(parada!.numero)
  }

  return (
    <div className="pantalla parada">
      <header className="parada-cabecera">
        <button className="boton-redondo" onClick={() => navegar('/yincana')} aria-label="Volver al recorrido"><Icono n="atras" tam={20} /></button>
        <b>Parada {parada.numero} de {PARADAS.length}</b>
        <span className="hueco" />
      </header>

      <div className="progreso" aria-hidden="true">
        {PARADAS.map((p) => (
          <span key={p.numero} className={completadas.includes(p.numero) ? 'hecha' : p.numero === parada.numero ? 'actual' : ''} />
        ))}
      </div>

      <Escena tipo={parada.escena} clase="parada-imagen" />

      <h1>{parada.nombre}</h1>
      <div className="parada-lugar">
        <p className="suave"><Icono n="pin" tam={15} /> {parada.direccion}</p>
        <button className="enlace-accion" onClick={() => abrirIndicaciones(parada.lat, parada.lng)}>Cómo llegar</button>
      </div>

      <section className="relato">
        <span className="etiqueta etiqueta-mostaza">Recuerdo personal</span>
        <p>«{parada.relato}»</p>
        <small>{parada.voz}. Aquí sonará el audio del testimonio.</small>
      </section>

      <section>
        <p className="antetitulo">Pregunta</p>
        <h2 className="pregunta">{parada.pregunta}</h2>
        <div className="opciones">
          {parada.opciones.map((o, i) => {
            const clase = marcada === i ? (acierto ? 'opcion correcta' : 'opcion incorrecta') : 'opcion'
            return (
              <button key={o} className={clase} onClick={() => responder(i)} disabled={acierto && marcada !== i}>
                <span>{String.fromCharCode(65 + i)} · {o}</span>
                {marcada === i && acierto && <Icono n="check" tam={20} />}
              </button>
            )
          })}
        </div>

        <div aria-live="polite">
          {marcada !== null && !acierto && <p className="respuesta-mal">Casi. Vuelve a leer el relato y prueba otra vez.</p>}
          {acierto && (
            <div className="respuesta-bien">
              <p><b>¡Correcto!</b> {siguiente ? <>Pista para la siguiente parada: <b>{parada.pistaSiguiente}</b></> : 'Has llegado al final del recorrido.'}</p>
              <Link className="boton boton-primario boton-ancho boton-grande" to={siguiente ? `/yincana/${siguiente.numero}` : '/yincana/fin'}>
                {siguiente ? `Ir a la parada ${siguiente.numero}` : 'Terminar el recorrido'} <Icono n="adelante" tam={18} />
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
