import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { CATEGORIAS, escenaPorDefecto } from '../../../compartido/categorias.ts'
import type { DatosEvento, EstadoEntidad, EventoGestion, Municipio } from '../../../compartido/tipos.ts'
import { TIPOS_ENTIDAD } from '../../../compartido/tipos.ts'
import { api } from '../api.ts'
import { FormEvento, eventoVacio } from '../componentes/FormEvento.tsx'
import {
  Bien, Cargando, Estado, Fallo, fechaCorta, fechaIso, PedirMotivo, useAccion, useCarga, useMunicipios,
} from '../componentes/piezas.tsx'

interface Entidad {
  id: number
  nombre: string
  tipo: string
  cif: string | null
  tipoCif: string | null
  municipio: string
  personaContacto: string
  telefono: string
  web: string
  estado: EstadoEntidad
  motivo: string | null
  nota: string
  interna: boolean
  creado: string
  revisado: string | null
  email: string | null
  emailVerificado: boolean
  eventos: number
}

const nombreTipo = (t: string) => TIPOS_ENTIDAD.find((x) => x.id === t)?.nombre ?? t
const nombreCategoria = (c: string) => CATEGORIAS.find((x) => x.id === c)?.nombre ?? c
const precioTexto = (p: number | null) => (p === null ? 'Gratis' : `${p.toLocaleString('es-ES')} €`)

// ——— Pendientes: la bandeja de trabajo diaria ———

export function Pendientes() {
  const { datos, error, cargando, recargar } = useCarga<{ entidades: Entidad[]; eventos: EventoGestion[]; cambios: EventoGestion[] }>('/direccion/pendientes')
  const total = datos ? datos.entidades.length + datos.eventos.length + datos.cambios.length : 0
  return (
    <section className="g-pagina">
      <header className="g-cabecera">
        <div><p className="g-antetitulo">Dirección</p><h1>Pendientes</h1></div>
        <button className="g-boton g-boton-suave" onClick={() => void recargar()}>Actualizar</button>
      </header>
      <Fallo>{error}</Fallo>
      {cargando && !datos && <Cargando />}
      {datos && !total && <div className="g-vacio"><p>Todo al día. No hay nada pendiente de revisar.</p></div>}

      {!!datos?.eventos.length && (
        <>
          <h2>Eventos nuevos ({datos.eventos.length})</h2>
          <ul className="g-lista">
            {datos.eventos.map((e) => (
              <li key={e.id}>
                <Link to={`/revisar/${e.id}`} className="g-fila-lista">
                  <div><b>{e.titulo}</b><small>{e.entidadNombre} · {fechaCorta(e.inicio)} · enviado {e.enviado ? fechaIso(e.enviado) : ''}</small></div>
                  <span className="g-flecha">Revisar →</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {!!datos?.cambios.length && (
        <>
          <h2>Cambios en eventos publicados ({datos.cambios.length})</h2>
          <ul className="g-lista">
            {datos.cambios.map((e) => (
              <li key={e.id}>
                <Link to={`/revisar/${e.id}`} className="g-fila-lista">
                  <div><b>{e.titulo}</b><small>{e.entidadNombre} · {fechaCorta(e.inicio)}</small></div>
                  <span className="g-flecha">Revisar →</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {!!datos?.entidades.length && (
        <>
          <h2>Entidades que piden alta ({datos.entidades.length})</h2>
          <ul className="g-lista">
            {datos.entidades.map((e) => (
              <li key={e.id}>
                <Link to={`/entidades/${e.id}`} className="g-fila-lista">
                  <div>
                    <b>{e.nombre}</b>
                    <small>{nombreTipo(e.tipo)} · {e.municipio} · CIF {e.cif} ({e.tipoCif})</small>
                    {!e.emailVerificado && <small className="g-motivo-texto">Aún no ha confirmado su correo</small>}
                  </div>
                  <span className="g-flecha">Revisar →</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

// ——— Revisar un evento ———

function Ficha({ e, municipios }: { e: DatosEvento & { entidadNombre?: string }; municipios: Municipio[] }) {
  const m = municipios.find((x) => x.id === e.municipioId)
  return (
    <dl className="g-ficha">
      <dt>Título</dt><dd>{e.titulo}</dd>
      <dt>Resumen</dt><dd>{e.resumen}</dd>
      <dt>Descripción</dt><dd className="g-parrafos">{e.descripcion}</dd>
      <dt>Cuándo</dt><dd>{fechaCorta(e.inicio)} – {fechaCorta(e.fin)}</dd>
      <dt>Dónde</dt><dd>{e.lugar}, {m?.nombre ?? '¿?'} · <a href={`https://www.openstreetmap.org/?mlat=${e.lat}&mlon=${e.lng}#map=18/${e.lat}/${e.lng}`} target="_blank" rel="noopener noreferrer">ver en el mapa</a></dd>
      <dt>Categoría</dt><dd>{nombreCategoria(e.categoria)}{e.paraNinos ? ' · para niños' : ''}</dd>
      <dt>Público</dt><dd>{e.publico}</dd>
      <dt>Precio</dt><dd>{precioTexto(e.precio)}</dd>
      <dt>Enlace</dt><dd>{e.enlace ? <span className="g-url">{e.enlace}</span> : '—'}</dd>
    </dl>
  )
}

const CAMPOS: [keyof DatosEvento, string][] = [
  ['titulo', 'Título'], ['resumen', 'Resumen'], ['descripcion', 'Descripción'], ['inicio', 'Empieza'], ['fin', 'Termina'],
  ['lugar', 'Lugar'], ['municipioId', 'Municipio'], ['lat', 'Latitud'], ['lng', 'Longitud'], ['precio', 'Precio'],
  ['publico', 'Público'], ['categoria', 'Categoría'], ['paraNinos', 'Para niños'], ['enlace', 'Enlace'],
]

function Diferencias({ antes, despues }: { antes: DatosEvento; despues: DatosEvento }) {
  const cambiados = CAMPOS.filter(([k]) => antes[k] !== despues[k])
  if (!cambiados.length) return <p className="g-suave">No hay diferencias.</p>
  const txt = (v: unknown) => (v === null ? 'Gratis' : typeof v === 'boolean' ? (v ? 'Sí' : 'No') : String(v))
  return (
    <table className="g-tabla g-diferencias">
      <thead><tr><th>Campo</th><th>Ahora publicado</th><th>Propuesta</th></tr></thead>
      <tbody>
        {cambiados.map(([k, nombre]) => (
          <tr key={k}><th>{nombre}</th><td><del>{txt(antes[k])}</del></td><td><ins>{txt(despues[k])}</ins></td></tr>
        ))}
      </tbody>
    </table>
  )
}

export function RevisarEvento() {
  const { id } = useParams()
  const navegar = useNavigate()
  const municipios = useMunicipios(true)
  const { datos: e, error, recargar } = useCarga<EventoGestion>(`/direccion/eventos/${id}`)
  const [pidiendo, setPidiendo] = useState<'rechazar' | 'rechazar-cambios' | 'retirar' | null>(null)
  const [editando, setEditando] = useState(false)
  const accion = useAccion()
  const [hecho, setHecho] = useState('')

  if (!e || !municipios.datos) return <section className="g-pagina"><Fallo>{error || municipios.error}</Fallo>{!error && <Cargando />}</section>

  const hacer = (ruta: string, mensaje: string, volver = true) => accion.hacer(async () => {
    await api('POST', `/direccion/eventos/${e.id}/${ruta}`)
    setHecho(mensaje)
    if (volver) navegar('/pendientes')
    else await recargar()
  })

  return (
    <section className="g-pagina">
      <header className="g-cabecera">
        <div>
          <p className="g-antetitulo"><button className="g-enlace" onClick={() => navegar(-1)}>← Volver</button></p>
          <h1>{e.titulo}</h1>
          <p className="g-suave">De <Link to={`/entidades/${e.entidadId}`}>{e.entidadNombre}</Link>{e.organizador ? ` · organiza ${e.organizador}` : ''}</p>
        </div>
        <Estado estado={e.estado} />
      </header>
      <Bien>{hecho}</Bien>
      <Fallo>{accion.error}</Fallo>

      {e.cambios && !editando && (
        <div className="g-caja">
          <h2>Cambios propuestos</h2>
          <Diferencias antes={e} despues={e.cambios} />
          {pidiendo === 'rechazar-cambios' ? (
            <PedirMotivo titulo="¿Por qué no se aplican los cambios?" boton="No aplicar los cambios" alCancelar={() => setPidiendo(null)}
              alConfirmar={async (motivo) => {
                await api('POST', `/direccion/eventos/${e.id}/rechazar-cambios`, { motivo })
                navegar('/pendientes')
              }} />
          ) : (
            <div className="g-fila">
              <button className="g-boton g-boton-primario" disabled={accion.ocupado} onClick={() => void hacer('aprobar-cambios', 'Cambios publicados.')}>Aprobar cambios</button>
              <button className="g-boton g-boton-suave" onClick={() => setPidiendo('rechazar-cambios')}>No aplicarlos…</button>
            </div>
          )}
        </div>
      )}

      {editando ? (
        <FormEvento
          inicial={e} municipios={municipios.datos} modo="direccion" conOrganizador={Boolean(e.organizador)}
          ajustesIniciales={{ escena: e.escena, enlazaYincana: e.enlazaYincana, organizador: e.organizador }}
          alGuardar={async (evento, { ajustes }) => {
            await api('PUT', `/direccion/eventos/${e.id}`, { evento, ajustes })
            setEditando(false)
            setHecho('Corrección guardada.')
            await recargar()
          }}
        />
      ) : (
        <>
          <Ficha e={e} municipios={municipios.datos} />
          <p className="g-suave">Ilustración: {e.escena}{e.enlazaYincana ? ' · enlaza con la yincana' : ''}</p>
        </>
      )}

      {pidiendo === 'rechazar' && (
        <PedirMotivo titulo="¿Por qué no se publica?" boton="No publicar" alCancelar={() => setPidiendo(null)}
          alConfirmar={async (motivo) => {
            await api('POST', `/direccion/eventos/${e.id}/rechazar`, { motivo })
            navegar('/pendientes')
          }} />
      )}
      {pidiendo === 'retirar' && (
        <PedirMotivo titulo="¿Por qué se retira de la agenda?" boton="Retirar" alCancelar={() => setPidiendo(null)}
          alConfirmar={async (motivo) => {
            await api('POST', `/direccion/eventos/${e.id}/retirar`, { motivo })
            setPidiendo(null)
            await recargar()
          }} />
      )}

      {!pidiendo && (
        <div className="g-fila g-fila-final">
          <button className="g-boton g-boton-suave" onClick={() => setEditando(!editando)}>{editando ? 'Dejar de corregir' : 'Corregir algo'}</button>
          {e.estado === 'pendiente' && !editando && (
            <>
              <button className="g-boton g-boton-suave" onClick={() => setPidiendo('rechazar')}>No publicar…</button>
              <button className="g-boton g-boton-primario" disabled={accion.ocupado} onClick={() => void hacer('aprobar', 'Publicado.')}>Publicar</button>
            </>
          )}
          {['publicado', 'cancelado'].includes(e.estado) && !editando && (
            <button className="g-boton g-boton-peligro" onClick={() => setPidiendo('retirar')}>Retirar de la agenda…</button>
          )}
          {['retirado', 'cancelado', 'rechazado'].includes(e.estado) && !editando && (
            <button className="g-boton g-boton-suave" disabled={accion.ocupado} onClick={() => void hacer('republicar', 'Vuelve a estar publicado.', false)}>Volver a publicar</button>
          )}
        </div>
      )}
    </section>
  )
}

// ——— Todos los eventos ———

const FILTROS = [['', 'Todos'], ['publicado', 'Publicados'], ['pendiente', 'Pendientes'], ['rechazado', 'No publicados'], ['cancelado', 'Cancelados'], ['retirado', 'Retirados']]

export function Eventos() {
  const [params, setParams] = useSearchParams()
  const estado = params.get('estado') ?? ''
  const [busca, setBusca] = useState('')
  const { datos, error, cargando } = useCarga<EventoGestion[]>(`/direccion/eventos${estado ? `?estado=${estado}` : ''}`)
  const hoy = new Date().toISOString().slice(0, 16)
  const filtrados = datos?.filter((e) => !busca || `${e.titulo} ${e.entidadNombre} ${e.lugar}`.toLowerCase().includes(busca.toLowerCase()))
  return (
    <section className="g-pagina">
      <header className="g-cabecera">
        <div><p className="g-antetitulo">Dirección</p><h1>Eventos</h1></div>
        <Link to="/nuevo" className="g-boton g-boton-primario">+ Meter un evento</Link>
      </header>
      <div className="g-filtros">
        {FILTROS.map(([id, nombre]) => (
          <button key={id} className={estado === id ? 'g-chip activo' : 'g-chip'} onClick={() => setParams(id ? { estado: id } : {})}>{nombre}</button>
        ))}
        <input type="search" placeholder="Buscar…" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar eventos" />
      </div>
      <Fallo>{error}</Fallo>
      {cargando && !datos && <Cargando />}
      <table className="g-tabla">
        <thead><tr><th>Fecha</th><th>Evento</th><th>Entidad</th><th>Estado</th></tr></thead>
        <tbody>
          {filtrados?.map((e) => (
            <tr key={e.id} className={e.fin < hoy ? 'pasado' : ''}>
              <td>{fechaCorta(e.inicio)}</td>
              <td><Link to={`/revisar/${e.id}`}>{e.titulo}</Link>{e.cambios ? ' · cambios pendientes' : ''}</td>
              <td>{e.organizador ?? e.entidadNombre}</td>
              <td><Estado estado={e.estado} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      {filtrados && !filtrados.length && <p className="g-suave">No hay eventos con este filtro.</p>}
    </section>
  )
}

/** Dirección mete un evento a mano: sale publicado directamente. */
export function NuevoEventoDireccion() {
  const navegar = useNavigate()
  const municipios = useMunicipios()
  const entidades = useCarga<Entidad[]>('/direccion/entidades')
  const [entidadId, setEntidadId] = useState(0)
  const verificadas = entidades.datos?.filter((e) => e.estado === 'verificada') ?? []
  const elegida = verificadas.find((e) => e.id === entidadId) ?? verificadas.find((e) => e.interna)

  if (!municipios.datos || !entidades.datos || !elegida) return <section className="g-pagina"><Fallo>{municipios.error || entidades.error}</Fallo><Cargando /></section>
  const inicial = eventoVacio(municipios.datos.find((m) => m.esValverde))

  return (
    <section className="g-pagina">
      <header className="g-cabecera"><div><p className="g-antetitulo"><Link to="/eventos">← Eventos</Link></p><h1>Meter un evento</h1></div></header>
      <p className="g-suave">Para carteles, avisos del Ayuntamiento o eventos de quien no tiene cuenta. Sale publicado directamente.</p>
      <label className="g-campo g-campo-corto"><span>A nombre de</span>
        <select value={elegida.id} onChange={(e) => setEntidadId(Number(e.target.value))}>
          {verificadas.map((e) => <option key={e.id} value={e.id}>{e.interna ? 'Valverde Cuenta (escribo yo quién organiza)' : e.nombre}</option>)}
        </select>
      </label>
      <FormEvento
        key={elegida.id}
        inicial={inicial} municipios={municipios.datos} modo="direccion" conOrganizador={elegida.interna}
        ajustesIniciales={{ escena: escenaPorDefecto(inicial.categoria), enlazaYincana: false, organizador: elegida.interna ? '' : null }}
        alGuardar={async (evento, { ajustes }) => {
          const r = await api<{ id: number }>('POST', '/direccion/eventos', { evento, ajustes, entidadId: elegida.id })
          navegar(`/revisar/${r.id}`, { replace: true })
        }}
      />
    </section>
  )
}

// ——— Entidades ———

export function Entidades() {
  const { datos, error, cargando } = useCarga<Entidad[]>('/direccion/entidades')
  return (
    <section className="g-pagina">
      <header className="g-cabecera"><div><p className="g-antetitulo">Dirección</p><h1>Entidades</h1></div></header>
      <Fallo>{error}</Fallo>
      {cargando && !datos && <Cargando />}
      <table className="g-tabla">
        <thead><tr><th>Entidad</th><th>Tipo</th><th>Municipio</th><th>Eventos</th><th>Estado</th></tr></thead>
        <tbody>
          {datos?.filter((e) => !e.interna).map((e) => (
            <tr key={e.id}>
              <td><Link to={`/entidades/${e.id}`}>{e.nombre}</Link></td>
              <td>{nombreTipo(e.tipo)}</td>
              <td>{e.municipio}</td>
              <td>{e.eventos}</td>
              <td><Estado estado={e.estado} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      {datos && datos.length <= 1 && <p className="g-suave">Aún no se ha dado de alta ninguna entidad.</p>}
    </section>
  )
}

export function FichaEntidad() {
  const { id } = useParams()
  const { datos: e, error, recargar } = useCarga<Entidad & { listaEventos: EventoGestion[] }>(`/direccion/entidades/${id}`)
  const [pidiendo, setPidiendo] = useState<'rechazar' | 'suspender' | null>(null)
  const [nota, setNota] = useState<string | null>(null)
  const accion = useAccion()
  if (!e) return <section className="g-pagina"><Fallo>{error}</Fallo>{!error && <Cargando />}</section>

  const hacer = (ruta: string, cuerpo?: unknown) => accion.hacer(async () => {
    await api('POST', `/direccion/entidades/${e.id}/${ruta}`, cuerpo)
    setPidiendo(null)
    await recargar()
  })
  const guardarNota = (ev: FormEvent) => {
    ev.preventDefault()
    void accion.hacer(async () => {
      await api('PUT', `/direccion/entidades/${e.id}/nota`, { nota })
      setNota(null)
      await recargar()
    })
  }

  return (
    <section className="g-pagina">
      <header className="g-cabecera">
        <div><p className="g-antetitulo"><Link to="/entidades">← Entidades</Link></p><h1>{e.nombre}</h1></div>
        <Estado estado={e.estado} />
      </header>
      <dl className="g-ficha">
        <dt>Tipo</dt><dd>{nombreTipo(e.tipo)}</dd>
        <dt>CIF</dt><dd>{e.cif} {e.tipoCif && <span className="g-suave">· según la letra: {e.tipoCif}</span>}</dd>
        <dt>Municipio</dt><dd>{e.municipio}</dd>
        <dt>Contacto</dt><dd>{e.personaContacto} · {e.telefono} · {e.email} {!e.emailVerificado && <b>(correo sin confirmar)</b>}</dd>
        <dt>Web</dt><dd>{e.web ? <span className="g-url">{e.web}</span> : '—'}</dd>
        <dt>Alta</dt><dd>{fechaIso(e.creado)}{e.revisado ? ` · revisada ${fechaIso(e.revisado)}` : ''}</dd>
        {e.motivo && <><dt>Motivo</dt><dd>{e.motivo}</dd></>}
      </dl>
      {e.estado === 'pendiente' && (
        <p className="g-aviso">
          Antes de verificar: comprueba que la entidad existe y no tiene ánimo de lucro (por ejemplo en el
          Registro de Asociaciones de Andalucía o llamando a la persona de contacto).
        </p>
      )}

      <form className="g-caja" onSubmit={guardarNota}>
        <label className="g-campo"><span>Nota interna (solo la ve dirección)</span>
          <textarea rows={2} maxLength={2000} value={nota ?? e.nota} onChange={(ev) => setNota(ev.target.value)} />
        </label>
        {nota !== null && <button className="g-boton g-boton-suave">Guardar nota</button>}
      </form>

      <Fallo>{accion.error}</Fallo>
      {pidiendo && (
        <PedirMotivo titulo={pidiendo === 'rechazar' ? '¿Por qué no se acepta el alta?' : '¿Por qué se suspende?'}
          boton={pidiendo === 'rechazar' ? 'No aceptar' : 'Suspender'} alCancelar={() => setPidiendo(null)}
          alConfirmar={(motivo) => api('POST', `/direccion/entidades/${e.id}/${pidiendo}`, { motivo }).then(() => { setPidiendo(null); return recargar() })} />
      )}
      {!pidiendo && (
        <div className="g-fila">
          {e.estado === 'pendiente' && (
            <>
              <button className="g-boton g-boton-primario" disabled={accion.ocupado || !e.emailVerificado} onClick={() => void hacer('verificar')}>Verificar entidad</button>
              <button className="g-boton g-boton-suave" onClick={() => setPidiendo('rechazar')}>No aceptar…</button>
            </>
          )}
          {e.estado === 'rechazada' && <button className="g-boton g-boton-suave" onClick={() => void hacer('verificar')}>Verificar al final</button>}
          {e.estado === 'verificada' && <button className="g-boton g-boton-peligro" onClick={() => setPidiendo('suspender')}>Suspender…</button>}
          {e.estado === 'suspendida' && <button className="g-boton g-boton-suave" onClick={() => void hacer('reactivar')}>Reactivar</button>}
        </div>
      )}

      <h2>Eventos ({e.listaEventos.length})</h2>
      <ul className="g-lista">
        {e.listaEventos.map((ev) => (
          <li key={ev.id}><Link to={`/revisar/${ev.id}`} className="g-fila-lista"><div><b>{ev.titulo}</b><small>{fechaCorta(ev.inicio)}</small></div><Estado estado={ev.estado} /></Link></li>
        ))}
      </ul>
    </section>
  )
}

// ——— Municipios de la agenda ———

export function Municipios() {
  const { datos, error, recargar } = useMunicipios(true)
  const accion = useAccion()
  const [nuevo, setNuevo] = useState({ nombre: '', lat: '', lng: '' })
  const cambiar = (m: Municipio) => accion.hacer(async () => {
    await api('PUT', `/direccion/municipios/${m.id}`, { nombre: m.nombre, lat: m.lat, lng: m.lng, activo: !m.activo })
    await recargar()
  })
  const anadir = (e: FormEvent) => {
    e.preventDefault()
    void accion.hacer(async () => {
      await api('POST', '/direccion/municipios', { nombre: nuevo.nombre, lat: Number(nuevo.lat), lng: Number(nuevo.lng), activo: true })
      setNuevo({ nombre: '', lat: '', lng: '' })
      await recargar()
    })
  }
  return (
    <section className="g-pagina">
      <header className="g-cabecera"><div><p className="g-antetitulo">Dirección</p><h1>Zona de la agenda</h1></div></header>
      <p className="g-suave">Solo los municipios activos aparecen al dar de alta entidades y eventos. La distancia es en línea recta desde el centro de Valverde.</p>
      <Fallo>{error || accion.error}</Fallo>
      <table className="g-tabla">
        <thead><tr><th>Municipio</th><th>Distancia</th><th>En la agenda</th></tr></thead>
        <tbody>
          {datos?.map((m) => (
            <tr key={m.id} className={m.activo ? '' : 'pasado'}>
              <td>{m.nombre}</td>
              <td>{m.distanciaKm} km</td>
              <td>
                {m.esValverde ? 'Siempre' : (
                  <label className="g-casilla"><input type="checkbox" checked={m.activo} disabled={accion.ocupado} onChange={() => void cambiar(m)} /><span>{m.activo ? 'Sí' : 'No'}</span></label>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <form className="g-caja g-form" onSubmit={anadir}>
        <h2>Añadir un municipio o pedanía</h2>
        <p className="g-suave">Las coordenadas se copian de Google Maps u OpenStreetMap (clic derecho en el centro del pueblo).</p>
        <div className="g-tres">
          <label className="g-campo"><span>Nombre</span><input value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} required /></label>
          <label className="g-campo"><span>Latitud</span><input inputMode="decimal" value={nuevo.lat} onChange={(e) => setNuevo({ ...nuevo, lat: e.target.value })} required placeholder="37.57" /></label>
          <label className="g-campo"><span>Longitud</span><input inputMode="decimal" value={nuevo.lng} onChange={(e) => setNuevo({ ...nuevo, lng: e.target.value })} required placeholder="-6.75" /></label>
        </div>
        <button className="g-boton g-boton-suave" disabled={accion.ocupado}>Añadir</button>
      </form>
    </section>
  )
}

// ——— Actividad y equipo ———

const ACCIONES: Record<string, string> = {
  entrar: 'Entra', entrar_fallo: 'Intento de entrada fallido', cuenta_bloqueada: 'Cuenta bloqueada por intentos', salir: 'Sale',
  codigo_fallo: 'Código de verificación incorrecto', '2fa_activado': 'Activa el doble factor', '2fa_quitado': 'Quita el doble factor',
  clave_cambiada: 'Cambia la contraseña', clave_pedida: 'Pide cambiar la contraseña', clave_restablecida: 'Pone contraseña nueva',
  alta_entidad: 'Pide alta de entidad', correo_verificado: 'Confirma su correo', entidad_verificada: 'Verifica entidad',
  entidad_rechazada: 'Rechaza alta de entidad', entidad_suspendida: 'Suspende entidad', entidad_reactivada: 'Reactiva entidad',
  evento_borrador: 'Guarda borrador', evento_enviado: 'Envía evento a revisión', evento_publicado: 'Publica evento',
  evento_rechazado: 'No publica evento', evento_cancelado: 'Cancela evento', evento_retirado: 'Retira evento',
  evento_republicado: 'Vuelve a publicar evento', evento_borrado: 'Borra evento', evento_creado_direccion: 'Mete evento (dirección)',
  evento_editado_direccion: 'Corrige evento (dirección)', cambios_enviados: 'Propone cambios', cambios_aprobados: 'Aprueba cambios',
  cambios_rechazados: 'Rechaza cambios', municipio_creado: 'Añade municipio', municipio_cambiado: 'Cambia municipio',
}

interface Apunte { id: number; fecha: string; accion: string; objeto: string; detalle: string; ip: string; quien: string | null; rol: string | null }

export function Actividad() {
  const [antes, setAntes] = useState(0)
  const { datos, error } = useCarga<Apunte[]>(`/direccion/registro${antes ? `?antes=${antes}` : ''}`)
  const equipo = useCarga<{ id: number; nombre: string; email: string; dobleFactor: number; ultimoAcceso: string | null }[]>('/direccion/equipo')
  return (
    <section className="g-pagina">
      <header className="g-cabecera"><div><p className="g-antetitulo">Dirección</p><h1>Actividad</h1></div></header>
      <h2>Equipo de dirección</h2>
      <ul className="g-lista">
        {equipo.datos?.map((u) => (
          <li key={u.id} className="g-fila-lista"><div><b>{u.nombre}</b><small>{u.email} · último acceso {u.ultimoAcceso ? fechaIso(u.ultimoAcceso) : 'nunca'}</small></div>
            <span className={u.dobleFactor ? 'g-estado g-estado-publicado' : 'g-estado g-estado-pendiente'}>{u.dobleFactor ? 'Doble factor activo' : 'Sin doble factor'}</span></li>
        ))}
      </ul>
      <h2>Registro</h2>
      <p className="g-suave">Todo lo que pasa en el panel queda aquí. Si ves una entrada que no reconoces, cambia tu contraseña y avisa.</p>
      <Fallo>{error}</Fallo>
      <table className="g-tabla g-tabla-densa">
        <thead><tr><th>Cuándo</th><th>Quién</th><th>Qué</th><th>Detalle</th></tr></thead>
        <tbody>
          {datos?.map((r) => (
            <tr key={r.id} className={/fallo|bloqueada/.test(r.accion) ? 'alerta' : ''}>
              <td>{fechaIso(r.fecha)}</td>
              <td>{r.quien ?? (r.ip === 'consola' ? 'Consola del servidor' : '—')}</td>
              <td>{ACCIONES[r.accion] ?? r.accion}</td>
              <td>{r.detalle}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {datos?.length === 100 && <button className="g-boton g-boton-suave" onClick={() => setAntes(datos.at(-1)!.id)}>Más antiguos</button>}
    </section>
  )
}
