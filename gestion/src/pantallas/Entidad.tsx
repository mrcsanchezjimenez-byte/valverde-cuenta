import { Link, useNavigate, useParams } from 'react-router-dom'
import type { EventoGestion } from '../../../compartido/tipos.ts'
import { api } from '../api.ts'
import { FormEvento, eventoVacio } from '../componentes/FormEvento.tsx'
import { Cargando, Estado, Fallo, fechaCorta, useAccion, useCarga, useMunicipios } from '../componentes/piezas.tsx'
import { useSesion } from '../sesion.tsx'

function AvisoEstadoEntidad() {
  const { usuario } = useSesion()
  if (usuario?.entidadEstado === 'verificada') return null
  const textos = {
    pendiente: 'Estamos revisando los datos de vuestra entidad. Mientras, podéis preparar borradores; os avisaremos por correo cuando podáis enviarlos.',
    rechazada: 'El alta de vuestra entidad no se ha aceptado. Revisad el correo que os enviamos con el motivo.',
    suspendida: 'Vuestra cuenta está suspendida. Escribidnos si creéis que es un error.',
  }
  return <p className="g-aviso">{textos[usuario?.entidadEstado ?? 'pendiente']}</p>
}

export function MisEventos() {
  const { usuario } = useSesion()
  const { datos, error, cargando } = useCarga<EventoGestion[]>('/entidad/eventos')
  return (
    <section className="g-pagina">
      <header className="g-cabecera">
        <div>
          <p className="g-antetitulo">{usuario?.entidadNombre}</p>
          <h1>Nuestros eventos</h1>
        </div>
        <Link to="/eventos/nuevo" className="g-boton g-boton-primario">+ Nuevo evento</Link>
      </header>
      <AvisoEstadoEntidad />
      <Fallo>{error}</Fallo>
      {cargando && !datos && <Cargando />}
      {datos && !datos.length && (
        <div className="g-vacio">
          <p>Aún no habéis creado ningún evento.</p>
          <p className="g-suave">Cada evento que enviéis lo revisamos antes de publicarlo, normalmente en uno o dos días.</p>
        </div>
      )}
      <ul className="g-lista">
        {datos?.map((e) => (
          <li key={e.id}>
            <Link to={`/eventos/${e.id}`} className="g-fila-lista">
              <div>
                <b>{e.titulo}</b>
                <small>{fechaCorta(e.inicio)} · {e.lugar}</small>
                {e.estado === 'rechazado' && e.motivo && <small className="g-motivo-texto">Motivo: {e.motivo}</small>}
                {e.cambios && <small className="g-motivo-texto">Cambios pendientes de revisión</small>}
              </div>
              <Estado estado={e.estado} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function EventoEntidad() {
  const { id } = useParams()
  const navegar = useNavigate()
  const nuevo = id === 'nuevo'
  const municipios = useMunicipios()
  const evento = useCarga<EventoGestion>(nuevo ? null : `/entidad/eventos/${id}`)
  const accion = useAccion()

  if (!municipios.datos || (!nuevo && !evento.datos)) {
    return <section className="g-pagina"><Fallo>{municipios.error || evento.error}</Fallo>{!municipios.error && !evento.error && <Cargando />}</section>
  }
  const e = evento.datos
  const valverde = municipios.datos.find((m) => m.esValverde)
  const editable = nuevo || (e && ['borrador', 'rechazado', 'pendiente', 'publicado'].includes(e.estado))
  const modo = nuevo ? 'entidad-nuevo' : e!.estado === 'publicado' ? 'entidad-publicado' : e!.estado === 'pendiente' ? 'entidad-pendiente' : 'entidad-borrador'

  return (
    <section className="g-pagina">
      <header className="g-cabecera">
        <div>
          <p className="g-antetitulo"><Link to="/">← Nuestros eventos</Link></p>
          <h1>{nuevo ? 'Nuevo evento' : e!.titulo}</h1>
        </div>
        {e && <Estado estado={e.estado} />}
      </header>

      {e?.estado === 'rechazado' && e.motivo && <p className="g-aviso">No lo publicamos por esto: <b>{e.motivo}</b>. Corrígelo y vuelve a enviarlo.</p>}
      {e?.estado === 'pendiente' && <p className="g-aviso">Lo estamos revisando. Aún puedes corregir algo si hace falta.</p>}
      {e?.estado === 'cancelado' && <p className="g-aviso">Cancelado: sigue en la agenda marcado como cancelado hasta su fecha.</p>}
      {e?.estado === 'retirado' && <p className="g-aviso">Lo retiramos de la agenda: <b>{e.motivo}</b></p>}
      {e?.cambios && (
        <div className="g-aviso">
          Tienes cambios pendientes de revisión: abajo ves tu propuesta. En la agenda sigue la versión anterior hasta que la revisemos.
          <button className="g-enlace" onClick={() => void accion.hacer(async () => {
            await api('DELETE', `/entidad/eventos/${e.id}/cambios`)
            await evento.recargar()
          })}>Retirar los cambios</button>
        </div>
      )}

      <AvisoEstadoEntidad />

      {editable && (
        <FormEvento
          key={e?.actualizado ?? 'nuevo'}
          inicial={e?.cambios ?? e ?? eventoVacio(valverde)}
          municipios={municipios.datos}
          modo={modo}
          alGuardar={async (datos, { enviar, declaracion }) => {
            const cuerpo = { evento: datos, enviar, declaracion }
            if (nuevo) await api('POST', '/entidad/eventos', cuerpo)
            else await api('PUT', `/entidad/eventos/${id}`, cuerpo)
            navegar('/', { replace: true })
          }}
        />
      )}

      <Fallo>{accion.error}</Fallo>
      {e && (
        <div className="g-zona-peligro">
          {e.estado === 'publicado' && (
            <button className="g-boton g-boton-peligro" disabled={accion.ocupado} onClick={() => {
              if (confirm('¿Cancelar el evento? Seguirá en la agenda marcado como «Cancelado» para que nadie vaya en balde.')) {
                void accion.hacer(async () => {
                  await api('POST', `/entidad/eventos/${e.id}/cancelar`)
                  navegar('/', { replace: true })
                })
              }
            }}>Cancelar el evento</button>
          )}
          {['borrador', 'rechazado', 'pendiente'].includes(e.estado) && (
            <button className="g-boton g-boton-peligro" disabled={accion.ocupado} onClick={() => {
              if (confirm('¿Borrar este evento? No se puede deshacer.')) {
                void accion.hacer(async () => {
                  await api('DELETE', `/entidad/eventos/${e.id}`)
                  navegar('/', { replace: true })
                })
              }
            }}>Borrar</button>
          )}
        </div>
      )}
    </section>
  )
}
