/**
 * Puente con el dispositivo. Las pantallas nunca tocan las API del navegador directamente:
 * al empaquetar con Capacitor, basta con cambiar aquí cada función por su plugin nativo.
 */
import type { Evento } from '../datos/tipos'

export const enlaceA = (ruta: string) => `${location.origin}${location.pathname}#${ruta}`

export function leer<T>(clave: string, porDefecto: T): T {
  try {
    const crudo = localStorage.getItem(clave)
    return crudo ? (JSON.parse(crudo) as T) : porDefecto
  } catch {
    return porDefecto
  }
}

export function escribir<T>(clave: string, valor: T) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor))
  } catch {
    // Sin almacenamiento la app sigue funcionando, solo que no recuerda el progreso.
  }
}

export function avisar(texto: string) {
  window.dispatchEvent(new CustomEvent('vc-aviso', { detail: texto }))
}

export async function compartir(titulo: string, texto: string, ruta: string) {
  const url = enlaceA(ruta)
  if (navigator.share) {
    try {
      await navigator.share({ title: titulo, text: texto, url })
    } catch {
      // La persona ha cancelado: no hay nada que avisar.
    }
    return
  }
  try {
    await navigator.clipboard.writeText(url)
    avisar('Enlace copiado')
  } catch {
    avisar(url)
  }
}

export function abrirIndicaciones(lat: number, lng: number) {
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`, '_blank', 'noopener')
}

export function obtenerUbicacion(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolver, rechazar) => {
    if (!navigator.geolocation) return rechazar(new Error('sin geolocalización'))
    navigator.geolocation.getCurrentPosition(
      (p) => resolver({ lat: p.coords.latitude, lng: p.coords.longitude }),
      rechazar,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    )
  })
}

export const textoDistancia = (m: number) =>
  m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`

const escaparIcs = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
const fechaIcs = (iso: string) => iso.replace(/[-:]/g, '') + '00'
const plegar = (linea: string) => linea.match(/.{1,70}/g)!.join('\r\n ')

export function textoCalendario(e: Evento, ahora = new Date()) {
  const sello = ahora.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//27 Vueltas//Valverde Cuenta//ES', 'BEGIN:VEVENT',
    `UID:${e.id}@valverde-cuenta`, `DTSTAMP:${sello}`, `DTSTART:${fechaIcs(e.inicio)}`, `DTEND:${fechaIcs(e.fin)}`,
    `SUMMARY:${escaparIcs(e.titulo)}`, `LOCATION:${escaparIcs(`${e.lugar}, ${e.municipio}`)}`,
    `DESCRIPTION:${escaparIcs(e.descripcion)}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:-PT2H', `DESCRIPTION:${escaparIcs(e.titulo)}`, 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].map(plegar).join('\r\n')
}

export function anadirACalendario(e: Evento) {
  const blob = new Blob([textoCalendario(e)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${e.id}.ics`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
  avisar('Abre el archivo para añadirlo a tu calendario')
}
