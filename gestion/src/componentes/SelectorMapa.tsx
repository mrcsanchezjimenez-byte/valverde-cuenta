import L from 'leaflet'
import { useEffect } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'

const icono = L.divIcon({ className: 'g-marca', html: '<span></span>', iconSize: [26, 26], iconAnchor: [13, 26] })

function AlPulsar({ alElegir }: { alElegir: (p: { lat: number; lng: number }) => void }) {
  useMapEvents({ click: (e) => alElegir({ lat: Number(e.latlng.lat.toFixed(6)), lng: Number(e.latlng.lng.toFixed(6)) }) })
  return null
}

function Centrar({ lat, lng }: { lat: number; lng: number }) {
  const mapa = useMap()
  useEffect(() => {
    mapa.setView([lat, lng], Math.max(mapa.getZoom(), 15))
  }, [lat, lng, mapa])
  return null
}

/** Mapa para marcar dónde es el evento: se pulsa en el sitio exacto. */
export function SelectorMapa({ lat, lng, alElegir }: { lat: number; lng: number; alElegir: (p: { lat: number; lng: number }) => void }) {
  return (
    <MapContainer className="g-mapa" center={[lat, lng]} zoom={15}>
      <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' maxZoom={19} />
      <Marker position={[lat, lng]} icon={icono} draggable eventHandlers={{
        dragend: (e) => {
          const p = (e.target as L.Marker).getLatLng()
          alElegir({ lat: Number(p.lat.toFixed(6)), lng: Number(p.lng.toFixed(6)) })
        },
      }} />
      <AlPulsar alElegir={alElegir} />
      <Centrar lat={lat} lng={lng} />
    </MapContainer>
  )
}
