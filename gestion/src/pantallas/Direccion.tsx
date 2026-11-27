import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { CATEGORIAS, escenaPorDefecto } from '../../../compartido/categorias.ts'
import type { DatosEvento, EstadoEntidad, EstadoEvento, EventoGestion, Municipio } from '../../../compartido/tipos.ts'
import { Escena } from '../../../src/componentes/Escena.tsx'
import { api } from '../api.ts'
import { avisar } from '../componentes/Avisos.tsx'
import { FormEvento, eventoVacio } from '../componentes/FormEvento.tsx'
import { Inscritos } from '../componentes/Inscritos.tsx'
import { Icono } from '../componentes/Iconos.tsx'
import { Buscador, FilaEntidad, FilaEvento, Filtros, nombreMes, nombreTipo, Vacio } from '../componentes/Listas.tsx'
import { Cargando, Estado, Fallo, fechaCorta, fechaIso, PedirMotivo, useAccion, useCarga, useMunicipios } from '../componentes/piezas.tsx'

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

const nombreCategoria = (c: string) => CATEGORIAS.find((x) => x.id === c)?.nombre ?? c
const precioTexto = (p: number | null) => (p === null ? 'Gratis' : `${p.toLocaleString('es-ES')} €`)

/** Confirma una acción y recuerda que la entidad ya está avisada. */
const confirmar = (hecho: string, r: unknown) => {
  const avisado = (r as { avisado?: string } | null)?.avisado
  avisar(avisado ? `${hecho} Hemos avisado a ${avisado} por correo y en su panel.` : hecho)
}

function Cabecera({ ante, titulo, children, volver }: { ante?: string; titulo: string; children?: ReactNode; volver?: { a: string; texto: string } }) {
  return (
    <header className="g-cabecera">
      <div>
        {volver ? <Link to={volver.a} className="g-volver"><Icono n="atras" tam={16} /> {volver.texto}</Link> : <p className="g-antetitulo">{ante}</p>}
        <h1>{titulo}</h1>
      </div>
      {children && <div className="g-cabecera-acciones">{children}</div>}
    </header>
  )
}

// ——— Pendientes: la bandeja de trabajo diaria ———

export function Pendientes() {
  const { datos, error, cargando } = useCarga<{ entidades: Entidad[]; eventos: EventoGestion[]; cambios: EventoGestion[] }>('/direccion/pendientes')
  const total = datos ? datos.entidades.length + datos.eventos.length + datos.cambios.length : 0
  return (
    <section className="g-pagina">
      <Cabecera ante="Dirección" titulo="Pendientes">
        <Link to="/nuevo" className="g-boton g-boton-primario"><Icono n="mas" /> Meter un evento</Link>
      </Cabecera>
      <Fallo>{error}</Fallo>
      {cargando && !datos && <Cargando />}
      {datos && !total && <Vacio icono="check" titulo="Todo al día">No hay nada pendiente de revisar.</Vacio>}

      {!!datos?.eventos.length && (
        <section className="g-bloque">
          <h2 className="g-bloque-titulo"><Icono n="calendario" /> Eventos nuevos <span className="g-cuenta-filtro">{datos.eventos.length}</span></h2>
          <div className="g-lista">
            {datos.eventos.map((e) => <FilaEvento key={e.id} e={e} a={`/revisar/${e.id}`} />)}
          </div>
        </section>
      )}

      {!!datos?.cambios.length && (
        <section className="g-bloque">
          <h2 className="g-bloque-titulo"><Icono n="lapiz" /> Cambios en eventos publicados <span className="g-cuenta-filtro">{datos.cambios.length}</span></h2>
          <div className="g-lista">
            {datos.cambios.map((e) => <FilaEvento key={e.id} e={e} a={`/revisar/${e.id}`} extra={<span className="g-marca-cambios">Con cambios propuestos</span>} />)}
          </div>
        </section>
      )}

      {!!datos?.entidades.length && (
        <section className="g-bloque">
          <h2 className="g-bloque-titulo"><Icono n="personas" /> Entidades que piden alta <span className="g-cuenta-filtro">{datos.entidades.length}</span></h2>
          <div className="g-lista">
            {datos.entidades.map((e) => <FilaEntidad key={e.id} e={e} />)}
          </div>
        </section>
      )}
    </section>
  )
}

// ——— Revisar un evento ———

function Ficha({ e, municipios }: { e: DatosEvento; municipios: Municipio[] }) {
  const m = municipios.find((x) => x.id === e.municipioId)
  return (
    <dl className="g-ficha">
      <dt>Resumen</dt><dd>{e.resumen}</dd>
      <dt>Descripción</dt><dd className="g-parrafos">{e.descripcion}</dd>
      <dt>Cuándo</dt><dd>{fechaCorta(e.inicio)} – {fechaCorta(e.fin)}</dd>
      <dt>Dónde</dt><dd>{e.lugar}, {m?.nombre ?? '¿?'} · <a href={`https://www.openstreetmap.org/?mlat=${e.lat}&mlon=${e.lng}#map=18/${e.lat}/${e.lng}`} target="_blank" rel="noopener noreferrer">ver en el mapa</a></dd>
      <dt>Categoría</dt><dd>{nombreCategoria(e.categoria)}{e.paraNinos ? ' · para niños' : ''}</dd>
      <dt>Público</dt><dd>{e.publico}</dd>
      <dt>Precio</dt><dd>{precioTexto(e.precio)}</dd>
      <dt>Enlace</dt><dd>{e.enlace ? <span className="g-url">{e.enlace}</span> : '—'}</dd>
      <dt>Inscripción</dt>
      <dd>{e.inscripcion
        ? `Hay que apuntarse · ${e.inscripcion.plazas === null ? 'sin límite de plazas' : `${e.inscripcion.plazas} plazas`}${e.inscripcion.hasta ? ` · se cierra ${fechaCorta(e.inscripcion.hasta)}` : ''}`
        : 'No hace falta apuntarse'}</dd>
    </dl>
  )
}

const CAMPOS: [keyof DatosEvento, string][] = [
  ['titulo', 'Título'], ['resumen', 'Resumen'], ['descripcion', 'Descripción'], ['inicio', 'Empieza'], ['fin', 'Termina'],
  ['lugar', 'Lugar'], ['municipioId', 'Municipio'], ['lat', 'Latitud'], ['lng', 'Longitud'], ['precio', 'Precio'],
  ['publico', 'Público'], ['categoria', 'Categoría'], ['paraNinos', 'Para niños'], ['enlace', 'Enlace'], ['imagen', 'Cartel'],
]

function Diferencias({ e }: { e: EventoGestion }) {
  const despues = e.cambios!
  const cambiados = CAMPOS.filter(([k]) => e[k] !== despues[k])
  if (!cambiados.length) return <p className="g-suave">No hay diferencias.</p>
  const txt = (k: keyof DatosEvento, v: unknown, url: string | null) => {
    if (k === 'imagen') return url ? <img className="g-dif-imagen" src={url} alt="" /> : 'Ilustración'
    return v === null ? 'Gratis' : typeof v === 'boolean' ? (v ? 'Sí' : 'No') : String(v)
  }
  return (
    <div className="g-diferencias">
      {cambiados.map(([k, nombre]) => (
        <div key={k} className="g-dif">
          <span className="g-dif-campo">{nombre}</span>
          <span className="g-dif-antes">{txt(k, e[k], e.imagenUrl)}</span>
          <Icono n="adelante" tam={16} />
          <span className="g-dif-despues">{txt(k, despues[k], e.cambiosImagenUrl)}</span>
        </div>
      ))}
    </div>
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

  if (!e || !municipios.datos) return <section className="g-pagina"><Fallo>{error || municipios.error}</Fallo>{!error && <Cargando />}</section>

  const hacer = (ruta: string, mensaje: string, volver = true) => accion.hacer(async () => {
    const r = await api('POST', `/direccion/eventos/${e.id}/${ruta}`)
    confirmar(mensaje, r)
    if (volver) navegar('/pendientes')
    else await recargar()
  })
  const conMotivo = (ruta: string, mensaje: string, volver = true) => async (motivo: string) => {
    const r = await api('POST', `/direccion/eventos/${e.id}/${ruta}`, { motivo })
    confirmar(mensaje, r)
    setPidiendo(null)
    if (volver) navegar('/pendientes')
    else await recargar()
  }

  return (
    <section className="g-pagina">
      <Cabecera titulo={e.titulo} volver={{ a: '/eventos', texto: 'Eventos' }}>
        <Estado estado={e.estado} />
      </Cabecera>
      <p className="g-suave g-subtitulo">
        De <Link to={`/entidades/${e.entidadId}`}>{e.entidadNombre}</Link>{e.organizador ? ` · organiza ${e.organizador}` : ''}
        {e.enviado ? ` · enviado ${fechaIso(e.enviado)}` : ''}
      </p>
      <Fallo>{accion.error}</Fallo>

      {e.cambios && !editando && (
        <div className="g-caja g-caja-cambios">
          <h2>Cambios propuestos</h2>
          <p className="g-suave">En la agenda sigue la versión publicada hasta que aprobéis los cambios.</p>
          <Diferencias e={e} />
          {pidiendo === 'rechazar-cambios' ? (
            <PedirMotivo titulo="¿Por qué no se aplican los cambios?" boton="No aplicar los cambios" alCancelar={() => setPidiendo(null)}
              alConfirmar={conMotivo('rechazar-cambios', 'Cambios descartados.')} />
          ) : (
            <div className="g-fila-botones">
              <button className="g-boton g-boton-suave" onClick={() => setPidiendo('rechazar-cambios')}>No aplicarlos…</button>
              <button className="g-boton g-boton-primario" disabled={accion.ocupado} onClick={() => void hacer('aprobar-cambios', 'Cambios publicados.')}>Aprobar cambios</button>
            </div>
          )}
        </div>
      )}

      {editando ? (
        <FormEvento
          inicial={e} imagenUrlInicial={e.imagenUrl} municipios={municipios.datos} modo="direccion" conOrganizador={Boolean(e.organizador)}
          organizador={e.organizador ?? e.entidadNombre}
          ajustesIniciales={{ escena: e.escena, enlazaYincana: e.enlazaYincana, organizador: e.organizador }}
          alGuardar={async (evento, { ajustes }) => {
            await api('PUT', `/direccion/eventos/${e.id}`, { evento, ajustes })
            setEditando(false)
            avisar('Corrección guardada.')
            await recargar()
          }}
        />
      ) : (
        <div className="g-revision">
          <div className="g-revision-imagen">
            {e.imagenUrl ? <a href={e.imagenUrl} target="_blank" rel="noopener noreferrer"><img src={e.imagenUrl} alt="Cartel del evento" /></a> : <Escena tipo={e.escena} />}
            <small>{e.imagenUrl ? 'Cartel subido por la entidad. Pulsa para verlo entero.' : 'Sin cartel: se verá esta ilustración.'}</small>
          </div>
          <Ficha e={e} municipios={municipios.datos} />
        </div>
      )}

      {e.inscripcion && ['publicado', 'cancelado'].includes(e.estado) && !editando && (
        <Inscritos ruta={`/direccion/eventos/${e.id}/inscripciones`} titulo={e.titulo} soloLectura />
      )}

      {pidiendo === 'rechazar' && (
        <PedirMotivo titulo="¿Por qué no se publica?" boton="No publicar" alCancelar={() => setPidiendo(null)}
          alConfirmar={conMotivo('rechazar', 'No publicado.')} />
      )}
      {pidiendo === 'retirar' && (
        <PedirMotivo titulo="¿Por qué se retira de la agenda?" boton="Retirar" alCancelar={() => setPidiendo(null)}
          alConfirmar={conMotivo('retirar', 'Retirado de la agenda.', false)} />
      )}

      {!pidiendo && (
        <div className="g-barra-acciones g-barra-revision">
          <div className="g-barra-botones">
            <button className="g-boton g-boton-suave" onClick={() => setEditando(!editando)}>
              <Icono n="lapiz" /> {editando ? 'Dejar de corregir' : 'Corregir algo'}
            </button>
            {e.estado === 'pendiente' && !editando && (
              <>
                <button className="g-boton g-boton-peligro" onClick={() => setPidiendo('rechazar')}>No publicar…</button>
                <button className="g-boton g-boton-primario" disabled={accion.ocupado} onClick={() => void hacer('aprobar', 'Publicado.')}>
                  <Icono n="check" /> Publicar
                </button>
              </>
            )}
            {['publicado', 'cancelado'].includes(e.estado) && !editando && (
              <button className="g-boton g-boton-peligro" onClick={() => setPidiendo('retirar')}>Retirar de la agenda…</button>
            )}
            {['retirado', 'cancelado', 'rechazado'].includes(e.estado) && !editando && (
              <button className="g-boton g-boton-suave" disabled={accion.ocupado} onClick={() => void hacer('republicar', 'Vuelve a estar publicado.', false)}>Volver a publicar</button>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

// ——— Todos los eventos ———

type FiltroEvento = 'todos' | EstadoEvento
const FILTROS_EVENTO: { id: FiltroEvento; texto: string }[] = [
  { id: 'todos', texto: 'Todos' }, { id: 'pendiente', texto: 'Pendientes' }, { id: 'publicado', texto: 'Publicados' },
  { id: 'rechazado', texto: 'No publicados' }, { id: 'cancelado', texto: 'Cancelados' }, { id: 'retirado', texto: 'Retirados' },
]

export function Eventos() {
  const [params, setParams] = useSearchParams()
  const filtro = (params.get('estado') as FiltroEvento | null) ?? 'todos'
  const [busca, setBusca] = useState('')
  const [pasados, setPasados] = useState(false)
  const { datos, error, cargando } = useCarga<EventoGestion[]>('/direccion/eventos')
  const ahora = new Date().toISOString().slice(0, 16)

  const { grupos, cuentas, ocultosPasados } = useMemo(() => {
    const lista = datos ?? []
    const texto = busca.trim().toLowerCase()
    const coincide = (e: EventoGestion) => !texto || `${e.titulo} ${e.entidadNombre} ${e.organizador ?? ''} ${e.lugar}`.toLowerCase().includes(texto)
    const cuentas: Record<string, number> = { todos: 0 }
    for (const e of lista.filter(coincide)) {
      if (!pasados && e.fin < ahora) continue
      cuentas.todos++
      cuentas[e.estado] = (cuentas[e.estado] ?? 0) + 1
    }
    const visibles = lista.filter((e) => coincide(e) && (filtro === 'todos' || e.estado === filtro))
    const ocultosPasados = pasados ? 0 : visibles.filter((e) => e.fin < ahora).length
    const grupos = new Map<string, EventoGestion[]>()
    for (const e of visibles.filter((x) => pasados || x.fin >= ahora)) {
      const k = nombreMes(e.inicio)
      grupos.set(k, [...(grupos.get(k) ?? []), e])
    }
    return { grupos: [...grupos.entries()], cuentas, ocultosPasados }
  }, [datos, busca, filtro, pasados, ahora])

  return (
    <section className="g-pagina">
      <Cabecera ante="Dirección" titulo="Eventos">
        <Link to="/nuevo" className="g-boton g-boton-primario"><Icono n="mas" /> Meter un evento</Link>
      </Cabecera>

      <div className="g-herramientas">
        <Buscador valor={busca} alCambiar={setBusca} texto="Buscar por título, entidad o lugar" />
        <Filtros opciones={FILTROS_EVENTO.map((f) => ({ ...f, n: cuentas[f.id] ?? 0 }))} valor={filtro}
          alCambiar={(v) => setParams(v === 'todos' ? {} : { estado: v }, { replace: true })} />
      </div>

      <Fallo>{error}</Fallo>
      {cargando && !datos && <Cargando />}
      {datos && !grupos.length && (
        <Vacio icono="buscar" titulo={busca ? 'No hay eventos que coincidan' : 'No hay eventos aquí'}>
          {busca ? 'Prueba con otra palabra o cambia el filtro.' : 'Cambia el filtro o mete un evento nuevo.'}
        </Vacio>
      )}
      {grupos.map(([mes, lista]) => (
        <section key={mes} className="g-bloque">
          <h2 className="g-mes">{mes}</h2>
          <div className="g-lista">
            {lista.map((e) => <FilaEvento key={e.id} e={e} a={`/revisar/${e.id}`} extra={e.cambios ? <span className="g-marca-cambios">Con cambios propuestos</span> : undefined} />)}
          </div>
        </section>
      ))}
      {(ocultosPasados > 0 || pasados) && (
        <button className="g-enlace g-centrado" onClick={() => setPasados(!pasados)}>
          {pasados ? 'Ocultar los que ya han pasado' : `Ver también los que ya han pasado (${ocultosPasados})`}
        </button>
      )}
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
    <section className="g-pagina g-pagina-ancha">
      <Cabecera titulo="Meter un evento" volver={{ a: '/eventos', texto: 'Eventos' }} />
      <p className="g-suave g-subtitulo">Para carteles, avisos del Ayuntamiento o eventos de quien no tiene cuenta. Sale publicado directamente.</p>
      <FormEvento
        key={elegida.id}
        inicial={inicial} municipios={municipios.datos} modo="direccion" conOrganizador={elegida.interna}
        organizador={elegida.interna ? '' : elegida.nombre}
        ajustesIniciales={{ escena: escenaPorDefecto(inicial.categoria), enlazaYincana: false, organizador: elegida.interna ? '' : null }}
        cabecera={(
          <section className="g-seccion">
            <div className="g-rejilla">
              <label className="g-campo g-campo-ancho">
                <span className="g-etiqueta">A nombre de</span>
                <select value={elegida.id} onChange={(ev) => setEntidadId(Number(ev.target.value))}>
                  {verificadas.map((x) => <option key={x.id} value={x.id}>{x.interna ? 'Valverde Cuenta (escribo yo quién organiza)' : x.nombre}</option>)}
                </select>
              </label>
            </div>
          </section>
        )}
        alGuardar={async (evento, { ajustes }) => {
          const r = await api<{ id: number }>('POST', '/direccion/eventos', { evento, ajustes, entidadId: elegida.id })
          avisar('Evento publicado.')
          navegar(`/revisar/${r.id}`, { replace: true })
        }}
      />
    </section>
  )
}

// ——— Entidades ———

type FiltroEntidad = 'todas' | EstadoEntidad

export function Entidades() {
  const { datos, error, cargando } = useCarga<Entidad[]>('/direccion/entidades')
  const [filtro, setFiltro] = useState<FiltroEntidad>('todas')
  const [busca, setBusca] = useState('')
  const reales = (datos ?? []).filter((e) => !e.interna)
  const texto = busca.trim().toLowerCase()
  const coinciden = reales.filter((e) => !texto || `${e.nombre} ${e.municipio} ${e.cif ?? ''}`.toLowerCase().includes(texto))
  const n = (estado: EstadoEntidad) => coinciden.filter((e) => e.estado === estado).length
  const visibles = coinciden.filter((e) => filtro === 'todas' || e.estado === filtro)
    .sort((a, b) => Number(b.estado === 'pendiente') - Number(a.estado === 'pendiente') || a.nombre.localeCompare(b.nombre))

  return (
    <section className="g-pagina">
      <Cabecera ante="Dirección" titulo="Entidades" />
      <div className="g-herramientas">
        <Buscador valor={busca} alCambiar={setBusca} texto="Buscar por nombre, pueblo o CIF" />
        <Filtros<FiltroEntidad> valor={filtro} alCambiar={setFiltro} opciones={[
          { id: 'todas', texto: 'Todas', n: coinciden.length }, { id: 'pendiente', texto: 'Pendientes', n: n('pendiente') },
          { id: 'verificada', texto: 'Verificadas', n: n('verificada') }, { id: 'suspendida', texto: 'Suspendidas', n: n('suspendida') },
          { id: 'rechazada', texto: 'Rechazadas', n: n('rechazada') },
        ]} />
      </div>
      <Fallo>{error}</Fallo>
      {cargando && !datos && <Cargando />}
      {datos && !visibles.length && <Vacio icono="personas" titulo={reales.length ? 'Ninguna coincide' : 'Aún no hay entidades'} />}
      <div className="g-lista">
        {visibles.map((e) => <FilaEntidad key={e.id} e={e} />)}
      </div>
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

  const hacer = (ruta: string, mensaje: string) => accion.hacer(async () => {
    const r = await api('POST', `/direccion/entidades/${e.id}/${ruta}`)
    confirmar(mensaje, r)
    await recargar()
  })
  const guardarNota = (ev: FormEvent) => {
    ev.preventDefault()
    void accion.hacer(async () => {
      await api('PUT', `/direccion/entidades/${e.id}/nota`, { nota })
      setNota(null)
      avisar('Nota guardada.')
      await recargar()
    })
  }

  return (
    <section className="g-pagina">
      <Cabecera titulo={e.nombre} volver={{ a: '/entidades', texto: 'Entidades' }}>
        <Estado estado={e.estado} />
      </Cabecera>

      {e.estado === 'pendiente' && (
        <div className="g-caja g-caja-revisar">
          <h2>Pide darse de alta</h2>
          <p>
            Antes de verificarla, comprueba que existe y no tiene ánimo de lucro: búscala en el Registro de Asociaciones de Andalucía,
            mira su web o redes, o llama a la persona de contacto. La letra del CIF ({e.cif?.[0]}) dice: <b>{e.tipoCif}</b>.
          </p>
          {!e.emailVerificado && <p className="g-aviso">Aún no ha confirmado su correo: espera a que lo haga antes de verificarla.</p>}
          {pidiendo === 'rechazar' ? (
            <PedirMotivo titulo="¿Por qué no se acepta el alta?" boton="No aceptar" alCancelar={() => setPidiendo(null)}
              alConfirmar={async (motivo) => {
                confirmar('Alta no aceptada.', await api('POST', `/direccion/entidades/${e.id}/rechazar`, { motivo }))
                setPidiendo(null)
                await recargar()
              }} />
          ) : (
            <div className="g-fila-botones">
              <button className="g-boton g-boton-suave" onClick={() => setPidiendo('rechazar')}>No aceptar…</button>
              <button className="g-boton g-boton-primario" disabled={accion.ocupado || !e.emailVerificado} onClick={() => void hacer('verificar', 'Entidad verificada.')}>
                <Icono n="check" /> Verificar entidad
              </button>
            </div>
          )}
        </div>
      )}

      <dl className="g-ficha">
        <dt>Tipo</dt><dd>{nombreTipo(e.tipo)}</dd>
        <dt>CIF</dt><dd>{e.cif} {e.tipoCif && <span className="g-suave">· {e.tipoCif}</span>}</dd>
        <dt>Municipio</dt><dd>{e.municipio}</dd>
        <dt>Contacto</dt>
        <dd>
          {e.personaContacto}
          {e.telefono && <> · <a href={`tel:${e.telefono}`}>{e.telefono}</a></>}
          {e.email && <> · <a href={`mailto:${e.email}`}>{e.email}</a></>}
          {!e.emailVerificado && <b> (correo sin confirmar)</b>}
        </dd>
        <dt>Web</dt><dd>{e.web ? <span className="g-url">{e.web}</span> : '—'}</dd>
        <dt>Alta</dt><dd>{fechaIso(e.creado)}{e.revisado ? ` · revisada ${fechaIso(e.revisado)}` : ''}</dd>
        {e.motivo && <><dt>Motivo</dt><dd>{e.motivo}</dd></>}
      </dl>

      <form className="g-caja" onSubmit={guardarNota}>
        <label className="g-campo">
          <span className="g-etiqueta">Nota interna <small className="g-ayuda">Solo la ve dirección</small></span>
          <textarea rows={2} maxLength={2000} value={nota ?? e.nota} onChange={(ev) => setNota(ev.target.value)} placeholder="Por ejemplo: hablé con su presidenta el 3 de diciembre." />
        </label>
        {nota !== null && <div className="g-fila-botones"><button className="g-boton g-boton-suave">Guardar nota</button></div>}
      </form>

      <Fallo>{accion.error}</Fallo>
      {pidiendo === 'suspender' && (
        <PedirMotivo titulo="¿Por qué se suspende?" boton="Suspender" alCancelar={() => setPidiendo(null)}
          alConfirmar={async (motivo) => {
            confirmar('Entidad suspendida.', await api('POST', `/direccion/entidades/${e.id}/suspender`, { motivo }))
            setPidiendo(null)
            await recargar()
          }} />
      )}
      {!pidiendo && e.estado !== 'pendiente' && (
        <div className="g-fila-botones g-fila-izquierda">
          {e.estado === 'rechazada' && <button className="g-boton g-boton-suave" onClick={() => void hacer('verificar', 'Entidad verificada.')}>Verificarla al final</button>}
          {e.estado === 'verificada' && <button className="g-boton g-boton-peligro" onClick={() => setPidiendo('suspender')}>Suspender…</button>}
          {e.estado === 'suspendida' && <button className="g-boton g-boton-suave" onClick={() => void hacer('reactivar', 'Entidad reactivada.')}>Reactivar</button>}
        </div>
      )}

      <section className="g-bloque">
        <h2 className="g-bloque-titulo"><Icono n="calendario" /> Sus eventos <span className="g-cuenta-filtro">{e.listaEventos.length}</span></h2>
        {e.listaEventos.length
          ? <div className="g-lista">{e.listaEventos.map((ev) => <FilaEvento key={ev.id} e={ev} a={`/revisar/${ev.id}`} mostrarEntidad={false} />)}</div>
          : <p className="g-suave">Todavía no ha enviado ningún evento.</p>}
      </section>
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
      avisar('Municipio añadido.')
      await recargar()
    })
  }
  return (
    <section className="g-pagina">
      <Cabecera ante="Dirección" titulo="Zona de la agenda" />
      <p className="g-suave g-subtitulo">Solo los pueblos activos aparecen al dar de alta entidades y eventos. La distancia es en línea recta desde el centro de Valverde.</p>
      <Fallo>{error || accion.error}</Fallo>
      <div className="g-lista">
        {datos?.map((m) => (
          <label key={m.id} className={m.activo ? 'g-fila g-fila-municipio' : 'g-fila g-fila-municipio apagado'}>
            <span className="g-icono-redondo"><Icono n="pin" /></span>
            <span className="g-fila-cuerpo"><b>{m.nombre}</b><small>{m.esValverde ? 'Centro de la agenda' : `${m.distanciaKm} km`}</small></span>
            {m.esValverde ? <span className="g-suave">Siempre</span> : (
              <span className="g-interruptor">
                <input type="checkbox" checked={m.activo} disabled={accion.ocupado} onChange={() => void cambiar(m)} aria-label={`${m.nombre} en la agenda`} />
                <span className="g-interruptor-pista" aria-hidden="true" />
              </span>
            )}
          </label>
        ))}
      </div>
      <form className="g-seccion" onSubmit={anadir}>
        <header className="g-seccion-cabeza">
          <span className="g-paso"><Icono n="mas" tam={16} /></span>
          <div><h2>Añadir un municipio o pedanía</h2><p>Las coordenadas se copian de Google Maps u OpenStreetMap (clic derecho en el centro del pueblo).</p></div>
        </header>
        <div className="g-rejilla g-rejilla-tres">
          <label className="g-campo"><span className="g-etiqueta">Nombre</span><input value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} required /></label>
          <label className="g-campo"><span className="g-etiqueta">Latitud</span><input inputMode="decimal" value={nuevo.lat} onChange={(e) => setNuevo({ ...nuevo, lat: e.target.value })} required placeholder="37.57" /></label>
          <label className="g-campo"><span className="g-etiqueta">Longitud</span><input inputMode="decimal" value={nuevo.lng} onChange={(e) => setNuevo({ ...nuevo, lng: e.target.value })} required placeholder="-6.75" /></label>
        </div>
        <div className="g-fila-botones"><button className="g-boton g-boton-suave" disabled={accion.ocupado}>Añadir</button></div>
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
  imagen_subida: 'Sube una imagen', demo_creada: 'Empieza la demostración',
}

interface Apunte { id: number; fecha: string; accion: string; objeto: string; detalle: string; ip: string; quien: string | null; rol: string | null }

export function Actividad() {
  const [antes, setAntes] = useState(0)
  const { datos, error } = useCarga<Apunte[]>(`/direccion/registro${antes ? `?antes=${antes}` : ''}`)
  const equipo = useCarga<{ id: number; nombre: string; email: string; dobleFactor: number; ultimoAcceso: string | null }[]>('/direccion/equipo')
  return (
    <section className="g-pagina">
      <Cabecera ante="Dirección" titulo="Actividad" />
      <section className="g-bloque">
        <h2 className="g-bloque-titulo"><Icono n="personas" /> Equipo de dirección</h2>
        <div className="g-lista">
          {equipo.datos?.map((u) => (
            <div key={u.id} className="g-fila">
              <span className="g-avatar">{u.nombre.slice(0, 1)}</span>
              <span className="g-fila-cuerpo"><b>{u.nombre}</b><small>{u.email} · último acceso {u.ultimoAcceso ? fechaIso(u.ultimoAcceso) : 'nunca'}</small></span>
              <span className={u.dobleFactor ? 'g-estado g-estado-publicado' : 'g-estado g-estado-pendiente'}>{u.dobleFactor ? 'Doble factor' : 'Sin doble factor'}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="g-bloque">
        <h2 className="g-bloque-titulo"><Icono n="actividad" /> Registro</h2>
        <p className="g-suave">Todo lo que pasa en el panel queda aquí. Si ves una entrada que no reconoces, cambia tu contraseña y avisa.</p>
        <Fallo>{error}</Fallo>
        <ol className="g-registro">
          {datos?.map((r) => (
            <li key={r.id} className={/fallo|bloqueada/.test(r.accion) ? 'alerta' : ''}>
              <time>{fechaIso(r.fecha)}</time>
              <span><b>{r.quien ?? (r.ip === 'consola' ? 'Consola del servidor' : 'Alguien sin cuenta')}</b> · {ACCIONES[r.accion] ?? r.accion}</span>
              {r.detalle && <small>{r.detalle}</small>}
            </li>
          ))}
        </ol>
        {datos?.length === 100 && <button className="g-boton g-boton-suave" onClick={() => setAntes(datos.at(-1)!.id)}>Más antiguos</button>}
      </section>
    </section>
  )
}
