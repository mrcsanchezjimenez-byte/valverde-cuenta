import type { Evento } from './tipos'

const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('es-ES', o)
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export const fecha = (iso: string) => new Date(iso)
export const hora = (iso: string) => fmt({ hour: '2-digit', minute: '2-digit' }).format(fecha(iso))
export const fechaLarga = (d: Date) => capital(fmt({ weekday: 'long', day: 'numeric', month: 'long' }).format(d).replace(',', ''))
export const diaSemanaCorto = (d: Date) => fmt({ weekday: 'short' }).format(d).replace('.', '').toUpperCase()
export const mesLargo = (d: Date) => capital(fmt({ month: 'long', year: 'numeric' }).format(d))

export const claveDia = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const noHaTerminado = (e: Evento, ahora = new Date()) => fecha(e.fin) >= ahora
export const esHoy = (e: Evento, ahora = new Date()) => claveDia(fecha(e.inicio)) === claveDia(ahora)

/** El fin de semana más cercano: de viernes a domingo. */
export function esEsteFinde(e: Evento, ahora = new Date()) {
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
  const domingo = new Date(hoy)
  domingo.setDate(hoy.getDate() + ((7 - hoy.getDay()) % 7))
  const viernes = new Date(domingo)
  viernes.setDate(domingo.getDate() - 2)
  const dia = claveDia(fecha(e.inicio))
  return dia >= claveDia(viernes) && dia <= claveDia(domingo)
}

export function esProximosDias(e: Evento, dias: number, ahora = new Date()) {
  const limite = new Date(ahora)
  limite.setDate(ahora.getDate() + dias)
  return noHaTerminado(e, ahora) && fecha(e.inicio) <= limite
}
