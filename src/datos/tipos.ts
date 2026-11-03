export type Categoria = 'teatro' | 'musica' | 'fiestas' | 'ninos' | 'patrimonio' | 'mercados'
export type Zona = 'valverde' | 'alrededores'
export type TipoEscena =
  | 'fiesta' | 'iglesia' | 'calle' | 'comercio' | 'dolmen' | 'teatro' | 'musica' | 'libro' | 'casa' | 'ermita'

export interface Evento {
  id: string
  titulo: string
  resumen: string
  descripcion: string
  /** Hora local de Valverde, formato AAAA-MM-DDTHH:mm */
  inicio: string
  fin: string
  lugar: string
  municipio: string
  zona: Zona
  lat: number
  lng: number
  organizador: string
  /** null significa gratis */
  precio: number | null
  publico: string
  categoria: Categoria
  paraNinos?: boolean
  escena: TipoEscena
  enlazaYincana?: boolean
}

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
