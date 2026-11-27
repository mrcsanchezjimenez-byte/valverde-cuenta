import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AvisoEjemplo } from '../componentes/Avisos'
import { HojaCompartir } from '../componentes/HojaCompartir'
import { Icono } from '../componentes/Iconos'
import { TarjetaGrande } from '../componentes/TarjetasEvento'
import { CATEGORIAS } from '../../compartido/categorias.ts'
import { diaSemanaCorto, esProximosDias, fecha, hora } from '../datos/fechas'
import type { Historia } from '../../compartido/tipos.ts'
import { cargarHistorias, MODO_DEMO, URL_GESTION, useAgenda } from '../datos/repositorio'
import { BotonContar, TarjetaHistoria } from './Historias'
import { PARADAS, RUTA_MINUTOS } from '../datos/yincana'
import { useCompletadas, useGuardados, useMisInscripciones, useSeguidos } from '../estado/almacen'

export function BannerYincana() {
  const completadas = useCompletadas()
  const siguiente = PARADAS.find((p) => !completadas.includes(p.numero))
  const empezada = completadas.length > 0
  const a = !siguiente ? '/yincana/fin' : empezada ? `/yincana/${siguiente.numero}` : '/yincana'
  return (
    <Link to={a} className="banner-yincana">
      <svg className="banner-ruta" viewBox="0 0 120 90" aria-hidden="true">
        <path d="M14 74 C 34 44, 44 70, 62 48 S 88 40, 106 16" fill="none" stroke="#FAF8F3" strokeWidth="3" strokeDasharray="1 7" strokeLinecap="round" />
        {[[14, 74], [38, 58], [62, 48], [84, 38], [106, 16]].map(([x, y], i) => (
          <circle key={x} cx={x} cy={y} r="7" fill={i < completadas.length ? '#D4A23C' : '#FAF8F3'} />
        ))}
      </svg>
      <div>
        <p className="banner-ante">Yincana cultural · Gratis</p>
        <h2>{!siguiente ? '¡Recorrido completado!' : empezada ? `Sigue por la parada ${siguiente.numero}` : 'Recorre el casco urbano'}</h2>
        <p className="banner-datos">{PARADAS.length} paradas · {RUTA_MINUTOS} min · sin registro</p>
        <span className="banner-accion">{!siguiente ? 'Ver' : empezada ? 'Continuar' : 'Ver el recorrido'} <Icono n="adelante" tam={16} /></span>
      </div>
    </Link>
  )
}

export function Inicio() {
  const [compartiendo, setCompartiendo] = useState(false)
  const { proximos, todos, estado } = useAgenda()
  const guardados = useGuardados()
  const inscritos = useMisInscripciones()
  const seguidos = useSeguidos()
  // Tus planes: a lo que te has apuntado, lo que has guardado y lo nuevo de quien sigues.
  const planes = proximos
    .map((e) => ({
      e,
      motivo: inscritos.some((i) => i.evento === e.id && i.estado !== 'cancelada') ? 'Apuntado' : guardados.includes(e.id) ? 'Guardado' : seguidos.includes(e.organizador) ? 'Sigues a quien organiza' : '',
    }))
    .filter((p) => p.motivo)
    .slice(0, 4)
  const [historias, setHistorias] = useState<Historia[]>([])
  useEffect(() => {
    cargarHistorias().then(setHistorias).catch(() => undefined)
  }, [])
  const ahora = new Date()
  const conFotos = todos.filter((e) => e.fotos?.length && fecha(e.fin) < ahora).reverse().slice(0, 6)
  const semana = proximos.filter((e) => esProximosDias(e, 7))
  const hayEstaSemana = semana.length > 0
  const destacados = (hayEstaSemana ? semana : proximos).slice(0, 6)

  return (
    <div className="pantalla">
      <header className="cabecera">
        <div>
          <p className="antetitulo">Valverde del Camino y alrededores</p>
          <h1>Valverde <em>Cuenta</em></h1>
        </div>
        <button className="boton-redondo" onClick={() => setCompartiendo(true)} aria-label="Compartir la app con un código QR">
          <Icono n="qr" tam={22} />
        </button>
      </header>

      <AvisoEjemplo>Los eventos y relatos son de ejemplo.</AvisoEjemplo>
      {MODO_DEMO && (
        <a className="publica-evento" href={URL_GESTION}>
          <b>Probar el panel de gestión →</b>
          <span>Entra como dirección o como asociación, aprueba eventos y míralos aquí después.</span>
        </a>
      )}

      {!!planes.length && (
        <section className="tus-planes">
          <h2>Tus planes</h2>
          {planes.map(({ e, motivo }) => (
            <Link key={e.id} to={`/evento/${e.id}`} className="plan">
              <span className="plan-fecha"><small>{diaSemanaCorto(fecha(e.inicio))}</small><b>{fecha(e.inicio).getDate()}</b></span>
              <span><b>{e.titulo}</b><small>{hora(e.inicio)} · {motivo}</small></span>
              <Icono n="adelante" tam={16} />
            </Link>
          ))}
        </section>
      )}

      <div className="titulo-seccion">
        <h2>{hayEstaSemana ? 'Esta semana en Valverde' : 'Próximamente en Valverde'}</h2>
        <Link to="/agenda">Agenda <Icono n="adelante" tam={14} /></Link>
      </div>
      {estado === 'cargando' && !destacados.length && <p className="suave">Cargando la agenda…</p>}
      {estado === 'sin-conexion' && <p className="suave">No hemos podido cargar la agenda. Comprueba la conexión.</p>}
      {estado === 'listo' && !destacados.length && <p className="suave">Aún no hay eventos en la agenda. ¡Vuelve pronto!</p>}
      <div className="carrusel">
        {destacados.map((e) => <TarjetaGrande key={e.id} evento={e} />)}
        <Link to="/agenda" className="tarjeta-ver-todo">
          <Icono n="agenda" tam={28} />
          Ver toda la agenda
        </Link>
      </div>

      <div className="chips chips-desplazables">
        {CATEGORIAS.map((c) => (
          <Link key={c.id} className="chip" to={`/agenda?f=${c.id}`}>{c.emoji} {c.nombre}</Link>
        ))}
      </div>

      <BannerYincana />

      {!!conFotos.length && (
        <>
          <div className="titulo-seccion"><h2>Cómo fue</h2></div>
          <div className="carrusel">
            {conFotos.map((e) => (
              <Link key={e.id} to={`/evento/${e.id}`} className="tarjeta-recuerdo">
                <img src={e.fotos![0].url} alt="" loading="lazy" />
                <span><b>{e.titulo}</b><small>{e.fotos!.length === 1 ? '1 foto' : `${e.fotos!.length} fotos`}</small></span>
              </Link>
            ))}
          </div>
        </>
      )}

      <div className="titulo-seccion">
        <h2>Historias de Valverde</h2>
        <Link to="/historias">Ver todas <Icono n="adelante" tam={14} /></Link>
      </div>
      {historias.slice(0, 2).map((h) => <TarjetaHistoria key={h.slug} h={h} />)}
      <BotonContar />

      {compartiendo && <HojaCompartir alCerrar={() => setCompartiendo(false)} />}
    </div>
  )
}
