import { Fragment, useState, type FormEvent, type ReactNode } from 'react'
import { Link, NavLink, useNavigate, useParams } from 'react-router-dom'
import type { Campana, ComercioGestion, DatosComercio, EstadoComercio, EstadoPago, Oferta, Plan, TipoPlan } from '../../../compartido/tipos.ts'
import { CATEGORIAS_COMERCIO, PLANES } from '../../../compartido/tipos.ts'
import { api } from '../api.ts'
import { avisar } from '../componentes/Avisos.tsx'
import { FormComercio, comercioVacio } from '../componentes/FormComercio.tsx'
import { Icono } from '../componentes/Iconos.tsx'
import { Buscador, Filtros, Vacio } from '../componentes/Listas.tsx'
import { Cargando, Fallo, PedirMotivo, useAccion, useCarga, useMunicipios } from '../componentes/piezas.tsx'

const TEXTO_ESTADO: Record<EstadoComercio, string> = { pendiente: 'Pendiente de revisión', verificado: 'En la guía', rechazado: 'No aceptado', suspendido: 'Suspendido' }
const CLASE_ESTADO: Record<EstadoComercio, string> = { pendiente: 'pendiente', verificado: 'publicado', rechazado: 'rechazado', suspendido: 'suspendida' }
const nombreCategoria = (c: string) => CATEGORIAS_COMERCIO.find((x) => x.id === c)?.nombre ?? c
const euros = (n: number) => `${n.toLocaleString('es-ES', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })} €`
const fechaCorta = (d: string) => new Date(`${d}T12:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
const confirmar = (hecho: string, r: unknown) => {
  const avisado = (r as { avisado?: string } | null)?.avisado
  avisar(avisado ? `${hecho} Hemos avisado a ${avisado}.` : hecho)
}

export const ChipPlan = ({ tipo }: { tipo: TipoPlan | null }) =>
  <span className={`g-plan g-plan-${tipo ?? 'basica'}`}>{tipo ? PLANES[tipo].nombre : 'Ficha básica'}</span>

function Pestanas() {
  return (
    <nav className="g-pestanas">
      <NavLink to="/comercios" end><Icono n="tienda" /> Comercios</NavLink>
      <NavLink to="/campanas"><Icono n="calendario" /> Campañas</NavLink>
      <NavLink to="/cobros"><Icono n="euro" /> Cobros</NavLink>
    </nav>
  )
}

function Cabecera({ titulo, volver, children }: { titulo: string; volver?: { a: string; texto: string }; children?: ReactNode }) {
  return (
    <header className="g-cabecera">
      <div>
        {volver ? <Link to={volver.a} className="g-volver"><Icono n="atras" tam={16} /> {volver.texto}</Link> : <p className="g-antetitulo">Guía y anuncios</p>}
        <h1>{titulo}</h1>
      </div>
      {children && <div className="g-cabecera-acciones">{children}</div>}
    </header>
  )
}

export function FilaComercio({ c }: { c: ComercioGestion }) {
  return (
    <Link to={`/comercios/${c.id}`} className={c.estado === 'pendiente' ? 'g-fila g-fila-destacada' : 'g-fila'}>
      {c.logoUrl ? <img className="g-fila-miniatura" src={c.logoUrl} alt="" /> : <span className="g-avatar">{CATEGORIAS_COMERCIO.find((x) => x.id === c.categoria)?.emoji}</span>}
      <span className="g-fila-cuerpo">
        <b>{c.nombre}</b>
        <small>{nombreCategoria(c.categoria)} · {c.municipio}{c.caduca ? ` · hasta el ${fechaCorta(c.caduca)}` : ''}</small>
        <small className="g-adjuntos">
          <ChipPlan tipo={c.planActual} />
          {c.pagoPendiente && <span className="g-alerta-pago">Pago pendiente</span>}
          {c.cambios && <span>Cambios por revisar</span>}
        </small>
      </span>
      <span className="g-fila-final">
        {c.estado === 'pendiente' ? <span className="g-revisar">Revisar</span> : <span className={`g-estado g-estado-${CLASE_ESTADO[c.estado]}`}>{TEXTO_ESTADO[c.estado]}</span>}
        <Icono n="adelante" tam={18} />
      </span>
    </Link>
  )
}

// ——— Lista ———

type Filtro = 'todos' | 'pendientes' | 'plan' | 'basica' | 'suspendidos'

export function ListaComercios() {
  const { datos, error, cargando } = useCarga<ComercioGestion[]>('/direccion/comercios')
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [busca, setBusca] = useState('')
  const t = busca.trim().toLowerCase()
  const coinciden = (datos ?? []).filter((c) => !t || `${c.nombre} ${c.direccion} ${c.municipio} ${c.nif ?? ''}`.toLowerCase().includes(t))
  const de: Record<Filtro, (c: ComercioGestion) => boolean> = {
    todos: () => true, pendientes: (c) => c.estado === 'pendiente' || Boolean(c.cambios), plan: (c) => c.planActual !== null,
    basica: (c) => c.estado === 'verificado' && c.planActual === null, suspendidos: (c) => c.estado === 'suspendido' || c.estado === 'rechazado',
  }
  const visibles = coinciden.filter(de[filtro])
  return (
    <section className="g-pagina">
      <Cabecera titulo="Comercios">
        <Link to="/comercios/nuevo" className="g-boton g-boton-primario"><Icono n="mas" /> Dar de alta</Link>
      </Cabecera>
      <Pestanas />
      <div className="g-herramientas">
        <Buscador valor={busca} alCambiar={setBusca} texto="Buscar por nombre, calle o NIF" />
        <Filtros<Filtro> valor={filtro} alCambiar={setFiltro} opciones={([
          ['todos', 'Todos'], ['pendientes', 'Por revisar'], ['plan', 'Con plan'], ['basica', 'Solo ficha básica'], ['suspendidos', 'Suspendidos'],
        ] as const).map(([id, texto]) => ({ id, texto, n: coinciden.filter(de[id]).length }))} />
      </div>
      <Fallo>{error}</Fallo>
      {cargando && !datos && <Cargando />}
      {datos && !visibles.length && <Vacio icono="tienda" titulo={datos.length ? 'Ninguno coincide' : 'Aún no hay comercios'}>Los comercios se dan de alta desde el panel («Tengo un comercio») o los dais de alta vosotras.</Vacio>}
      <div className="g-lista">{visibles.map((c) => <FilaComercio key={c.id} c={c} />)}</div>
    </section>
  )
}

// ——— Alta directa ———

export function NuevoComercio() {
  const navegar = useNavigate()
  const municipios = useMunicipios()
  const [extra, setExtra] = useState({ nif: '', personaContacto: '', telefonoContacto: '', emailCuenta: '' })
  if (!municipios.datos) return <section className="g-pagina"><Cargando /></section>
  return (
    <section className="g-pagina">
      <Cabecera titulo="Dar de alta un comercio" volver={{ a: '/comercios', texto: 'Comercios' }} />
      <p className="g-suave g-subtitulo">Para los comercios con los que habláis en persona: sale en la guía directamente. Si le ponéis correo, le llega una invitación para gestionar su ficha.</p>
      <FormComercio
        inicial={comercioVacio(municipios.datos.find((m) => m.esValverde))} municipios={municipios.datos} escaparate textoBoton="Dar de alta"
        cabecera={(
          <section className="g-seccion">
            <header className="g-seccion-cabeza"><span className="g-paso"><Icono n="personas" tam={16} /></span><div><h2>Datos internos</h2><p>No se publican.</p></div></header>
            <div className="g-rejilla">
              <label className="g-campo"><span className="g-etiqueta">CIF, DNI o NIE (opcional)</span><input value={extra.nif} onChange={(e) => setExtra({ ...extra, nif: e.target.value })} /></label>
              <label className="g-campo"><span className="g-etiqueta">Persona de contacto</span><input value={extra.personaContacto} onChange={(e) => setExtra({ ...extra, personaContacto: e.target.value })} /></label>
              <label className="g-campo"><span className="g-etiqueta">Teléfono de contacto</span><input type="tel" value={extra.telefonoContacto} onChange={(e) => setExtra({ ...extra, telefonoContacto: e.target.value })} /></label>
              <label className="g-campo"><span className="g-etiqueta">Correo para su cuenta (opcional)</span><input type="email" value={extra.emailCuenta} onChange={(e) => setExtra({ ...extra, emailCuenta: e.target.value })} /></label>
            </div>
          </section>
        )}
        alGuardar={async (ficha) => {
          const r = await api<{ id: number }>('POST', '/direccion/comercios', { ficha, ...extra })
          avisar(extra.emailCuenta ? 'Comercio dado de alta. Le hemos mandado la invitación.' : 'Comercio dado de alta.')
          navegar(`/comercios/${r.id}`, { replace: true })
        }}
      />
    </section>
  )
}

// ——— Ficha de un comercio para dirección ———

type Detalle = ComercioGestion & { planes: Plan[]; ofertas: Oferta[] }

const CAMPOS: [keyof DatosComercio, string][] = [
  ['nombre', 'Nombre'], ['categoria', 'Categoría'], ['direccion', 'Dirección'], ['telefono', 'Teléfono'], ['horario', 'Horario'],
  ['descripcion', 'Descripción'], ['whatsapp', 'WhatsApp'], ['emailPublico', 'Correo'], ['web', 'Web'], ['instagram', 'Instagram'], ['facebook', 'Facebook'],
]

export function FichaComercio() {
  const { id } = useParams()
  const { datos: c, error, recargar } = useCarga<Detalle>(`/direccion/comercios/${id}`)
  const municipios = useMunicipios(true)
  const [pidiendo, setPidiendo] = useState<'rechazar' | 'suspender' | 'rechazar-cambios' | null>(null)
  const [editando, setEditando] = useState(false)
  const [nota, setNota] = useState<string | null>(null)
  const accion = useAccion()
  if (!c || !municipios.datos) return <section className="g-pagina"><Fallo>{error}</Fallo>{!error && <Cargando />}</section>

  const hacer = (ruta: string, hecho: string) => accion.hacer(async () => {
    confirmar(hecho, await api('POST', `/direccion/comercios/${c.id}/${ruta}`))
    await recargar()
  })

  return (
    <section className="g-pagina">
      <Cabecera titulo={c.nombre} volver={{ a: '/comercios', texto: 'Comercios' }}>
        <span className={`g-estado g-estado-${CLASE_ESTADO[c.estado]}`}>{TEXTO_ESTADO[c.estado]}</span>
      </Cabecera>
      <p className="g-suave g-subtitulo">{nombreCategoria(c.categoria)} · {c.direccion}, {c.municipio} · {c.visitas30} visitas a su ficha en 30 días</p>
      <Fallo>{accion.error}</Fallo>

      {c.estado === 'pendiente' && (
        <div className="g-caja g-caja-revisar">
          <h2>Pide entrar en la guía</h2>
          <p>Comprueba que el comercio existe y está en la zona (una llamada basta). Su ficha básica es gratis.</p>
          {pidiendo === 'rechazar' ? (
            <PedirMotivo titulo="¿Por qué no se acepta?" boton="No aceptar" alCancelar={() => setPidiendo(null)}
              alConfirmar={async (motivo) => { confirmar('No aceptado.', await api('POST', `/direccion/comercios/${c.id}/rechazar`, { motivo })); setPidiendo(null); await recargar() }} />
          ) : (
            <div className="g-fila-botones">
              <button className="g-boton g-boton-suave" onClick={() => setPidiendo('rechazar')}>No aceptar…</button>
              <button className="g-boton g-boton-primario" disabled={accion.ocupado} onClick={() => void hacer('verificar', 'Comercio publicado en la guía.')}><Icono n="check" /> Publicar en la guía</button>
            </div>
          )}
        </div>
      )}

      {c.cambios && (
        <div className="g-caja g-caja-cambios">
          <h2>Cambios propuestos en su ficha</h2>
          <div className="g-diferencias">
            {CAMPOS.filter(([k]) => c[k] !== c.cambios![k]).map(([k, nombre]) => (
              <div key={k} className="g-dif"><span className="g-dif-campo">{nombre}</span><span className="g-dif-antes">{String(c[k]) || '—'}</span><Icono n="adelante" tam={16} /><span className="g-dif-despues">{String(c.cambios![k]) || '—'}</span></div>
            ))}
            {(c.logo !== c.cambios.logo || c.fotos.join() !== c.cambios.fotos.join()) && <div className="g-dif"><span className="g-dif-campo">Imágenes</span><span className="g-dif-despues">Ha cambiado el logo o las fotos</span></div>}
          </div>
          {pidiendo === 'rechazar-cambios' ? (
            <PedirMotivo titulo="¿Por qué no se aplican?" boton="No aplicar" alCancelar={() => setPidiendo(null)}
              alConfirmar={async (motivo) => { confirmar('Cambios descartados.', await api('POST', `/direccion/comercios/${c.id}/rechazar-cambios`, { motivo })); setPidiendo(null); await recargar() }} />
          ) : (
            <div className="g-fila-botones">
              <button className="g-boton g-boton-suave" onClick={() => setPidiendo('rechazar-cambios')}>No aplicarlos…</button>
              <button className="g-boton g-boton-primario" disabled={accion.ocupado} onClick={() => void hacer('aprobar-cambios', 'Cambios aplicados.')}>Aprobar cambios</button>
            </div>
          )}
        </div>
      )}

      <div className="g-dos-columnas">
        <div className="g-columna">
          <Planes comercio={c} alCambiar={recargar} />
          <OfertasComercio ofertas={c.ofertas} alCambiar={recargar} />
          {editando ? (
            <FormComercio inicial={c} inicialUrls={{ logo: c.logoUrl, fotos: c.fotosUrl }} municipios={municipios.datos} escaparate textoBoton="Guardar ficha"
              alGuardar={async (ficha) => {
                await api('PUT', `/direccion/comercios/${c.id}`, { ficha, nota: c.nota })
                setEditando(false)
                avisar('Ficha guardada.')
                await recargar()
              }} />
          ) : (
            <section className="g-bloque">
              <h2 className="g-bloque-titulo"><Icono n="tienda" /> Ficha</h2>
              <dl className="g-ficha">
                {CAMPOS.filter(([k]) => c[k]).map(([k, nombre]) => (
                  <Fragment key={k}><dt>{nombre}</dt><dd className="g-parrafos">{k === 'categoria' ? nombreCategoria(c.categoria) : String(c[k])}</dd></Fragment>
                ))}
              </dl>
              {(c.logoUrl || c.fotosUrl.length > 0) && (
                <div className="g-galeria">{[c.logoUrl, ...c.fotosUrl].filter(Boolean).map((u) => <figure key={u}><img src={u!} alt="" /></figure>)}</div>
              )}
              <div className="g-fila-botones g-fila-izquierda"><button className="g-boton g-boton-suave" onClick={() => setEditando(true)}><Icono n="lapiz" /> Corregir la ficha</button></div>
            </section>
          )}
        </div>
        <aside className="g-columna g-columna-lateral">
          <section className="g-caja">
            <h2>Contacto (privado)</h2>
            <dl className="g-mini-ficha">
              <dt>Persona</dt><dd>{c.personaContacto || '—'}</dd>
              <dt>Teléfono</dt><dd>{c.telefonoContacto ? <a href={`tel:${c.telefonoContacto}`}>{c.telefonoContacto}</a> : '—'}</dd>
              <dt>Cuenta</dt><dd>{c.email ? <a href={`mailto:${c.email}`}>{c.email}</a> : 'Sin cuenta'}</dd>
              <dt>NIF</dt><dd>{c.nif || '—'}</dd>
            </dl>
            {!c.email && <InvitarCuenta comercioId={c.id} alTerminar={recargar} />}
          </section>
          <form className="g-caja g-campo" onSubmit={(e: FormEvent) => {
            e.preventDefault()
            void accion.hacer(async () => {
              await api('PUT', `/direccion/comercios/${c.id}`, { ficha: { ...pick(c) }, nota: nota ?? c.nota })
              setNota(null)
              avisar('Nota guardada.')
              await recargar()
            })
          }}>
            <span className="g-etiqueta">Nota interna</span>
            <textarea rows={3} value={nota ?? c.nota} onChange={(e) => setNota(e.target.value)} placeholder="Por ejemplo: prefiere pagar por Bizum." />
            {nota !== null && <button className="g-boton g-boton-suave">Guardar nota</button>}
          </form>
          {pidiendo === 'suspender' && (
            <PedirMotivo titulo="¿Por qué se suspende?" boton="Suspender" alCancelar={() => setPidiendo(null)}
              alConfirmar={async (motivo) => { confirmar('Comercio suspendido.', await api('POST', `/direccion/comercios/${c.id}/suspender`, { motivo })); setPidiendo(null); await recargar() }} />
          )}
          {!pidiendo && c.estado === 'verificado' && <button className="g-boton g-boton-peligro" onClick={() => setPidiendo('suspender')}>Quitar de la guía…</button>}
          {c.estado === 'suspendido' && <button className="g-boton g-boton-suave" onClick={() => void hacer('reactivar', 'Vuelve a estar en la guía.')}>Volver a publicar</button>}
        </aside>
      </div>
    </section>
  )
}

/** Solo los datos de la ficha (para guardar la nota sin tocar el resto). */
const pick = (c: ComercioGestion): DatosComercio => ({
  nombre: c.nombre, categoria: c.categoria, descripcion: c.descripcion, direccion: c.direccion, municipioId: c.municipioId, lat: c.lat, lng: c.lng,
  telefono: c.telefono, whatsapp: c.whatsapp, emailPublico: c.emailPublico, web: c.web, instagram: c.instagram, facebook: c.facebook,
  horario: c.horario, logo: c.logo, fotos: c.fotos,
})

function InvitarCuenta({ comercioId, alTerminar }: { comercioId: number; alTerminar: () => Promise<void> }) {
  const [f, setF] = useState({ email: '', nombre: '' })
  const accion = useAccion()
  return (
    <details>
      <summary>Crearle una cuenta</summary>
      <form className="g-form" onSubmit={(e) => {
        e.preventDefault()
        void accion.hacer(async () => {
          await api('POST', `/direccion/comercios/${comercioId}/cuenta`, f)
          avisar('Invitación enviada.')
          await alTerminar()
        })
      }}>
        <label className="g-campo"><span className="g-etiqueta">Nombre</span><input value={f.nombre} required onChange={(e) => setF({ ...f, nombre: e.target.value })} /></label>
        <label className="g-campo"><span className="g-etiqueta">Correo</span><input type="email" value={f.email} required onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
        <Fallo>{accion.error}</Fallo>
        <button className="g-boton g-boton-suave" disabled={accion.ocupado}>Enviar invitación</button>
      </form>
    </details>
  )
}

// ——— Planes ———

const hoyIso = () => new Date().toISOString().slice(0, 10)
const masDias = (d: string, n: number) => new Date(Date.parse(`${d}T12:00`) + n * 86400_000).toISOString().slice(0, 10)
const DURACIONES: Record<TipoPlan, { dias: number; importe: number }> = {
  escaparate: { dias: 30, importe: 15 }, destacado: { dias: 30, importe: 35 }, campana: { dias: 14, importe: 30 }, promocion: { dias: 7, importe: 10 }, patrocinio: { dias: 365, importe: 0 },
}

function FormPlan({ comercioId, plan, alTerminar }: { comercioId: number; plan?: Plan; alTerminar: () => void }) {
  const campanas = useCarga<Campana[]>('/direccion/campanas')
  const [p, setP] = useState(() => plan
    ? { tipo: plan.tipo, campanaId: plan.campanaId, desde: plan.desde, hasta: plan.hasta, importe: plan.importe, estadoPago: plan.estadoPago, metodo: plan.metodo, factura: plan.factura, nota: plan.nota }
    : { tipo: 'escaparate' as TipoPlan, campanaId: null as number | null, desde: hoyIso(), hasta: masDias(hoyIso(), 29), importe: 15, estadoPago: 'pendiente' as EstadoPago, metodo: '', factura: '', nota: '' })
  const accion = useAccion()
  const poner = (c: Partial<typeof p>) => setP({ ...p, ...c })
  const cambiarTipo = (tipo: TipoPlan) => {
    const d = DURACIONES[tipo]
    poner({ tipo, importe: d.importe, hasta: masDias(p.desde, d.dias - 1) })
  }
  return (
    <form className="g-caja g-form" onSubmit={(e) => {
      e.preventDefault()
      void accion.hacer(async () => {
        if (plan) await api('PUT', `/direccion/planes/${plan.id}`, p)
        else await api('POST', `/direccion/comercios/${comercioId}/planes`, p)
        avisar(plan ? 'Plan actualizado.' : 'Plan añadido.')
        alTerminar()
      })
    }}>
      <h2>{plan ? 'Cambiar el plan' : 'Añadir un plan'}</h2>
      <div className="g-rejilla">
        <label className="g-campo"><span className="g-etiqueta">Plan</span>
          <select value={p.tipo} onChange={(e) => cambiarTipo(e.target.value as TipoPlan)}>
            {(Object.keys(PLANES) as TipoPlan[]).map((t) => <option key={t} value={t}>{PLANES[t].nombre} · {PLANES[t].precio}</option>)}
          </select>
        </label>
        {p.tipo === 'campana' && (
          <label className="g-campo"><span className="g-etiqueta">Campaña</span>
            <select value={p.campanaId ?? ''} required onChange={(e) => {
              const ca = campanas.datos?.find((x) => x.id === Number(e.target.value))
              poner({ campanaId: Number(e.target.value), ...(ca ? { desde: ca.desde, hasta: ca.hasta } : {}) })
            }}>
              <option value="">Elige…</option>
              {campanas.datos?.map((ca) => <option key={ca.id} value={ca.id}>{ca.nombre} ({fechaCorta(ca.desde)} – {fechaCorta(ca.hasta)})</option>)}
            </select>
          </label>
        )}
        <label className="g-campo"><span className="g-etiqueta">Desde</span><input type="date" value={p.desde} required onChange={(e) => poner({ desde: e.target.value })} /></label>
        <label className="g-campo"><span className="g-etiqueta">Hasta (incluido)</span><input type="date" value={p.hasta} min={p.desde} required onChange={(e) => poner({ hasta: e.target.value })} /></label>
        <label className="g-campo"><span className="g-etiqueta">Importe (€, IVA incluido)</span><input type="number" min={0} step={0.01} value={p.importe} onChange={(e) => poner({ importe: Number(e.target.value) })} /></label>
        <div className="g-campo"><span className="g-etiqueta">Pago</span>
          <div className="g-segmento">
            {(['pendiente', 'pagado', 'anulado'] as EstadoPago[]).map((e) => (
              <button key={e} type="button" className={p.estadoPago === e ? 'activo' : ''} onClick={() => poner({ estadoPago: e })}>{{ pendiente: 'Pendiente', pagado: 'Pagado', anulado: 'Anulado' }[e]}</button>
            ))}
          </div>
        </div>
        <label className="g-campo"><span className="g-etiqueta">Cómo pagó</span><input value={p.metodo} maxLength={40} placeholder="Bizum, transferencia…" onChange={(e) => poner({ metodo: e.target.value })} /></label>
        <label className="g-campo"><span className="g-etiqueta">Nº de factura</span><input value={p.factura} maxLength={40} onChange={(e) => poner({ factura: e.target.value })} /></label>
        <label className="g-campo g-campo-ancho"><span className="g-etiqueta">Nota</span><input value={p.nota} maxLength={500} placeholder="Comercio fundador: 50 % el primer año…" onChange={(e) => poner({ nota: e.target.value })} /></label>
      </div>
      <Fallo>{accion.error}</Fallo>
      <div className="g-fila-botones">
        <button type="button" className="g-boton g-boton-suave" onClick={alTerminar}>Cancelar</button>
        <button className="g-boton g-boton-primario" disabled={accion.ocupado}>Guardar</button>
      </div>
    </form>
  )
}

const TEXTO_PAGO: Record<EstadoPago, string> = { pendiente: 'Pago pendiente', pagado: 'Pagado', anulado: 'Anulado' }

export function FilaPlan({ p, alPulsar, conComercio }: { p: Plan; alPulsar?: () => void; conComercio?: boolean }) {
  const contenido = (
    <>
      <span className={`g-icono-redondo g-vigencia-${p.vigencia}`}><Icono n="euro" /></span>
      <span className="g-fila-cuerpo">
        <b>{conComercio ? `${p.comercioNombre} · ` : ''}{PLANES[p.tipo].nombre}{p.campanaNombre ? ` · ${p.campanaNombre}` : ''}</b>
        <small>{fechaCorta(p.desde)} – {fechaCorta(p.hasta)} · {euros(p.importe)}{p.metodo ? ` · ${p.metodo}` : ''}{p.factura ? ` · Fra. ${p.factura}` : ''}</small>
        {p.nota && <small>{p.nota}</small>}
      </span>
      <span className="g-fila-final">
        <span className={`g-estado g-estado-${p.estadoPago === 'pagado' ? 'publicado' : p.estadoPago === 'pendiente' ? 'pendiente' : 'retirado'}`}>{TEXTO_PAGO[p.estadoPago]}</span>
        <small className="g-suave">{{ activo: 'En vigor', futuro: 'Empieza más adelante', caducado: 'Terminado' }[p.vigencia]}</small>
      </span>
    </>
  )
  return alPulsar ? <button type="button" className="g-fila g-fila-boton" onClick={alPulsar}>{contenido}</button> : <div className="g-fila">{contenido}</div>
}

function Planes({ comercio, alCambiar }: { comercio: Detalle; alCambiar: () => Promise<void> }) {
  const [editando, setEditando] = useState<Plan | 'nuevo' | null>(null)
  const cerrar = () => {
    setEditando(null)
    void alCambiar()
  }
  return (
    <section className="g-bloque">
      <h2 className="g-bloque-titulo"><Icono n="euro" /> Planes y cobros <ChipPlan tipo={comercio.planActual} /></h2>
      {editando ? <FormPlan comercioId={comercio.id} plan={editando === 'nuevo' ? undefined : editando} alTerminar={cerrar} /> : (
        <>
          {!comercio.planes.length && <p className="g-suave">Solo tiene la ficha básica (gratis).</p>}
          <div className="g-lista">{comercio.planes.map((p) => <FilaPlan key={p.id} p={p} alPulsar={() => setEditando(p)} />)}</div>
          <div className="g-fila-botones g-fila-izquierda"><button className="g-boton g-boton-suave" onClick={() => setEditando('nuevo')}><Icono n="mas" /> Añadir plan o renovación</button></div>
        </>
      )}
    </section>
  )
}

// ——— Ofertas ———

const TEXTO_OFERTA = { pendiente: 'Por revisar', publicada: 'Publicada', rechazada: 'No publicada', retirada: 'Retirada' }

export function FilaOferta({ o, alCambiar, conComercio }: { o: Oferta; alCambiar: () => void; conComercio?: boolean }) {
  const [pidiendo, setPidiendo] = useState<'rechazar' | 'retirar' | null>(null)
  const accion = useAccion()
  return (
    <div className="g-fila g-fila-oferta">
      {o.imagenUrl ? <img className="g-fila-miniatura" src={o.imagenUrl} alt="" /> : <span className="g-icono-redondo"><Icono n="etiqueta" /></span>}
      <span className="g-fila-cuerpo">
        <b>{o.titulo}</b>
        <small>{conComercio ? `${o.comercioNombre} · ` : ''}del {fechaCorta(o.desde)} al {fechaCorta(o.hasta)}</small>
        {o.texto && <small className="g-parrafos">{o.texto}</small>}
        {o.motivo && <small className="g-motivo-texto">Motivo: {o.motivo}</small>}
        {pidiendo && (
          <PedirMotivo titulo={pidiendo === 'rechazar' ? '¿Por qué no se publica?' : '¿Por qué se retira?'} boton={pidiendo === 'rechazar' ? 'No publicar' : 'Retirar'}
            alCancelar={() => setPidiendo(null)} alConfirmar={async (motivo) => {
              confirmar(pidiendo === 'rechazar' ? 'Oferta no publicada.' : 'Oferta retirada.', await api('POST', `/direccion/ofertas/${o.id}/${pidiendo}`, { motivo }))
              setPidiendo(null)
              alCambiar()
            }} />
        )}
        <Fallo>{accion.error}</Fallo>
      </span>
      <span className="g-fila-final g-fila-final-columna">
        <span className={`g-estado g-estado-${o.estado === 'publicada' ? 'publicado' : o.estado === 'pendiente' ? 'pendiente' : 'retirado'}`}>{TEXTO_OFERTA[o.estado]}</span>
        {!pidiendo && o.estado === 'pendiente' && (
          <span className="g-fila-botones">
            <button className="g-boton g-boton-suave g-boton-peq" onClick={() => setPidiendo('rechazar')}>No</button>
            <button className="g-boton g-boton-primario g-boton-peq" disabled={accion.ocupado} onClick={() => void accion.hacer(async () => {
              confirmar('Oferta publicada.', await api('POST', `/direccion/ofertas/${o.id}/aprobar`))
              alCambiar()
            })}>Publicar</button>
          </span>
        )}
        {!pidiendo && o.estado === 'publicada' && <button className="g-enlace" onClick={() => setPidiendo('retirar')}>Retirar</button>}
      </span>
    </div>
  )
}

function OfertasComercio({ ofertas, alCambiar }: { ofertas: Oferta[]; alCambiar: () => Promise<void> }) {
  if (!ofertas.length) return null
  return (
    <section className="g-bloque">
      <h2 className="g-bloque-titulo"><Icono n="etiqueta" /> Ofertas</h2>
      <div className="g-lista">{ofertas.map((o) => <FilaOferta key={o.id} o={o} alCambiar={() => void alCambiar()} />)}</div>
    </section>
  )
}

// ——— Campañas ———

export function Campanas() {
  const { datos, error, recargar } = useCarga<Campana[]>('/direccion/campanas')
  const [editando, setEditando] = useState<Campana | 'nueva' | null>(null)
  return (
    <section className="g-pagina">
      <Cabecera titulo="Campañas">
        <button className="g-boton g-boton-primario" onClick={() => setEditando('nueva')}><Icono n="mas" /> Nueva campaña</button>
      </Cabecera>
      <Pestanas />
      <p className="g-suave">Durante una campaña, la app enseña una sección con los comercios que la han contratado y sus ofertas. Ver el calendario propuesto en la política de cobros.</p>
      <Fallo>{error}</Fallo>
      {editando && <FormCampana campana={editando === 'nueva' ? undefined : editando} alTerminar={() => { setEditando(null); void recargar() }} />}
      <div className="g-lista">
        {datos?.map((ca) => {
          const hoy = hoyIso()
          const ahora = ca.activa && ca.desde <= hoy && ca.hasta >= hoy
          return (
            <button key={ca.id} type="button" className={ca.activa ? 'g-fila g-fila-boton' : 'g-fila g-fila-boton apagado'} onClick={() => setEditando(ca)}>
              <span className="g-icono-redondo"><Icono n="calendario" /></span>
              <span className="g-fila-cuerpo"><b>{ca.nombre}</b><small>{fechaCorta(ca.desde)} – {fechaCorta(ca.hasta)} · {ca.comercios === 1 ? '1 comercio' : `${ca.comercios} comercios`}</small></span>
              <span className="g-fila-final"><span className={`g-estado g-estado-${ahora ? 'publicado' : ca.activa ? 'pendiente' : 'retirado'}`}>{ahora ? 'En marcha' : ca.activa ? (ca.desde > hoy ? 'Próxima' : 'Terminada') : 'Desactivada'}</span></span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function FormCampana({ campana, alTerminar }: { campana?: Campana; alTerminar: () => void }) {
  const [f, setF] = useState(campana ? { nombre: campana.nombre, descripcion: campana.descripcion, desde: campana.desde, hasta: campana.hasta, activa: campana.activa }
    : { nombre: '', descripcion: '', desde: hoyIso(), hasta: masDias(hoyIso(), 14), activa: true })
  const accion = useAccion()
  return (
    <form className="g-caja g-form" onSubmit={(e) => {
      e.preventDefault()
      void accion.hacer(async () => {
        if (campana) await api('PUT', `/direccion/campanas/${campana.id}`, f)
        else await api('POST', '/direccion/campanas', f)
        avisar('Campaña guardada.')
        alTerminar()
      })
    }}>
      <h2>{campana ? campana.nombre : 'Nueva campaña'}</h2>
      <div className="g-rejilla">
        <label className="g-campo g-campo-ancho"><span className="g-etiqueta">Nombre</span><input value={f.nombre} required maxLength={60} onChange={(e) => setF({ ...f, nombre: e.target.value })} placeholder="Black Friday" /></label>
        <label className="g-campo g-campo-ancho"><span className="g-etiqueta">Texto para la app</span><input value={f.descripcion} maxLength={300} onChange={(e) => setF({ ...f, descripcion: e.target.value })} /></label>
        <label className="g-campo"><span className="g-etiqueta">Desde</span><input type="date" value={f.desde} onChange={(e) => setF({ ...f, desde: e.target.value })} /></label>
        <label className="g-campo"><span className="g-etiqueta">Hasta</span><input type="date" value={f.hasta} min={f.desde} onChange={(e) => setF({ ...f, hasta: e.target.value })} /></label>
        <label className="g-interruptor g-campo-ancho"><input type="checkbox" checked={f.activa} onChange={(e) => setF({ ...f, activa: e.target.checked })} /><span className="g-interruptor-pista" aria-hidden="true" /><span>Activa</span></label>
      </div>
      <Fallo>{accion.error}</Fallo>
      <div className="g-fila-botones"><button type="button" className="g-boton g-boton-suave" onClick={alTerminar}>Cancelar</button><button className="g-boton g-boton-primario" disabled={accion.ocupado}>Guardar</button></div>
    </form>
  )
}

// ——— Cobros ———

export function Cobros() {
  const { datos, error } = useCarga<{ cobradoMes: number; cobradoAnio: number; pendiente: number; planes: Plan[]; renovaciones: Plan[] }>('/direccion/cobros')
  const [solo, setSolo] = useState<'todos' | 'pendientes'>('pendientes')
  const navegar = useNavigate()
  const planes = (datos?.planes ?? []).filter((p) => solo === 'todos' || p.estadoPago === 'pendiente')
  return (
    <section className="g-pagina">
      <Cabecera titulo="Cobros" />
      <Pestanas />
      <Fallo>{error}</Fallo>
      {datos && (
        <div className="g-resumen-inscritos">
          <div><b>{euros(datos.cobradoMes)}</b><span>cobrado este mes</span></div>
          <div><b>{euros(datos.cobradoAnio)}</b><span>cobrado este año</span></div>
          <div><b>{euros(datos.pendiente)}</b><span>pendiente de cobro</span></div>
        </div>
      )}
      {!!datos?.renovaciones.length && (
        <section className="g-bloque">
          <h2 className="g-bloque-titulo"><Icono n="reloj" /> Caducan en los próximos 15 días</h2>
          <p className="g-suave">Llamad o escribid para renovar. Si no renuevan, lo de pago se apaga solo y la ficha básica sigue.</p>
          <div className="g-lista">{datos.renovaciones.map((p) => <FilaPlan key={p.id} p={p} conComercio alPulsar={() => navegar(`/comercios/${p.comercioId}`)} />)}</div>
        </section>
      )}
      <section className="g-bloque">
        <h2 className="g-bloque-titulo"><Icono n="euro" /> Planes</h2>
        <Filtros valor={solo} alCambiar={setSolo} opciones={[
          { id: 'pendientes', texto: 'Pago pendiente', n: datos?.planes.filter((p) => p.estadoPago === 'pendiente').length },
          { id: 'todos', texto: 'Todos', n: datos?.planes.length },
        ]} />
        {datos && !planes.length && <p className="g-suave">{solo === 'pendientes' ? 'No hay nada pendiente de cobro.' : 'Aún no hay planes.'}</p>}
        <div className="g-lista">{planes.map((p) => <FilaPlan key={p.id} p={p} conComercio alPulsar={() => navegar(`/comercios/${p.comercioId}`)} />)}</div>
      </section>
      <p className="g-suave">Las facturas se hacen con el programa de facturación o la gestoría (normativa Verifactu); aquí solo se apunta su número.</p>
    </section>
  )
}

