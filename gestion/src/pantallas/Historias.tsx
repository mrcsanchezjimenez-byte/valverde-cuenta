import { useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, NavLink, useNavigate, useParams } from 'react-router-dom'
import type { Consentimiento, EstadoHistoria, HistoriaGestion, LugarGestion } from '../../../compartido/tipos.ts'
import { CONSENTIMIENTOS, EPOCAS, LIMITES_ARCHIVOS } from '../../../compartido/tipos.ts'
import { extensionAudio } from '../../../navegador/grabador.ts'
import { prepararFoto } from '../../../navegador/medios.ts'
import { api, enviarFormulario } from '../api.ts'
import { avisar } from '../componentes/Avisos.tsx'
import { GrabadorAudio } from '../componentes/Grabador.tsx'
import { Icono } from '../componentes/Iconos.tsx'
import { Buscador, Filtros, Vacio } from '../componentes/Listas.tsx'
import { Cargando, Fallo, fechaIso, PedirMotivo, Qr, useAccion, useCarga } from '../componentes/piezas.tsx'
import { SelectorMapa } from '../componentes/SelectorMapa.tsx'

const TEXTO_ESTADO: Record<EstadoHistoria, string> = { pendiente: 'Pendiente de revisión', publicada: 'Publicada', rechazada: 'No publicada', retirada: 'Retirada' }
const CLASE_ESTADO: Record<EstadoHistoria, string> = { pendiente: 'pendiente', publicada: 'publicado', rechazada: 'rechazado', retirada: 'retirado' }
export const EstadoHistoriaChip = ({ e }: { e: EstadoHistoria }) => <span className={`g-estado g-estado-${CLASE_ESTADO[e]}`}>{TEXTO_ESTADO[e]}</span>

/** Pestañas de la sección: historias y lugares con placa. */
function Pestanas() {
  return (
    <nav className="g-pestanas">
      <NavLink to="/historias" end><Icono n="libro" /> Historias</NavLink>
      <NavLink to="/lugares"><Icono n="qr" /> Lugares y placas</NavLink>
    </nav>
  )
}

function Cabecera({ titulo, volver, children }: { titulo: string; volver?: { a: string; texto: string }; children?: ReactNode }) {
  return (
    <header className="g-cabecera">
      <div>
        {volver ? <Link to={volver.a} className="g-volver"><Icono n="atras" tam={16} /> {volver.texto}</Link> : <p className="g-antetitulo">La memoria del pueblo</p>}
        <h1>{titulo}</h1>
      </div>
      {children && <div className="g-cabecera-acciones">{children}</div>}
    </header>
  )
}

/** Una fila de historia para las listas. */
export function FilaHistoria({ h }: { h: HistoriaGestion }) {
  const fotos = h.archivos.filter((a) => a.tipo === 'foto')
  const audio = h.archivos.some((a) => a.tipo === 'audio')
  return (
    <Link to={`/historias/${h.id}`} className="g-fila">
      {fotos[0] ? <img className="g-fila-miniatura" src={fotos[0].url} alt="" /> : <span className="g-taco g-taco-libro"><Icono n={audio ? 'microfono' : 'libro'} tam={24} /></span>}
      <span className="g-fila-cuerpo">
        <b>{h.titulo}</b>
        <small>
          {h.firma === 'nombre' ? h.autor : 'Firma como vecino/a'}
          {h.lugarNombre ? ` · ${h.lugarNombre}` : h.lugarTexto ? ` · ${h.lugarTexto}` : ''}
          {h.epoca ? ` · ${h.epoca}` : ''}
        </small>
        <small className="g-adjuntos">
          {h.origen === 'entrevista' && <span>Entrevista</span>}
          {fotos.length > 0 && <span><Icono n="imagen" tam={14} /> {fotos.length}</span>}
          {audio && <span><Icono n="microfono" tam={14} /> audio</span>}
        </small>
      </span>
      <span className="g-fila-final"><EstadoHistoriaChip e={h.estado} /><Icono n="adelante" tam={18} /></span>
    </Link>
  )
}

// ——— Lista de historias ———

type Filtro = 'todas' | EstadoHistoria

export function ListaHistorias() {
  const { datos, error, cargando } = useCarga<HistoriaGestion[]>('/direccion/historias')
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [busca, setBusca] = useState('')
  const texto = busca.trim().toLowerCase()
  const coinciden = (datos ?? []).filter((h) => !texto || `${h.titulo} ${h.texto} ${h.autor} ${h.lugarNombre ?? ''} ${h.lugarTexto}`.toLowerCase().includes(texto))
  const n = (e: EstadoHistoria) => coinciden.filter((h) => h.estado === e).length
  const visibles = coinciden.filter((h) => filtro === 'todas' || h.estado === filtro)
  return (
    <section className="g-pagina">
      <Cabecera titulo="Historias">
        <Link to="/historias/nueva" className="g-boton g-boton-primario"><Icono n="microfono" /> Nueva entrevista</Link>
      </Cabecera>
      <Pestanas />
      <div className="g-herramientas">
        <Buscador valor={busca} alCambiar={setBusca} texto="Buscar en títulos, textos, nombres o lugares" />
        <Filtros<Filtro> valor={filtro} alCambiar={setFiltro} opciones={[
          { id: 'todas', texto: 'Todas', n: coinciden.length }, { id: 'pendiente', texto: 'Pendientes', n: n('pendiente') },
          { id: 'publicada', texto: 'Publicadas', n: n('publicada') }, { id: 'rechazada', texto: 'No publicadas', n: n('rechazada') },
          { id: 'retirada', texto: 'Retiradas', n: n('retirada') },
        ]} />
      </div>
      <Fallo>{error}</Fallo>
      {cargando && !datos && <Cargando />}
      {datos && !visibles.length && (
        <Vacio icono="libro" titulo={datos.length ? 'Ninguna coincide' : 'Aún no hay historias'}>
          Las historias llegan desde la app («Cuéntanos una historia») o las metéis vosotras tras una entrevista.
        </Vacio>
      )}
      <div className="g-lista">{visibles.map((h) => <FilaHistoria key={h.id} h={h} />)}</div>
    </section>
  )
}

// ——— Revisar una historia ———

export function RevisarHistoria() {
  const { id } = useParams()
  const navegar = useNavigate()
  const { datos: h, error, recargar } = useCarga<HistoriaGestion>(`/direccion/historias/${id}`)
  const lugares = useCarga<LugarGestion[]>('/direccion/lugares')
  const [edicion, setEdicion] = useState<HistoriaGestion | null>(null)
  const [pidiendo, setPidiendo] = useState<'rechazar' | 'retirar' | null>(null)
  const accion = useAccion()
  if (!h) return <section className="g-pagina"><Fallo>{error}</Fallo>{!error && <Cargando />}</section>
  const e = edicion ?? h
  const cambiar = (c: Partial<HistoriaGestion>) => setEdicion({ ...e, ...c })
  const cambiarArchivo = (i: number, c: Partial<HistoriaGestion['archivos'][number]>) =>
    cambiar({ archivos: e.archivos.map((a, n) => (n === i ? { ...a, ...c } : a)) })

  const guardar = () => accion.hacer(async () => {
    await api('PUT', `/direccion/historias/${h.id}`, {
      titulo: e.titulo, texto: e.texto, epoca: e.epoca, lugarId: e.lugarId, lugarTexto: e.lugarTexto, firma: e.firma, autor: e.autor, nota: e.nota,
      archivos: e.archivos.map((a, i) => ({ id: a.id, publicar: a.publicar, pie: a.pie, orden: i })),
    })
    setEdicion(null)
    avisar('Cambios guardados.')
    await recargar()
  })
  const estado = (ruta: string, hecho: string, volver = false) => accion.hacer(async () => {
    if (edicion) await guardar()
    const r = await api<{ avisado?: string }>('POST', `/direccion/historias/${h.id}/${ruta}`)
    avisar(r.avisado ? `${hecho} Hemos avisado a ${r.avisado}.` : hecho)
    if (volver) navegar('/pendientes')
    else await recargar()
  })

  return (
    <section className="g-pagina">
      <Cabecera titulo={h.titulo} volver={{ a: '/historias', texto: 'Historias' }}><EstadoHistoriaChip e={h.estado} /></Cabecera>
      <p className="g-suave g-subtitulo">
        {h.origen === 'entrevista' ? 'Entrevista metida por dirección' : 'Enviada desde la app'} · {fechaIso(h.creado)}
        {h.motivo ? ` · Motivo: ${h.motivo}` : ''}
      </p>
      <Fallo>{accion.error}</Fallo>

      <div className="g-dos-columnas">
        <div className="g-columna">
          <section className="g-seccion">
            <div className="g-rejilla">
              <label className="g-campo g-campo-ancho"><span className="g-etiqueta">Título</span>
                <input value={e.titulo} maxLength={120} onChange={(x) => cambiar({ titulo: x.target.value })} />
              </label>
              <label className="g-campo g-campo-ancho"><span className="g-etiqueta">Texto <small className="g-cuenta">{e.texto.length}/8000</small></span>
                <textarea rows={12} value={e.texto} maxLength={8000} onChange={(x) => cambiar({ texto: x.target.value })} />
              </label>
              <label className="g-campo"><span className="g-etiqueta">Época</span>
                <select value={e.epoca} onChange={(x) => cambiar({ epoca: x.target.value })}>
                  <option value="">Sin indicar</option>
                  {EPOCAS.map((ep) => <option key={ep}>{ep}</option>)}
                </select>
              </label>
              <label className="g-campo"><span className="g-etiqueta">Lugar con placa</span>
                <select value={e.lugarId ?? ''} onChange={(x) => cambiar({ lugarId: x.target.value ? Number(x.target.value) : null })}>
                  <option value="">Ninguno</option>
                  {lugares.datos?.filter((l) => l.activo).map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
                </select>
              </label>
              <label className="g-campo g-campo-ancho"><span className="g-etiqueta">Dónde pasó (según quien la cuenta)</span>
                <input value={e.lugarTexto} maxLength={120} onChange={(x) => cambiar({ lugarTexto: x.target.value })} />
              </label>
              <div className="g-campo">
                <span className="g-etiqueta">Firma</span>
                <div className="g-segmento">
                  <button type="button" className={e.firma === 'nombre' ? 'activo' : ''} onClick={() => cambiar({ firma: 'nombre' })}>Con nombre</button>
                  <button type="button" className={e.firma === 'anonimo' ? 'activo' : ''} onClick={() => cambiar({ firma: 'anonimo' })}>Vecino/a</button>
                </div>
              </div>
              {e.firma === 'nombre' && (
                <label className="g-campo"><span className="g-etiqueta">Nombre con el que firma</span>
                  <input value={e.autor} maxLength={80} onChange={(x) => cambiar({ autor: x.target.value })} />
                </label>
              )}
            </div>
          </section>

          {!!e.archivos.length && (
            <section className="g-seccion">
              <header className="g-seccion-cabeza"><span className="g-paso"><Icono n="imagen" tam={16} /></span><div><h2>Fotos y audio</h2><p>Elige qué se publica. Lo que no marques solo lo veis vosotras.</p></div></header>
              <div className="g-archivos">
                {e.archivos.map((a, i) => (
                  <div key={a.id} className={a.publicar ? 'g-archivo' : 'g-archivo apagado'}>
                    {a.tipo === 'foto'
                      ? <a href={a.url} target="_blank" rel="noopener noreferrer"><img src={a.url} alt="" /></a>
                      : <audio controls preload="metadata" src={a.url} />}
                    <label className="g-interruptor">
                      <input type="checkbox" checked={a.publicar} onChange={(x) => cambiarArchivo(i, { publicar: x.target.checked })} />
                      <span className="g-interruptor-pista" aria-hidden="true" />
                      <span>{a.publicar ? 'Se publica' : 'No se publica'}</span>
                    </label>
                    {a.tipo === 'foto' && (
                      <input className="g-pie-foto" value={a.pie} maxLength={140} placeholder="Pie de foto (opcional)" onChange={(x) => cambiarArchivo(i, { pie: x.target.value })} />
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="g-columna g-columna-lateral">
          <section className="g-caja">
            <h2>Quién la cuenta</h2>
            <p className="g-suave">Solo lo ve dirección. Nunca se publica.</p>
            <dl className="g-mini-ficha">
              <dt>Nombre</dt><dd>{h.contactoNombre || '—'}</dd>
              <dt>Correo</dt><dd>{h.contactoEmail ? <a href={`mailto:${h.contactoEmail}`}>{h.contactoEmail}</a> : '—'}</dd>
              <dt>Teléfono</dt><dd>{h.contactoTelefono ? <a href={`tel:${h.contactoTelefono}`}>{h.contactoTelefono}</a> : '—'}</dd>
            </dl>
          </section>
          <section className="g-caja">
            <h2>Permisos</h2>
            <ul className="g-permisos">
              {(Object.keys(CONSENTIMIENTOS) as Consentimiento[]).map((k) => (
                <li key={k} className={h.consentimiento.aceptados.includes(k) ? 'si' : 'no'}>
                  <Icono n={h.consentimiento.aceptados.includes(k) ? 'check' : 'cerrar'} tam={16} />
                  <span>{CONSENTIMIENTOS[k]}</span>
                </li>
              ))}
            </ul>
            <p className="g-suave">Aceptados el {fechaIso(h.consentimiento.fecha)} (texto del {h.consentimiento.version}).</p>
          </section>
          <label className="g-caja g-campo">
            <span className="g-etiqueta">Nota interna</span>
            <textarea rows={3} value={e.nota} maxLength={2000} onChange={(x) => cambiar({ nota: x.target.value })} placeholder="Por ejemplo: llamar para pedir más fotos." />
          </label>
        </aside>
      </div>

      {pidiendo && (
        <PedirMotivo titulo={pidiendo === 'rechazar' ? '¿Por qué no se publica? (solo lo veis vosotras)' : '¿Por qué se retira?'}
          boton={pidiendo === 'rechazar' ? 'No publicar' : 'Retirar'} alCancelar={() => setPidiendo(null)}
          alConfirmar={async (motivo) => {
            await api('POST', `/direccion/historias/${h.id}/${pidiendo}`, { motivo })
            avisar(pidiendo === 'rechazar' ? 'Historia no publicada.' : 'Historia retirada.')
            setPidiendo(null)
            await recargar()
          }} />
      )}

      {!pidiendo && (
        <div className="g-barra-acciones g-barra-revision">
          <div className="g-barra-botones">
            {['rechazada', 'retirada'].includes(h.estado) && (
              <button className="g-boton g-boton-peligro" disabled={accion.ocupado} onClick={() => {
                if (confirm('¿Borrar esta historia para siempre, con sus fotos y audio? No se puede deshacer.')) {
                  void accion.hacer(async () => {
                    await api('DELETE', `/direccion/historias/${h.id}`)
                    avisar('Historia borrada para siempre.', 'info')
                    navegar('/historias')
                  })
                }
              }}>Borrar para siempre</button>
            )}
            {edicion && <button className="g-boton g-boton-suave" disabled={accion.ocupado} onClick={() => void guardar()}>Guardar cambios</button>}
            {h.estado === 'pendiente' && <button className="g-boton g-boton-peligro" onClick={() => setPidiendo('rechazar')}>No publicar…</button>}
            {h.estado === 'publicada' && <button className="g-boton g-boton-peligro" onClick={() => setPidiendo('retirar')}>Retirar…</button>}
            {h.estado !== 'publicada' && (
              <button className="g-boton g-boton-primario" disabled={accion.ocupado} onClick={() => void estado('publicar', 'Historia publicada.', h.estado === 'pendiente')}>
                <Icono n="check" /> {edicion ? 'Guardar y publicar' : 'Publicar'}
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

// ——— Modo entrevista: dirección mete una historia ———

export function NuevaHistoria() {
  const navegar = useNavigate()
  const lugares = useCarga<LugarGestion[]>('/direccion/lugares')
  const [f, setF] = useState({
    titulo: '', texto: '', epoca: '', lugarId: '', lugarTexto: '', firma: 'nombre' as 'nombre' | 'anonimo', autor: '',
    contactoNombre: '', contactoEmail: '', contactoTelefono: '', permisos: false,
  })
  const [fotos, setFotos] = useState<{ blob: Blob; url: string }[]>([])
  const [audio, setAudio] = useState<Blob | null>(null)
  const archivo = useRef<HTMLInputElement>(null)
  const accion = useAccion()
  const poner = (c: Partial<typeof f>) => setF({ ...f, ...c })

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    if (!f.permisos) return accion.setError('Marca que la persona ha dado los permisos.')
    void accion.hacer(async () => {
      const d = new FormData()
      for (const [k, v] of Object.entries(f)) if (k !== 'permisos') d.append(k, String(v))
      for (const k of Object.keys(CONSENTIMIENTOS)) d.append(`acepta_${k}`, 'si')
      fotos.forEach((x, i) => d.append('fotos', x.blob, `foto-${i + 1}.jpg`))
      if (audio) d.append('audio', audio, `entrevista.${extensionAudio(audio.type)}`)
      const r = await enviarFormulario<{ id: number }>('/direccion/historias', d)
      avisar('Entrevista guardada. Revísala y publícala cuando quieras.')
      navegar(`/historias/${r.id}`, { replace: true })
    })
  }

  return (
    <section className="g-pagina">
      <Cabecera titulo="Nueva entrevista" volver={{ a: '/historias', texto: 'Historias' }} />
      <p className="g-suave g-subtitulo">Para las historias que recogéis en persona: en la biblioteca, en el centro de mayores o en casa de alguien. Se puede grabar desde aquí mismo con el móvil.</p>
      <form className="g-editor-campos" onSubmit={enviar}>
        <section className="g-seccion">
          <header className="g-seccion-cabeza"><span className="g-paso">1</span><div><h2>Grabación</h2><p>Deja el móvil cerca y que hable tranquilo. Mejor en un sitio sin ruido.</p></div></header>
          <GrabadorAudio alCambiar={setAudio} />
        </section>
        <section className="g-seccion">
          <header className="g-seccion-cabeza"><span className="g-paso">2</span><div><h2>La historia</h2><p>Un título y, si podéis, el texto (o un resumen) para quien no pueda escucharla.</p></div></header>
          <div className="g-rejilla">
            <label className="g-campo g-campo-ancho"><span className="g-etiqueta">Título</span><input value={f.titulo} onChange={(e) => poner({ titulo: e.target.value })} required minLength={3} maxLength={120} /></label>
            <label className="g-campo g-campo-ancho"><span className="g-etiqueta">Texto</span><textarea rows={8} value={f.texto} maxLength={8000} onChange={(e) => poner({ texto: e.target.value })} /></label>
            <label className="g-campo"><span className="g-etiqueta">Época</span>
              <select value={f.epoca} onChange={(e) => poner({ epoca: e.target.value })}><option value="">Sin indicar</option>{EPOCAS.map((ep) => <option key={ep}>{ep}</option>)}</select>
            </label>
            <label className="g-campo"><span className="g-etiqueta">Lugar con placa</span>
              <select value={f.lugarId} onChange={(e) => poner({ lugarId: e.target.value })}>
                <option value="">Ninguno</option>{lugares.datos?.filter((l) => l.activo).map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
              </select>
            </label>
            <label className="g-campo g-campo-ancho"><span className="g-etiqueta">Dónde pasó</span><input value={f.lugarTexto} maxLength={120} onChange={(e) => poner({ lugarTexto: e.target.value })} placeholder="Calle, barrio, cortijo…" /></label>
          </div>
        </section>
        <section className="g-seccion">
          <header className="g-seccion-cabeza"><span className="g-paso">3</span><div><h2>Fotos (opcional)</h2><p>Hasta {LIMITES_ARCHIVOS.fotos}. Si son de papel, una foto con el móvil sirve.</p></div></header>
          <div className="g-galeria">
            {fotos.map((x, i) => (
              <figure key={x.url}><img src={x.url} alt="" />
                <figcaption><button type="button" className="g-boton-icono" aria-label="Quitar foto" onClick={() => setFotos(fotos.filter((_, n) => n !== i))}><Icono n="cerrar" tam={16} /></button></figcaption>
              </figure>
            ))}
          </div>
          <input ref={archivo} type="file" accept="image/*" multiple hidden onChange={async (e) => {
            const lista = [...(e.target.files ?? [])].slice(0, LIMITES_ARCHIVOS.fotos - fotos.length)
            e.target.value = ''
            const nuevas = await Promise.all(lista.map(async (x) => {
              const blob = await prepararFoto(x)
              return { blob, url: URL.createObjectURL(blob) }
            }))
            setFotos((y) => [...y, ...nuevas])
          }} />
          {fotos.length < LIMITES_ARCHIVOS.fotos && <div className="g-fila-botones g-fila-izquierda"><button type="button" className="g-boton g-boton-suave" onClick={() => archivo.current?.click()}><Icono n="imagen" /> Añadir fotos</button></div>}
        </section>
        <section className="g-seccion">
          <header className="g-seccion-cabeza"><span className="g-paso">4</span><div><h2>Quién la cuenta</h2><p>Sus datos de contacto no se publican.</p></div></header>
          <div className="g-rejilla">
            <div className="g-campo g-campo-ancho">
              <span className="g-etiqueta">Cómo quiere firmar</span>
              <div className="g-segmento">
                <button type="button" className={f.firma === 'nombre' ? 'activo' : ''} onClick={() => poner({ firma: 'nombre' })}>Con su nombre</button>
                <button type="button" className={f.firma === 'anonimo' ? 'activo' : ''} onClick={() => poner({ firma: 'anonimo' })}>Como vecino/a</button>
              </div>
            </div>
            {f.firma === 'nombre' && <label className="g-campo g-campo-ancho"><span className="g-etiqueta">Nombre que se publica</span><input value={f.autor} maxLength={80} onChange={(e) => poner({ autor: e.target.value })} placeholder="Por ejemplo: Carmen, la del estanco" /></label>}
            <label className="g-campo"><span className="g-etiqueta">Nombre completo</span><input value={f.contactoNombre} maxLength={80} onChange={(e) => poner({ contactoNombre: e.target.value })} /></label>
            <label className="g-campo"><span className="g-etiqueta">Teléfono</span><input type="tel" value={f.contactoTelefono} onChange={(e) => poner({ contactoTelefono: e.target.value })} /></label>
          </div>
        </section>
        <label className="g-declaracion">
          <input type="checkbox" checked={f.permisos} onChange={(e) => poner({ permisos: e.target.checked })} />
          <span>
            La persona entrevistada ha leído o escuchado estos permisos y los acepta: {Object.values(CONSENTIMIENTOS).join(' ')}
          </span>
        </label>
        <Fallo>{accion.error}</Fallo>
        <div className="g-barra-acciones"><div className="g-barra-botones">
          <button className="g-boton g-boton-primario" disabled={accion.ocupado}>{accion.ocupado ? 'Guardando…' : 'Guardar entrevista'}</button>
        </div></div>
      </form>
    </section>
  )
}

// ——— Lugares con placa ———

export function Lugares() {
  const { datos, error, cargando } = useCarga<LugarGestion[]>('/direccion/lugares')
  return (
    <section className="g-pagina">
      <Cabecera titulo="Lugares y placas">
        <Link to="/lugares/nuevo" className="g-boton g-boton-primario"><Icono n="mas" /> Nuevo lugar</Link>
      </Cabecera>
      <Pestanas />
      <p className="g-suave">Cada lugar tiene su placa con un código QR que lleva a sus historias. El código no cambia nunca, aunque crezcan las historias.</p>
      <Fallo>{error}</Fallo>
      {cargando && !datos && <Cargando />}
      {datos && !datos.length && <Vacio icono="qr" titulo="Aún no hay lugares">Crea el primero: una ermita, una plaza, un comercio con historia…</Vacio>}
      <div className="g-lista">
        {datos?.map((l) => (
          <div key={l.id} className={l.activo ? 'g-fila' : 'g-fila apagado'}>
            <span className="g-icono-redondo"><Icono n="qr" /></span>
            <Link to={`/lugares/${l.id}`} className="g-fila-cuerpo g-enlace-fila">
              <b>{l.nombre}</b>
              <small>
                {l.historias === 1 ? '1 historia' : `${l.historias} historias`}
                {l.pendientes ? ` · ${l.pendientes} por revisar` : ''}
                {l.anfitrion ? ` · placa en: ${l.anfitrion}` : ''}
              </small>
              <small>{l.escaneos30} escaneos en 30 días · {l.escaneosTotal} en total</small>
            </Link>
            <span className="g-fila-final">
              <Link to={`/lugares/${l.id}/placa`} className="g-boton g-boton-suave g-boton-peq"><Icono n="imprimir" /> Placa</Link>
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

export function EditarLugar() {
  const { id } = useParams()
  const navegar = useNavigate()
  const nuevo = id === 'nuevo'
  const { datos } = useCarga<LugarGestion[]>('/direccion/lugares')
  const actual = datos?.find((l) => String(l.id) === id)
  const [f, setF] = useState<{ nombre: string; descripcion: string; direccion: string; lat: number; lng: number; anfitrion: string; activo: boolean } | null>(null)
  const accion = useAccion()
  if (!nuevo && !actual) return <section className="g-pagina"><Cargando /></section>
  const v = f ?? (actual
    ? { nombre: actual.nombre, descripcion: actual.descripcion, direccion: actual.direccion, lat: actual.lat, lng: actual.lng, anfitrion: actual.anfitrion, activo: actual.activo }
    : { nombre: '', descripcion: '', direccion: '', lat: 37.5745, lng: -6.753, anfitrion: '', activo: true })
  const poner = (c: Partial<typeof v>) => setF({ ...v, ...c })

  return (
    <section className="g-pagina">
      <Cabecera titulo={nuevo ? 'Nuevo lugar' : v.nombre} volver={{ a: '/lugares', texto: 'Lugares y placas' }}>
        {actual && <Link to={`/lugares/${actual.id}/placa`} className="g-boton g-boton-suave"><Icono n="imprimir" /> Ver la placa</Link>}
      </Cabecera>
      <form className="g-editor-campos" onSubmit={(e) => {
        e.preventDefault()
        void accion.hacer(async () => {
          if (nuevo) await api('POST', '/direccion/lugares', v)
          else await api('PUT', `/direccion/lugares/${id}`, v)
          avisar('Lugar guardado.')
          navegar('/lugares')
        })
      }}>
        <section className="g-seccion">
          <div className="g-rejilla">
            <label className="g-campo g-campo-ancho"><span className="g-etiqueta">Nombre</span><input value={v.nombre} required minLength={2} maxLength={80} onChange={(e) => poner({ nombre: e.target.value })} /></label>
            <label className="g-campo g-campo-ancho"><span className="g-etiqueta">Descripción breve</span>
              <textarea rows={3} value={v.descripcion} maxLength={1200} onChange={(e) => poner({ descripcion: e.target.value })} placeholder="Qué es este sitio, en dos o tres frases." />
            </label>
            <label className="g-campo"><span className="g-etiqueta">Dirección</span><input value={v.direccion} maxLength={120} onChange={(e) => poner({ direccion: e.target.value })} /></label>
            <label className="g-campo"><span className="g-etiqueta">Dónde está la placa</span><input value={v.anfitrion} maxLength={80} onChange={(e) => poner({ anfitrion: e.target.value })} placeholder="Ayuntamiento, Bar La Plaza…" /></label>
            <div className="g-campo-ancho"><SelectorMapa lat={v.lat} lng={v.lng} alElegir={(p) => poner(p)} /></div>
            <label className="g-interruptor g-campo-ancho">
              <input type="checkbox" checked={v.activo} onChange={(e) => poner({ activo: e.target.checked })} />
              <span className="g-interruptor-pista" aria-hidden="true" />
              <span>{v.activo ? 'Activo: se ve en la app' : 'Desactivado: el QR dirá que el lugar no está disponible'}</span>
            </label>
          </div>
        </section>
        {!nuevo && <p className="g-suave">El enlace del QR no cambia aunque cambies el nombre: las placas ya impresas siguen funcionando.</p>}
        <Fallo>{accion.error}</Fallo>
        <div className="g-barra-acciones"><div className="g-barra-botones"><button className="g-boton g-boton-primario" disabled={accion.ocupado}>Guardar</button></div></div>
      </form>
    </section>
  )
}

/** Placa para imprimir (A5): nombre, QR grande y una invitación a escanearlo. */
export function Placa() {
  const { id } = useParams()
  const { datos } = useCarga<LugarGestion[]>('/direccion/lugares')
  const l = datos?.find((x) => String(x.id) === id)
  const qr = useRef<HTMLDivElement>(null)
  const borrador = useMemo(() => Boolean(l && /localhost|github\.io/.test(l.urlQr)), [l])
  if (!l) return <section className="g-pagina"><Cargando /></section>

  const descargarQr = () => {
    const svg = qr.current?.querySelector('svg')
    if (!svg) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }))
    a.download = `qr-${l.slug}.svg`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <section className="g-pagina">
      <div className="g-no-imprimir">
        <Cabecera titulo={`Placa · ${l.nombre}`} volver={{ a: '/lugares', texto: 'Lugares y placas' }}>
          <button className="g-boton g-boton-suave" onClick={descargarQr}><Icono n="descargar" /> QR para imprenta</button>
          <button className="g-boton g-boton-primario" onClick={() => window.print()}><Icono n="imprimir" /> Imprimir</button>
        </Cabecera>
        {borrador && (
          <p className="g-aviso g-aviso-bloque">
            Ojo: este QR lleva a una dirección provisional (<span className="g-url">{l.urlQr}</span>). No imprimáis placas definitivas
            hasta tener el dominio propio: si la dirección cambia, las placas dejarán de funcionar.
          </p>
        )}
      </div>
      <article className="g-placa">
        <p className="g-placa-ante">Valverde del Camino</p>
        <h2 className="g-placa-nombre">{l.nombre}</h2>
        <div className="g-placa-qr" ref={qr}><Qr texto={l.urlQr} tam={260} /></div>
        <p className="g-placa-invita">Escanea con la cámara del móvil<br />y descubre las historias de este lugar</p>
        <p className="g-placa-marca">Valverde <em>Cuenta</em></p>
      </article>
    </section>
  )
}
