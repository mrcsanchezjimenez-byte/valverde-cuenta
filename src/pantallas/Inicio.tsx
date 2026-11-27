import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AvisoEjemplo } from '../componentes/Avisos'
import { HojaCompartir } from '../componentes/HojaCompartir'
import { Icono } from '../componentes/Iconos'
import { TarjetaGrande } from '../componentes/TarjetasEvento'
import { CATEGORIAS } from '../../compartido/categorias.ts'
import { esProximosDias } from '../datos/fechas'
import { MODO_DEMO, URL_GESTION, useAgenda } from '../datos/repositorio'
import { PARADAS, RUTA_MINUTOS } from '../datos/yincana'
import { useCompletadas } from '../estado/almacen'

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
  const { proximos, estado } = useAgenda()
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

      <div className="titulo-seccion">
        <h2>Historias de Valverde</h2>
      </div>
      <Link to="/historias" className="fila-proximamente">
        <span className="circulo-icono"><Icono n="historias" tam={22} /></span>
        <span>
          <b>Radio 27 y Fotos de antes</b>
          <small>Voces y fotos de vecinos. Próximamente.</small>
        </span>
        <Icono n="adelante" tam={18} />
      </Link>

      {compartiendo && <HojaCompartir alCerrar={() => setCompartiendo(false)} />}
    </div>
  )
}
