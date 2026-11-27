import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import type { Historia, Lugar } from '../../compartido/tipos.ts'
import { Escena } from '../componentes/Escena'
import { Galeria } from '../componentes/Galeria'
import { Icono } from '../componentes/Iconos'
import { cargarHistorias, cargarLugar, cargarLugares } from '../datos/repositorio'
import { descubrirLugar, useLugaresDescubiertos } from '../estado/almacen'
import { abrirIndicaciones, compartir } from '../nativo'

/** Carga algo del servidor con estado de carga y error. */
function useDatos<T>(cargar: () => Promise<T>, claves: unknown[]) {
  const [estado, setEstado] = useState<{ datos: T | null; error: string; cargando: boolean }>({ datos: null, error: '', cargando: true })
  useEffect(() => {
    let vivo = true
    setEstado((e) => ({ ...e, cargando: true }))
    cargar()
      .then((datos) => vivo && setEstado({ datos, error: '', cargando: false }))
      .catch((e) => vivo && setEstado({ datos: null, error: (e as Error).message, cargando: false }))
    return () => {
      vivo = false
    }
  }, claves)
  return estado
}

const resumen = (t: string, n = 110) => (t.length > n ? `${t.slice(0, n).replace(/\s+\S*$/, '')}…` : t)

/** Tarjeta de historia para las listas. */
export function TarjetaHistoria({ h }: { h: Historia }) {
  const foto = h.archivos.find((a) => a.tipo === 'foto')
  const audio = h.archivos.some((a) => a.tipo === 'audio')
  return (
    <Link to={`/historia/${h.slug}`} className="tarjeta-historia">
      {foto ? <img src={foto.url} alt="" loading="lazy" /> : <span className="tarjeta-historia-icono"><Icono n="historias" tam={26} /></span>}
      <span>
        <b>{h.titulo}</b>
        <small>{h.autor}{h.epoca ? ` · ${h.epoca}` : ''}</small>
        <small className="tarjeta-historia-texto">{resumen(h.texto)}</small>
        {audio && <small className="tarjeta-historia-audio"><Icono n="historias" tam={14} /> Con audio</small>}
      </span>
    </Link>
  )
}

export function BotonContar({ lugar }: { lugar?: string }) {
  return (
    <Link to={`/contar${lugar ? `?lugar=${lugar}` : ''}`} className="contar-historia">
      <span className="circulo-icono solido"><Icono n="historias" tam={22} /></span>
      <span><b>¿Sabes una historia del pueblo?</b><small>Cuéntala por escrito o grábala con el móvil.</small></span>
      <Icono n="adelante" tam={18} />
    </Link>
  )
}

/** Pestaña «Historias»: lugares con placa e historias recientes. */
export function Historias() {
  const historias = useDatos(cargarHistorias, [])
  const lugares = useDatos(cargarLugares, [])
  const conHistorias = (lugares.datos ?? []).filter((l) => l.historias > 0)
  const descubiertos = useLugaresDescubiertos()
  const total = lugares.datos?.length ?? 0
  const hechos = (lugares.datos ?? []).filter((l) => descubiertos.includes(l.slug)).length
  return (
    <div className="pantalla">
      <header>
        <p className="antetitulo">La memoria del pueblo</p>
        <h1>Historias de <em>Valverde</em></h1>
      </header>
      <p className="entradilla">Lo que cuentan los vecinos sobre calles, oficios y fiestas. Busca las placas con código QR por el pueblo.</p>
      <BotonContar />

      {total > 0 && (
        <div className="pasaporte">
          <div><b>Placas descubiertas: {hechos} de {total}</b><small>{hechos === total ? '¡Las has encontrado todas!' : 'Busca las placas con código QR por el pueblo y escanéalas con la cámara.'}</small></div>
          <div className="pasaporte-barra" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={hechos}><span style={{ width: `${(hechos / total) * 100}%` }} /></div>
        </div>
      )}

      {!!conHistorias.length && (
        <>
          <div className="titulo-seccion"><h2>Lugares con historia</h2></div>
          <div className="carrusel">
            {conHistorias.map((l) => <TarjetaLugar key={l.slug} l={l} />)}
          </div>
        </>
      )}

      <div className="titulo-seccion"><h2>Últimas historias</h2></div>
      {historias.cargando && !historias.datos && <p className="suave">Cargando…</p>}
      {historias.error && <p className="suave">{historias.error}</p>}
      {historias.datos && !historias.datos.length && <p className="suave">Aún no hay historias publicadas. ¡Sé quien cuente la primera!</p>}
      <div className="lista-historias">{historias.datos?.map((h) => <TarjetaHistoria key={h.slug} h={h} />)}</div>
    </div>
  )
}

function TarjetaLugar({ l }: { l: Lugar }) {
  return (
    <Link to={`/lugar/${l.slug}`} className="tarjeta-lugar">
      <Escena tipo="calle" />
      <span><b>{l.nombre}</b><small>{l.historias === 1 ? '1 historia' : `${l.historias} historias`}</small></span>
    </Link>
  )
}

/** Una historia: texto, audio y fotos. */
export function FichaHistoria() {
  const { slug = '' } = useParams()
  const navegar = useNavigate()
  const { datos, error, cargando } = useDatos(cargarHistorias, [])
  const h = datos?.find((x) => x.slug === slug)
  if (cargando && !datos) return <div className="pantalla"><p className="suave">Cargando…</p></div>
  if (!h) {
    return (
      <div className="pantalla vacio">
        <p>{error || 'Esta historia ya no está disponible.'}</p>
        <Link to="/historias" className="boton boton-suave">Ver las historias</Link>
      </div>
    )
  }
  const fotos = h.archivos.filter((a) => a.tipo === 'foto')
  const audio = h.archivos.find((a) => a.tipo === 'audio')
  return (
    <div className="pantalla historia">
      <div className="cabecera">
        <button className="boton-redondo" onClick={() => navegar(-1)} aria-label="Volver"><Icono n="atras" tam={20} /></button>
        <button className="boton-redondo" onClick={() => compartir(h.titulo, `Una historia de Valverde: ${h.titulo}`, `/historia/${h.slug}`)} aria-label="Compartir historia">
          <Icono n="compartir" tam={20} />
        </button>
      </div>
      <header>
        <p className="antetitulo">{h.epoca || 'Historia de Valverde'}</p>
        <h1>{h.titulo}</h1>
        <p className="historia-firma">Contada por <b>{h.autor}</b></p>
      </header>
      {audio && (
        <div className="historia-audio">
          <span className="circulo-icono solido"><Icono n="historias" tam={20} /></span>
          <div><b>Escúchala</b><audio controls preload="metadata" src={audio.url} /></div>
        </div>
      )}
      {h.texto && <p className="historia-texto">{h.texto}</p>}
      {!!fotos.length && <Galeria fotos={fotos} titulo="Fotos" />}
      {(h.lugar || h.lugarTexto) && (
        h.lugar
          ? <Link to={`/lugar/${h.lugar.slug}`} className="relacionado"><span className="circulo-icono solido"><Icono n="pin" tam={20} /></span><span><small>Dónde pasó</small><b>{h.lugar.nombre}</b></span></Link>
          : <p className="suave"><Icono n="pin" tam={16} /> {h.lugarTexto}</p>
      )}
      <BotonContar lugar={h.lugar?.slug} />
    </div>
  )
}

/** Página a la que lleva el QR de una placa. */
export function LugarHistorias() {
  const { slug = '' } = useParams()
  const [params] = useSearchParams()
  const qr = params.get('qr') === '1'
  const { datos: l, error, cargando } = useDatos(() => cargarLugar(slug, qr), [slug])
  useEffect(() => {
    if (qr && l) descubrirLugar(l.slug)
  }, [qr, l])
  if (cargando && !l) return <div className="pantalla"><p className="suave">Cargando…</p></div>
  if (!l) {
    return (
      <div className="pantalla vacio">
        <p>{error || 'Este lugar no está disponible.'}</p>
        <Link to="/historias" className="boton boton-suave">Ver todas las historias</Link>
      </div>
    )
  }
  return (
    <div className="pantalla">
      <header>
        <p className="antetitulo">{qr ? 'Has encontrado una placa' : 'Lugar con historia'}</p>
        <h1>{l.nombre}</h1>
        {l.direccion && <p className="suave"><Icono n="pin" tam={14} /> {l.direccion}</p>}
      </header>
      {l.descripcion && <p className="entradilla">{l.descripcion}</p>}
      <button className="boton boton-suave" onClick={() => abrirIndicaciones(l.lat, l.lng)}><Icono n="pin" tam={18} /> Cómo llegar</button>
      <div className="titulo-seccion"><h2>{l.historias.length === 1 ? '1 historia' : `${l.historias.length} historias`} de este lugar</h2></div>
      {!l.historias.length && <p className="suave">Todavía nadie ha contado nada de este sitio. ¿Sabes algo?</p>}
      <div className="lista-historias">{l.historias.map((h) => <TarjetaHistoria key={h.slug} h={h} />)}</div>
      <BotonContar lugar={l.slug} />
    </div>
  )
}
