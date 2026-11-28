import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import type { CampanaPublica, ComercioPublico, OfertaPublica } from '../../compartido/tipos.ts'
import { CATEGORIAS_COMERCIO } from '../../compartido/tipos.ts'
import { Galeria } from '../componentes/Galeria'
import { Icono } from '../componentes/Iconos'
import { cargarCampana, cargarComercio, cargarComercios, cargarPatrocinados } from '../datos/repositorio'
import { abrirEnlace, abrirIndicaciones, compartir } from '../nativo'

const categoria = (id: string) => CATEGORIAS_COMERCIO.find((c) => c.id === id)
const fechaCorta = (d: string) => new Date(`${d}T12:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })
const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const telefonoWhatsapp = (t: string) => (t.replace(/\D/g, '').length === 9 ? `34${t.replace(/\D/g, '')}` : t.replace(/\D/g, ''))

function useCargar<T>(cargar: () => Promise<T>, claves: unknown[]) {
  const [s, setS] = useState<{ datos: T | null; error: string; cargando: boolean }>({ datos: null, error: '', cargando: true })
  useEffect(() => {
    let vivo = true
    cargar()
      .then((datos) => vivo && setS({ datos, error: '', cargando: false }))
      .catch((e) => vivo && setS({ datos: null, error: (e as Error).message, cargando: false }))
    return () => {
      vivo = false
    }
  }, claves)
  return s
}

/** Tarjeta «Patrocinado»: siempre marcada como tal, discreta y sin parpadeos. */
export function TarjetaPatrocinada({ c }: { c: ComercioPublico }) {
  const oferta = c.ofertas[0]
  return (
    <Link to={`/comercio/${c.slug}`} className="patrocinado">
      {c.logo || c.fotos?.[0] ? <img src={c.logo ?? c.fotos![0]} alt="" loading="lazy" /> : <span className="patrocinado-emoji">{categoria(c.categoria)?.emoji}</span>}
      <span>
        <small className="patrocinado-etiqueta">Patrocinado</small>
        <b>{c.nombre}</b>
        <small>{oferta ? oferta.titulo : c.descripcion?.slice(0, 80) ?? categoria(c.categoria)?.nombre}</small>
      </span>
      <Icono n="adelante" tam={16} />
    </Link>
  )
}

/** Uno de los patrocinados, distinto cada día (rota entre todos). */
export function usePatrocinado(posicion = 0) {
  const [lista, setLista] = useState<ComercioPublico[]>([])
  useEffect(() => {
    cargarPatrocinados().then(setLista).catch(() => undefined)
  }, [])
  if (!lista.length) return null
  const dia = Math.floor(Date.now() / 86400_000)
  return lista[(dia + posicion) % lista.length]
}

export function TarjetaOferta({ o }: { o: OfertaPublica }) {
  return (
    <Link to={`/comercio/${o.comercio.slug}`} className="tarjeta-oferta">
      {o.imagen ? <img src={o.imagen} alt="" loading="lazy" /> : <span className="tarjeta-oferta-icono"><Icono n="etiqueta" tam={26} /></span>}
      <span>
        <small className="oferta-etiqueta">Oferta{o.campana ? ` · ${o.campana}` : ''}</small>
        <b>{o.titulo}</b>
        <small>{o.comercio.nombre} · hasta el {fechaCorta(o.hasta)}</small>
      </span>
    </Link>
  )
}

export function BannerCampana({ c }: { c: CampanaPublica }) {
  return (
    <Link to="/campana" className="banner-campana">
      <small>Campaña · hasta el {fechaCorta(c.hasta)}</small>
      <b>{c.nombre}</b>
      <span>{c.comercios.length === 1 ? '1 comercio' : `${c.comercios.length} comercios`}{c.ofertas.length ? ` · ${c.ofertas.length === 1 ? '1 oferta' : `${c.ofertas.length} ofertas`}` : ''}</span>
      <Icono n="adelante" tam={18} />
    </Link>
  )
}

function FilaComercio({ c }: { c: ComercioPublico }) {
  return (
    <Link to={`/comercio/${c.slug}`} className={c.nivel === 'destacado' ? 'fila-comercio destacado' : 'fila-comercio'}>
      {c.logo ? <img src={c.logo} alt="" loading="lazy" /> : <span className="fila-comercio-emoji">{categoria(c.categoria)?.emoji}</span>}
      <span>
        <b>{c.nombre}</b>
        <small>{categoria(c.categoria)?.nombre} · {c.municipio === 'Valverde del Camino' ? c.direccion : c.municipio}</small>
        {c.ofertas.length > 0 && <small className="fila-comercio-oferta"><Icono n="etiqueta" tam={13} /> {c.ofertas.length === 1 ? c.ofertas[0].titulo : `${c.ofertas.length} ofertas`}</small>}
      </span>
      {c.nivel === 'destacado' && <span className="sello-destacado">Destacado</span>}
    </Link>
  )
}

/** Pestaña «Comercios»: la guía del pueblo. */
export function Comercios() {
  const [params, setParams] = useSearchParams()
  const cat = params.get('c') ?? ''
  const [busca, setBusca] = useState('')
  const lista = useCargar(cargarComercios, [])
  const campana = useCargar(cargarCampana, [])
  const ofertas = useMemo(() => (lista.datos ?? []).flatMap((c) => c.ofertas), [lista.datos])
  const visibles = useMemo(() => {
    const t = sinTildes(busca.trim())
    return (lista.datos ?? [])
      .filter((c) => (!cat || c.categoria === cat) && (!t || sinTildes(`${c.nombre} ${c.descripcion ?? ''} ${categoria(c.categoria)?.nombre}`).includes(t)))
      // Los Destacado salen primero en su categoría; el resto, por orden alfabético.
      .sort((a, b) => Number(b.nivel === 'destacado') - Number(a.nivel === 'destacado') || a.nombre.localeCompare(b.nombre))
  }, [lista.datos, cat, busca])

  return (
    <div className="pantalla">
      <header>
        <p className="antetitulo">Compra en el pueblo</p>
        <h1>Comercios de <em>Valverde</em></h1>
      </header>
      {campana.datos && <BannerCampana c={campana.datos} />}
      <label className="buscador-app">
        <Icono n="buscar" tam={18} />
        <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar un comercio o lo que necesitas" aria-label="Buscar comercios" />
      </label>
      <div className="chips chips-desplazables">
        <button className={!cat ? 'chip activo' : 'chip'} onClick={() => setParams({}, { replace: true })}>Todos</button>
        {CATEGORIAS_COMERCIO.map((c) => (
          <button key={c.id} className={cat === c.id ? 'chip activo' : 'chip'} onClick={() => setParams({ c: c.id }, { replace: true })}>{c.emoji} {c.nombre}</button>
        ))}
      </div>
      {!!ofertas.length && !busca && !cat && (
        <>
          <div className="titulo-seccion"><h2>Ofertas</h2></div>
          <div className="carrusel">{ofertas.map((o) => <TarjetaOferta key={o.id} o={o} />)}</div>
        </>
      )}
      {lista.cargando && !lista.datos && <p className="suave">Cargando…</p>}
      {lista.error && <p className="suave">{lista.error}</p>}
      {lista.datos && !visibles.length && <p className="suave">{lista.datos.length ? 'Ningún comercio coincide.' : 'La guía de comercios estará aquí muy pronto.'}</p>}
      <div className="lista-comercios">{visibles.map((c) => <FilaComercio key={c.slug} c={c} />)}</div>
      <p className="nota-legal">¿Tienes un comercio en la zona? Tu ficha en la guía es gratis. Escríbenos o date de alta desde el panel de gestión.</p>
    </div>
  )
}

/** La ficha de un comercio. */
export function FichaComercio() {
  const { slug = '' } = useParams()
  const navegar = useNavigate()
  const { datos: c, error, cargando } = useCargar(() => cargarComercio(slug), [slug])
  if (cargando && !c) return <div className="pantalla"><p className="suave">Cargando…</p></div>
  if (!c) {
    return (
      <div className="pantalla vacio">
        <p>{error || 'Este comercio ya no está en la guía.'}</p>
        <Link to="/comercios" className="boton boton-suave">Ver la guía</Link>
      </div>
    )
  }
  const fotos = (c.fotos ?? []).map((url) => ({ url, pie: '' }))
  return (
    <div className="pantalla ficha-comercio">
      <div className="cabecera">
        <button className="boton-redondo" onClick={() => navegar(-1)} aria-label="Volver"><Icono n="atras" tam={20} /></button>
        <button className="boton-redondo" onClick={() => compartir(c.nombre, `${c.nombre}, en Valverde`, `/comercio/${c.slug}`)} aria-label="Compartir"><Icono n="compartir" tam={20} /></button>
      </div>
      <header className="ficha-comercio-cabeza">
        {c.logo ? <img src={c.logo} alt="" /> : <span className="fila-comercio-emoji grande">{categoria(c.categoria)?.emoji}</span>}
        <div>
          <p className="antetitulo">{categoria(c.categoria)?.nombre}{c.nivel === 'destacado' ? ' · Destacado' : ''}</p>
          <h1>{c.nombre}</h1>
        </div>
      </header>
      <div className="fila-botones">
        {c.telefono && <a className="boton boton-primario" href={`tel:${c.telefono}`}><Icono n="telefono" tam={18} /> Llamar</a>}
        {c.whatsapp && <button className="boton boton-suave" onClick={() => abrirEnlace(`https://wa.me/${telefonoWhatsapp(c.whatsapp!)}`)}><Icono n="mensaje" tam={18} /> WhatsApp</button>}
        <button className="boton boton-suave" onClick={() => abrirIndicaciones(c.lat, c.lng)}><Icono n="pin" tam={18} /> Cómo llegar</button>
      </div>
      {c.ofertas.map((o) => (
        <div key={o.id} className="oferta-ficha">
          <small className="oferta-etiqueta">Oferta{o.campana ? ` · ${o.campana}` : ''} · hasta el {fechaCorta(o.hasta)}</small>
          <b>{o.titulo}</b>
          {o.texto && <p>{o.texto}</p>}
          {o.imagen && <img src={o.imagen} alt="" loading="lazy" />}
        </div>
      ))}
      {c.descripcion && <p className="ficha-texto">{c.descripcion}</p>}
      <div className="dato"><span className="circulo-icono"><Icono n="pin" tam={20} /></span><div><b>{c.direccion}</b><small>{c.municipio}</small></div></div>
      {c.horario && <div className="dato"><span className="circulo-icono"><Icono n="reloj" tam={20} /></span><div><b>Horario</b><small className="horario">{c.horario}</small></div></div>}
      {!!fotos.length && <Galeria fotos={fotos} titulo="Fotos" />}
      {(c.web || c.instagram || c.facebook || c.emailPublico) && (
        <div className="redes">
          {c.web && <button className="boton boton-suave boton-peq" onClick={() => abrirEnlace(c.web!)}><Icono n="web" tam={16} /> Web</button>}
          {c.instagram && <button className="boton boton-suave boton-peq" onClick={() => abrirEnlace(c.instagram!)}>Instagram</button>}
          {c.facebook && <button className="boton boton-suave boton-peq" onClick={() => abrirEnlace(c.facebook!)}>Facebook</button>}
          {c.emailPublico && <a className="boton boton-suave boton-peq" href={`mailto:${c.emailPublico}`}>Correo</a>}
        </div>
      )}
    </div>
  )
}

/** La campaña en marcha: sus comercios y sus ofertas. */
export function Campana() {
  const navegar = useNavigate()
  const { datos: c, cargando } = useCargar(cargarCampana, [])
  if (cargando && !c) return <div className="pantalla"><p className="suave">Cargando…</p></div>
  if (!c) return <div className="pantalla vacio"><p>Ahora mismo no hay ninguna campaña en marcha.</p><Link to="/comercios" className="boton boton-suave">Ver la guía</Link></div>
  return (
    <div className="pantalla">
      <div className="cabecera"><button className="boton-redondo" onClick={() => navegar(-1)} aria-label="Volver"><Icono n="atras" tam={20} /></button></div>
      <header>
        <p className="antetitulo">Campaña · del {fechaCorta(c.desde)} al {fechaCorta(c.hasta)}</p>
        <h1>{c.nombre}</h1>
      </header>
      {c.descripcion && <p className="entradilla">{c.descripcion}</p>}
      {!!c.ofertas.length && <div className="lista-ofertas">{c.ofertas.map((o) => <TarjetaOferta key={o.id} o={o} />)}</div>}
      <div className="titulo-seccion"><h2>Comercios que participan</h2></div>
      <div className="lista-comercios">
        {c.comercios.map((x) => (
          <Link key={x.slug} to={`/comercio/${x.slug}`} className="fila-comercio">
            {x.logo ? <img src={x.logo} alt="" /> : <span className="fila-comercio-emoji">{categoria(x.categoria)?.emoji}</span>}
            <span><b>{x.nombre}</b><small>{categoria(x.categoria)?.nombre}</small></span>
          </Link>
        ))}
      </div>
    </div>
  )
}
