import L from 'leaflet'
import { useEffect, useMemo } from 'react'
import { AttributionControl, CircleMarker, MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet'
import { RUTA_PUNTOS } from '../datos/yincana'

export interface Marca {
  id: string
  lat: number
  lng: number
  html: string
  ancho: number
  alto: number
  etiqueta: string
  /** La marca queda encima del punto en vez de centrada, y por debajo de las paradas. */
  flotante?: boolean
  alPulsar?: () => void
}

function AjustarVista({ puntos }: { puntos: [number, number][] }) {
  const mapa = useMap()
  const clave = JSON.stringify(puntos)
  useEffect(() => {
    const lista = JSON.parse(clave) as [number, number][]
    const encuadrar = () => {
      mapa.invalidateSize()
      if (lista.length) mapa.fitBounds(L.latLngBounds(lista), { padding: [30, 30], maxZoom: 17 })
    }
    encuadrar()
    // Si el hueco del mapa cambia (giro del móvil, ventana nueva), se vuelve a encuadrar.
    const observador = new ResizeObserver(encuadrar)
    observador.observe(mapa.getContainer())
    return () => observador.disconnect()
  }, [clave, mapa])
  return null
}

function Marcador({ marca }: { marca: Marca }) {
  const icono = useMemo(
    () => L.divIcon({
      className: 'marca', html: marca.html, iconSize: [marca.ancho, marca.alto],
      iconAnchor: [marca.ancho / 2, marca.flotante ? marca.alto + 16 : marca.alto / 2],
    }),
    [marca.html, marca.ancho, marca.alto, marca.flotante],
  )
  return (
    <Marker
      position={[marca.lat, marca.lng]} icon={icono} title={marca.etiqueta} alt={marca.etiqueta}
      zIndexOffset={marca.flotante ? 0 : 1000}
      eventHandlers={{ click: () => marca.alPulsar?.() }}
    />
  )
}

export function MapaBase({ marcas, conRuta = false, ajustar, ubicacion }: {
  marcas: Marca[]
  conRuta?: boolean
  ajustar: [number, number][]
  ubicacion?: { lat: number; lng: number } | null
}) {
  return (
    <MapContainer className="mapa-base" center={[37.5745, -6.753]} zoom={15} zoomSnap={0.25} zoomControl={false} attributionControl={false}>
      <AttributionControl prefix={false} />
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        maxZoom={19}
      />
      {conRuta && <Polyline positions={RUTA_PUNTOS} pathOptions={{ color: '#B4502B', weight: 4, dashArray: '2 9', lineCap: 'round' }} />}
      {marcas.map((m) => <Marcador key={m.id} marca={m} />)}
      {ubicacion && (
        <CircleMarker center={[ubicacion.lat, ubicacion.lng]} radius={8} pathOptions={{ color: '#fff', weight: 3, fillColor: '#2F6FDE', fillOpacity: 1 }} />
      )}
      <AjustarVista puntos={ajustar} />
    </MapContainer>
  )
}

export const marcaParada = (numero: number, estado: 'hecha' | 'siguiente' | 'pendiente') =>
  `<span class="marca-parada marca-${estado}">${estado === 'hecha' ? '✓' : numero}</span>`
