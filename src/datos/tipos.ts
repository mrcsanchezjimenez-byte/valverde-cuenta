import type { TipoEscena } from '../../compartido/tipos.ts'

export type { Categoria, Evento, TipoEscena, Zona } from '../../compartido/tipos.ts'

export interface Parada {
  numero: number
  nombre: string
  direccion: string
  lat: number
  lng: number
  escena: TipoEscena
  voz: string
  relato: string
  pregunta: string
  opciones: string[]
  correcta: number
  /** Pista para encontrar la parada siguiente. Vacía en la última. */
  pistaSiguiente: string
  metrosDesdeAnterior: number
}
