import { useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { AvisoEntidad, EventoGestion } from '../../../compartido/tipos.ts'
import { api } from '../api.ts'
import { avisar } from '../componentes/Avisos.tsx'
import { FormEvento, eventoVacio } from '../componentes/FormEvento.tsx'
import { Icono } from '../componentes/Iconos.tsx'
import { FotosEntidad } from '../componentes/Fotos.tsx'
import { Inscritos } from '../componentes/Inscritos.tsx'
import { FilaEvento, Vacio } from '../componentes/Listas.tsx'
import { Cargando, Estado, Fallo, fechaIso, useAccion, useCarga, useMunicipios } from '../componentes/piezas.tsx'
import { useSesion } from '../sesion.tsx'

function AvisoEstadoEntidad() {
  const { usuario } = useSesion()
  if (usuario?.entidadEstado === 'verificada') return null
  const textos = {
    pendiente: 'Estamos revisando los datos de vuestra entidad. Mientras, podéis preparar borradores; os avisaremos cuando podáis enviarlos.',
    rechazada: 'El alta de vuestra entidad no se ha aceptado. Mirad el motivo en «Avisos».',
    suspendida: 'Vuestra cuenta está suspendida. Escribidnos si creéis que es un error.',
  }
  return <p className="g-aviso">{textos[usuario?.entidadEstado ?? 'pendiente']}</p>
}

/** Un aviso de dirección: publicado, no publicado, entidad verificada… */
function TarjetaAviso({ a }: { a: AvisoEntidad }) {
  const contenido = (
    <>
      <span className={`g-aviso-icono g-aviso-${a.tipo}`}><Icono n={a.tipo === 'bien' ? 'check' : a.tipo === 'mal' ? 'aviso' : 'campana'} /></span>
      <span className="g-fila-cuerpo">
        <b>{a.titulo}{!a.leido && <span className="g-nuevo">Nuevo</span>}</b>
        <small className="g-parrafos">{a.texto}</small>
        <small>{fechaIso(a.creado)}</small>
      </span>
      {a.eventoId && <Icono n="adelante" tam={18} />}
    </>
  )
  return a.eventoId
    ? <Link to={`/eventos/${a.eventoId}`} className={a.leido ? 'g-fila g-fila-aviso' : 'g-fila g-fila-aviso nuevo'}>{contenido}</Link>
    : <div className={a.leido ? 'g-fila g-fila-aviso' : 'g-fila g-fila-aviso nuevo'}>{contenido}</div>
}

export function MisEventos({ avisos }: { avisos: AvisoEntidad[] }) {
  const { usuario } = useSesion()
  const { datos, error, cargando } = useCarga<EventoGestion[]>('/entidad/eventos')
  const nuevos = avisos.filter((a) => !a.leido)
  return (
    <section className="g-pagina">
      <header className="g-cabecera">
        <div>
          <p className="g-antetitulo">{usuario?.entidadNombre}</p>
          <h1>Nuestros eventos</h1>
        </div>
        <div className="g-cabecera-acciones">
          <Link to="/eventos/nuevo" className="g-boton g-boton-primario"><Icono n="mas" /> Nuevo evento</Link>
        </div>
      </header>
      <AvisoEstadoEntidad />

      {!!nuevos.length && (
        <section className="g-bloque">
          <h2 className="g-bloque-titulo"><Icono n="campana" /> Novedades <span className="g-cuenta-filtro">{nuevos.length}</span></h2>
          <div className="g-lista">{nuevos.slice(0, 3).map((a) => <TarjetaAviso key={a.id} a={a} />)}</div>
          {nuevos.length > 3 && <Link to="/avisos" className="g-enlace">Ver todos los avisos</Link>}
        </section>
      )}

      <Fallo>{error}</Fallo>
      {cargando && !datos && <Cargando />}
      {datos && !datos.length && (
        <Vacio icono="calendario" titulo="Aún no habéis creado ningún evento">
          Cada evento que enviéis lo revisamos antes de publicarlo, normalmente en uno o dos días. Os avisaremos aquí y por correo.
        </Vacio>
      )}
      {!!datos?.length && (
        <div className="g-lista">
          {datos.map((e) => (
            <FilaEvento key={e.id} e={e} a={`/eventos/${e.id}`} mostrarEntidad={false} extra={
              e.estado === 'rechazado' && e.motivo ? <span className="g-marca-cambios">Motivo: {e.motivo}</span>
                : e.cambios ? <span className="g-marca-cambios">Cambios en revisión</span> : undefined
            } />
          ))}
        </div>
      )}
    </section>
  )
}

export function AvisosEntidad({ base = '/entidad' }: { base?: string }) {
  const { datos, error, recargar } = useCarga<AvisoEntidad[]>(`${base}/avisos`)
  // Al abrir esta pantalla se dan por leídos (después de enseñarlos marcados como nuevos).
  useEffect(() => {
    if (datos?.some((a) => !a.leido)) {
      const t = setTimeout(() => void api('POST', `${base}/avisos/leidos`).catch(() => undefined), 1500)
      return () => clearTimeout(t)
    }
  }, [datos, base])
  return (
    <section className="g-pagina">
      <header className="g-cabecera"><div><p className="g-antetitulo">Dirección os escribe</p><h1>Avisos</h1></div></header>
      <p className="g-suave g-subtitulo">Aquí os contamos si publicamos un evento, si hay que corregir algo o cualquier cambio en vuestra cuenta. También os llega por correo.</p>
      <Fallo>{error}</Fallo>
      {datos && !datos.length && <Vacio icono="campana" titulo="Sin avisos todavía" />}
      <div className="g-lista">{datos?.map((a) => <TarjetaAviso key={a.id} a={a} />)}</div>
      {datos?.some((a) => !a.leido) && <button className="g-enlace" onClick={() => void api('POST', `${base}/avisos/leidos`).then(recargar)}>Marcar todo como leído</button>}
    </section>
  )
}

export function EventoEntidad() {
  const { id } = useParams()
  const navegar = useNavigate()
  const { usuario } = useSesion()
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
    <section className="g-pagina g-pagina-ancha">
      <header className="g-cabecera">
        <div>
          <Link to="/" className="g-volver"><Icono n="atras" tam={16} /> Nuestros eventos</Link>
          <h1>{nuevo ? 'Nuevo evento' : e!.titulo}</h1>
        </div>
        {e && <div className="g-cabecera-acciones"><Estado estado={e.estado} /></div>}
      </header>

      {e?.estado === 'rechazado' && e.motivo && <p className="g-aviso">No lo publicamos por esto: <b>{e.motivo}</b> Corrígelo y vuelve a enviarlo.</p>}
      {e?.estado === 'pendiente' && <p className="g-aviso">Lo estamos revisando. Aún puedes corregir algo si hace falta.</p>}
      {e?.estado === 'cancelado' && <p className="g-aviso">Cancelado: sigue en la agenda marcado como cancelado hasta su fecha.</p>}
      {e?.estado === 'retirado' && <p className="g-aviso">Lo retiramos de la agenda: <b>{e.motivo}</b></p>}
      {e?.cambios && (
        <div className="g-aviso">
          Tienes cambios pendientes de revisión: abajo ves tu propuesta. En la agenda sigue la versión anterior hasta que la revisemos.
          <button className="g-enlace" onClick={() => void accion.hacer(async () => {
            await api('DELETE', `/entidad/eventos/${e.id}/cambios`)
            avisar('Cambios retirados.', 'info')
            await evento.recargar()
          })}>Retirar los cambios</button>
        </div>
      )}

      <AvisoEstadoEntidad />

      {e?.inscripcion && ['publicado', 'cancelado'].includes(e.estado) && (
        <Inscritos ruta={`/entidad/eventos/${e.id}/inscripciones`} titulo={e.titulo} />
      )}
      {e && e.estado === 'publicado' && <FotosEntidad eventoId={e.id} />}

      {editable && (
        <FormEvento
          key={e?.actualizado ?? 'nuevo'}
          inicial={e?.cambios ?? e ?? eventoVacio(valverde)}
          imagenUrlInicial={e?.cambios ? e.cambiosImagenUrl : e?.imagenUrl ?? null}
          organizador={usuario?.entidadNombre ?? ''}
          municipios={municipios.datos}
          modo={modo}
          alGuardar={async (datos, { enviar, declaracion }) => {
            const cuerpo = { evento: datos, enviar, declaracion }
            if (nuevo) await api('POST', '/entidad/eventos', cuerpo)
            else await api('PUT', `/entidad/eventos/${id}`, cuerpo)
            avisar(enviar ? 'Enviado. Os avisaremos cuando lo revisemos.' : 'Borrador guardado.', enviar ? 'bien' : 'info')
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
                  avisar('Evento cancelado.', 'info')
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
                  avisar('Evento borrado.', 'info')
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
