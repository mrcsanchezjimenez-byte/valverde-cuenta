import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fecha, hora } from '../datos/fechas'
import type { Evento, Parada } from '../datos/tipos'
import { PARADAS } from '../datos/yincana'
import { useCompletadas } from '../estado/almacen'
import { abrirIndicaciones, avisar, obtenerUbicacion } from '../nativo'
import { Escena } from './Escena'
import { Icono } from './Iconos'
import { MapaBase, marcaParada, type Marca } from './MapaBase'

interface Lugar {
  clave: string
  nombre: string
  lat: number
  lng: number
  eventos: Evento[]
}

const fechaBreve = (e: Evento) =>
  new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(fecha(e.inicio)).replace('.', '')

function agruparPorLugar(eventos: Evento[]): Lugar[] {
  const mapa = new Map<string, Lugar>()
  for (const e of eventos) {
    const clave = `${e.lat},${e.lng}`
    const lugar = mapa.get(clave) ?? { clave, nombre: e.lugar, lat: e.lat, lng: e.lng, eventos: [] }
    lugar.eventos.push(e)
    mapa.set(clave, lugar)
  }
  return [...mapa.values()]
}

type Seleccion = { tipo: 'lugar'; lugar: Lugar } | { tipo: 'parada'; parada: Parada } | null

const CASCO = { lat: 37.5755, lng: -6.7525 }
const RADIO_CASCO = 0.01 // Alrededor de un kilómetro.

export function MapaInteractivo({ eventos, conYincana }: { eventos: Evento[]; conYincana: boolean }) {
  const completadas = useCompletadas()
  const [seleccion, setSeleccion] = useState<Seleccion>(null)
  const [ubicacion, setUbicacion] = useState<{ lat: number; lng: number } | null>(null)
  const lugares = useMemo(() => agruparPorLugar(eventos), [eventos])
  const siguiente = PARADAS.find((p) => !completadas.includes(p.numero))?.numero

  const marcas: Marca[] = [
    ...lugares.map((l) => ({
      id: l.clave, lat: l.lat, lng: l.lng, ancho: 50, alto: 22, flotante: true,
      etiqueta: l.nombre,
      html: `<span class="marca-evento">${fechaBreve(l.eventos[0])}</span>`,
      alPulsar: () => setSeleccion({ tipo: 'lugar', lugar: l }),
    })),
    ...(conYincana ? PARADAS.map((p) => ({
      id: `parada-${p.numero}`, lat: p.lat, lng: p.lng, ancho: 34, alto: 34,
      etiqueta: `Parada ${p.numero}: ${p.nombre}`,
      html: marcaParada(p.numero, completadas.includes(p.numero) ? 'hecha' : p.numero === siguiente ? 'siguiente' : 'pendiente'),
      alPulsar: () => setSeleccion({ tipo: 'parada', parada: p }),
    })) : []),
  ]

  // Se encuadra el casco urbano si hay algo en él. Lo más lejano se ve alejando el mapa.
  const puntos: [number, number][] = marcas.map((m) => [m.lat, m.lng])
  const enElCasco = puntos.filter(([lat, lng]) => Math.abs(lat - CASCO.lat) < RADIO_CASCO && Math.abs(lng - CASCO.lng) < RADIO_CASCO)
  const ajustar = enElCasco.length ? enElCasco : puntos

  async function localizar() {
    try {
      setUbicacion(await obtenerUbicacion())
    } catch {
      avisar('No hemos podido obtener tu ubicación')
    }
  }

  return (
    <div className="mapa-interactivo">
      <MapaBase marcas={marcas} conRuta={conYincana} ajustar={ajustar} ubicacion={ubicacion} />
      <button className="boton-flotante" onClick={localizar} aria-label="Mostrar mi ubicación">
        <Icono n="ubicacion" tam={22} />
      </button>
      {seleccion?.tipo === 'lugar' && (
        <section className="hoja">
          <button className="hoja-cerrar" onClick={() => setSeleccion(null)} aria-label="Cerrar"><Icono n="cerrar" tam={18} /></button>
          <p className="antetitulo">{seleccion.lugar.eventos.length === 1 ? 'Evento aquí' : `${seleccion.lugar.eventos.length} eventos aquí`}</p>
          <h3 className="titulo-hoja">{seleccion.lugar.nombre}</h3>
          <ul className="hoja-lista">
            {seleccion.lugar.eventos.slice(0, 3).map((e) => (
              <li key={e.id}>
                <Link to={`/evento/${e.id}`}>
                  <span><b>{e.titulo}</b><small>{fechaBreve(e)} · {hora(e.inicio)}</small></span>
                  <Icono n="adelante" tam={18} />
                </Link>
              </li>
            ))}
          </ul>
          <button className="boton boton-suave boton-ancho" onClick={() => abrirIndicaciones(seleccion.lugar.lat, seleccion.lugar.lng)}>Cómo llegar</button>
        </section>
      )}
      {seleccion?.tipo === 'parada' && (
        <section className="hoja">
          <button className="hoja-cerrar" onClick={() => setSeleccion(null)} aria-label="Cerrar"><Icono n="cerrar" tam={18} /></button>
          <div className="hoja-parada">
            <Escena tipo={seleccion.parada.escena} clase="miniatura" />
            <div>
              <p className="antetitulo">Parada {seleccion.parada.numero} de {PARADAS.length}</p>
              <h3 className="titulo-hoja">{seleccion.parada.nombre}</h3>
              <p className="suave">{seleccion.parada.direccion}</p>
            </div>
          </div>
          <div className="fila-botones">
            <button className="boton boton-suave" onClick={() => abrirIndicaciones(seleccion.parada.lat, seleccion.parada.lng)}>Cómo llegar</button>
            <Link className="boton boton-primario" to={`/yincana/${seleccion.parada.numero}`}>Ver parada</Link>
          </div>
        </section>
      )}
    </div>
  )
}
