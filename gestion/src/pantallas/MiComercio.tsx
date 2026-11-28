import { useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { Campana, ComercioGestion, Oferta, Plan } from '../../../compartido/tipos.ts'
import { PLANES } from '../../../compartido/tipos.ts'
import { prepararFoto } from '../../../navegador/medios.ts'
import { api, subirImagen } from '../api.ts'
import { avisar } from '../componentes/Avisos.tsx'
import { FormComercio } from '../componentes/FormComercio.tsx'
import { Icono } from '../componentes/Iconos.tsx'
import { Vacio } from '../componentes/Listas.tsx'
import { Cargando, Fallo, useAccion, useCarga, useMunicipios } from '../componentes/piezas.tsx'
import { ChipPlan, FilaPlan } from './Comercios.tsx'

type Yo = ComercioGestion & { planes: Plan[]; visitas30: number }

const fechaCorta = (d: string) => new Date(`${d}T12:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })
const hoyIso = () => new Date().toISOString().slice(0, 10)

/** Portada del panel del comercio: estado, plan, visitas y qué puede hacer. */
export function InicioComercio() {
  const { datos: c, error } = useCarga<Yo>('/comercio/yo')
  if (!c) return <section className="g-pagina"><Fallo>{error}</Fallo>{!error && <Cargando />}</section>
  return (
    <section className="g-pagina">
      <header className="g-cabecera"><div><p className="g-antetitulo">Tu comercio</p><h1>{c.nombre}</h1></div></header>
      {c.estado === 'pendiente' && <p className="g-aviso">Estamos revisando los datos de tu comercio. Mientras, puedes ir completando la ficha.</p>}
      {c.estado === 'suspendido' && <p className="g-aviso">Tu ficha está fuera de la guía ahora mismo. Mira el motivo en «Avisos» o escríbenos.</p>}
      {c.cambios && <p className="g-aviso">Tienes cambios en tu ficha esperando revisión. En la guía sigue la versión anterior hasta que los revisemos.</p>}

      <div className="g-resumen-inscritos">
        <div><b>{c.visitas30}</b><span>visitas a tu ficha en 30 días</span></div>
        <div><b><ChipPlan tipo={c.planActual} /></b><span>{c.caduca ? `hasta el ${fechaCorta(c.caduca)}` : 'gratis, sin caducidad'}</span></div>
        <div><b>{c.capacidades.ofertas ? 'Sí' : 'No'}</b><span>puedes publicar ofertas</span></div>
      </div>

      <div className="g-lista">
        <Link to="/ficha" className="g-fila"><span className="g-icono-redondo"><Icono n="tienda" /></span><span className="g-fila-cuerpo"><b>Tu ficha en la guía</b><small>Horario, teléfono, ubicación{c.capacidades.escaparate ? ', fotos, redes…' : ''}</small></span><span className="g-fila-final"><Icono n="adelante" tam={18} /></span></Link>
        <Link to="/ofertas" className="g-fila"><span className="g-icono-redondo"><Icono n="etiqueta" /></span><span className="g-fila-cuerpo"><b>Ofertas</b><small>{c.capacidades.ofertas ? 'Crea una oferta: la revisamos y sale en la app.' : 'Disponibles con cualquier plan de pago.'}</small></span><span className="g-fila-final"><Icono n="adelante" tam={18} /></span></Link>
      </div>

      <section className="g-bloque">
        <h2 className="g-bloque-titulo"><Icono n="euro" /> Tu plan</h2>
        {c.planes.length ? <div className="g-lista">{c.planes.map((p) => <FilaPlan key={p.id} p={p} />)}</div> : <p className="g-suave">Tienes la ficha básica, que es gratis.</p>}
      </section>

      <section className="g-caja">
        <h2>¿Quieres más visibilidad?</h2>
        <ul className="g-planes-lista">
          {(['escaparate', 'destacado', 'campana', 'promocion'] as const).map((t) => (
            <li key={t}><b>{PLANES[t].nombre}</b> · {PLANES[t].resumen} <span className="g-suave">{PLANES[t].precio}</span></li>
          ))}
        </ul>
        <p className="g-suave">Escríbenos o llámanos y te lo activamos. Se paga por transferencia o Bizum, sin permanencia.</p>
      </section>
    </section>
  )
}

export function FichaMiComercio() {
  const navegar = useNavigate()
  const { datos: c, error } = useCarga<Yo>('/comercio/yo')
  const municipios = useMunicipios()
  if (!c || !municipios.datos) return <section className="g-pagina"><Fallo>{error}</Fallo>{!error && <Cargando />}</section>
  const base = c.cambios ?? c
  return (
    <section className="g-pagina">
      <header className="g-cabecera"><div><Link to="/" className="g-volver"><Icono n="atras" tam={16} /> Tu comercio</Link><h1>Tu ficha</h1></div></header>
      {c.estado === 'verificado' && <p className="g-suave g-subtitulo">Los cambios se verán en la guía cuando los revisemos (normalmente en un día).</p>}
      <FormComercio key={c.cambios ? 'cambios' : 'actual'} inicial={base} inicialUrls={c.cambios ? undefined : { logo: c.logoUrl, fotos: c.fotosUrl }}
        municipios={municipios.datos} escaparate={c.capacidades.escaparate} textoBoton={c.estado === 'verificado' ? 'Enviar cambios' : 'Guardar'}
        alGuardar={async (ficha) => {
          const r = await api<{ revision: boolean }>('PUT', '/comercio/ficha', ficha)
          avisar(r.revision ? 'Cambios enviados. Te avisaremos cuando estén publicados.' : 'Ficha guardada.')
          navegar('/')
        }} />
    </section>
  )
}

const TEXTO_OFERTA = { pendiente: 'En revisión', publicada: 'Publicada', rechazada: 'No publicada', retirada: 'Retirada' }

export function OfertasMiComercio() {
  const { datos, error, recargar } = useCarga<Oferta[]>('/comercio/ofertas')
  const yo = useCarga<Yo>('/comercio/yo')
  const accion = useAccion()
  return (
    <section className="g-pagina">
      <header className="g-cabecera">
        <div><p className="g-antetitulo">Tu comercio</p><h1>Ofertas</h1></div>
        {yo.datos?.capacidades.ofertas && <div className="g-cabecera-acciones"><Link to="/ofertas/nueva" className="g-boton g-boton-primario"><Icono n="mas" /> Nueva oferta</Link></div>}
      </header>
      {yo.datos && !yo.datos.capacidades.ofertas && <p className="g-aviso">Las ofertas están incluidas en los planes Escaparate, Destacado, Campaña y Promoción. Pregúntanos y te lo activamos.</p>}
      <Fallo>{error || accion.error}</Fallo>
      {datos && !datos.length && yo.datos?.capacidades.ofertas && <Vacio icono="etiqueta" titulo="Aún no has publicado ofertas">Una oferta clara, con fecha de fin: «2×1 en pasteles los viernes de diciembre».</Vacio>}
      <div className="g-lista">
        {datos?.map((o) => (
          <div key={o.id} className="g-fila">
            {o.imagenUrl ? <img className="g-fila-miniatura" src={o.imagenUrl} alt="" /> : <span className="g-icono-redondo"><Icono n="etiqueta" /></span>}
            <span className="g-fila-cuerpo">
              <b>{o.titulo}</b>
              <small>Del {fechaCorta(o.desde)} al {fechaCorta(o.hasta)}</small>
              {o.motivo && <small className="g-motivo-texto">Motivo: {o.motivo}</small>}
            </span>
            <span className="g-fila-final">
              <span className={`g-estado g-estado-${o.estado === 'publicada' ? 'publicado' : o.estado === 'pendiente' ? 'pendiente' : 'retirado'}`}>{TEXTO_OFERTA[o.estado]}</span>
              {(o.estado === 'pendiente' || o.estado === 'rechazada') && <Link to={`/ofertas/${o.id}`} className="g-boton-icono" aria-label="Corregir"><Icono n="lapiz" tam={16} /></Link>}
              {o.estado !== 'retirada' && (
                <button className="g-boton-icono" aria-label={o.estado === 'publicada' ? 'Retirar' : 'Borrar'} onClick={() => {
                  if (confirm(o.estado === 'publicada' ? '¿Retirar esta oferta de la app?' : '¿Borrar esta oferta?')) {
                    void accion.hacer(async () => {
                      await api('DELETE', `/comercio/ofertas/${o.id}`)
                      await recargar()
                    })
                  }
                }}><Icono n="cerrar" tam={16} /></button>
              )}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

export function EditarOferta() {
  const { id } = useParams()
  const navegar = useNavigate()
  const nueva = id === 'nueva'
  const ofertas = useCarga<Oferta[]>('/comercio/ofertas')
  const campanas = useCarga<Campana[]>('/comercio/campanas')
  const actual = ofertas.datos?.find((o) => String(o.id) === id)
  const [f, setF] = useState<{ titulo: string; texto: string; imagen: string | null; desde: string; hasta: string; campanaId: number | null } | null>(null)
  const [imagenUrl, setImagenUrl] = useState<string | null>(null)
  const accion = useAccion()
  const archivo = useRef<HTMLInputElement>(null)
  if (!nueva && !actual) return <section className="g-pagina"><Fallo>{ofertas.error}</Fallo><Cargando /></section>
  const v = f ?? (actual
    ? { titulo: actual.titulo, texto: actual.texto, imagen: actual.imagen, desde: actual.desde, hasta: actual.hasta, campanaId: actual.campanaId }
    : { titulo: '', texto: '', imagen: null, desde: hoyIso(), hasta: hoyIso(), campanaId: null })
  const url = imagenUrl ?? (v.imagen === actual?.imagen ? actual?.imagenUrl ?? null : null)
  const poner = (c: Partial<typeof v>) => setF({ ...v, ...c })

  return (
    <section className="g-pagina">
      <header className="g-cabecera"><div><Link to="/ofertas" className="g-volver"><Icono n="atras" tam={16} /> Ofertas</Link><h1>{nueva ? 'Nueva oferta' : 'Corregir oferta'}</h1></div></header>
      <form className="g-editor-campos" onSubmit={(e) => {
        e.preventDefault()
        void accion.hacer(async () => {
          if (nueva) await api('POST', '/comercio/ofertas', v)
          else await api('PUT', `/comercio/ofertas/${id}`, v)
          avisar('Oferta enviada. La revisamos y te avisamos.')
          navegar('/ofertas')
        })
      }}>
        <section className="g-seccion">
          <div className="g-rejilla">
            <label className="g-campo g-campo-ancho"><span className="g-etiqueta">Título</span><input value={v.titulo} required minLength={3} maxLength={90} placeholder="20 % en toda la ropa de invierno" onChange={(e) => poner({ titulo: e.target.value })} /></label>
            <label className="g-campo g-campo-ancho"><span className="g-etiqueta">Detalles</span><textarea rows={3} maxLength={600} value={v.texto} placeholder="Condiciones, horario, si hay que decir algo en caja…" onChange={(e) => poner({ texto: e.target.value })} /></label>
            <label className="g-campo"><span className="g-etiqueta">Desde</span><input type="date" value={v.desde} min={hoyIso()} onChange={(e) => poner({ desde: e.target.value })} /></label>
            <label className="g-campo"><span className="g-etiqueta">Hasta</span><input type="date" value={v.hasta} min={v.desde} onChange={(e) => poner({ hasta: e.target.value })} /></label>
            {!!campanas.datos?.length && (
              <label className="g-campo g-campo-ancho"><span className="g-etiqueta">Campaña (opcional)</span>
                <select value={v.campanaId ?? ''} onChange={(e) => poner({ campanaId: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">Ninguna</option>
                  {campanas.datos.map((ca) => <option key={ca.id} value={ca.id}>{ca.nombre}</option>)}
                </select>
              </label>
            )}
            <div className="g-campo g-campo-ancho">
              <span className="g-etiqueta">Imagen (opcional)</span>
              {url && <img className="g-oferta-imagen" src={url} alt="" />}
              <input ref={archivo} type="file" accept="image/jpeg,image/png" hidden onChange={(e) => {
                const archivoElegido = e.target.files?.[0]
                e.target.value = ''
                if (archivoElegido) void accion.hacer(async () => {
                  const r = await subirImagen(await prepararFoto(archivoElegido))
                  poner({ imagen: r.clave })
                  setImagenUrl(r.url)
                })
              }} />
              <div className="g-fila-botones g-fila-izquierda">
                <button type="button" className="g-boton g-boton-suave" onClick={() => archivo.current?.click()}><Icono n="imagen" /> {v.imagen ? 'Cambiar imagen' : 'Subir imagen'}</button>
                {v.imagen && <button type="button" className="g-enlace" onClick={() => { poner({ imagen: null }); setImagenUrl(null) }}>Quitar</button>}
              </div>
            </div>
          </div>
        </section>
        <p className="g-suave">Las ofertas tienen que ser reales y con fecha de fin. No se admite publicidad engañosa, apuestas ni alcohol dirigido a menores.</p>
        <Fallo>{accion.error}</Fallo>
        <div className="g-barra-acciones"><div className="g-barra-botones"><button className="g-boton g-boton-primario" disabled={accion.ocupado}>Enviar a revisión</button></div></div>
      </form>
    </section>
  )
}
