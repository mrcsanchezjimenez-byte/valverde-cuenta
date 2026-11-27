import type { Categoria, TipoEscena } from './tipos.ts'

export const CATEGORIAS: { id: Categoria; nombre: string; emoji: string; escena: TipoEscena }[] = [
  { id: 'teatro', nombre: 'Teatro', emoji: '🎭', escena: 'teatro' },
  { id: 'musica', nombre: 'Música', emoji: '🎶', escena: 'musica' },
  { id: 'fiestas', nombre: 'Fiestas', emoji: '🎉', escena: 'fiesta' },
  { id: 'ninos', nombre: 'Niños', emoji: '🧒', escena: 'libro' },
  { id: 'patrimonio', nombre: 'Patrimonio', emoji: '🏛️', escena: 'casa' },
  { id: 'mercados', nombre: 'Mercados', emoji: '🧺', escena: 'comercio' },
  { id: 'deporte', nombre: 'Deporte', emoji: '🏃', escena: 'calle' },
  { id: 'charlas', nombre: 'Charlas y talleres', emoji: '📚', escena: 'libro' },
]

export const IDS_CATEGORIAS = CATEGORIAS.map((c) => c.id) as [Categoria, ...Categoria[]]

export const ESCENAS: { id: TipoEscena; nombre: string }[] = [
  { id: 'fiesta', nombre: 'Fiesta' },
  { id: 'iglesia', nombre: 'Iglesia' },
  { id: 'ermita', nombre: 'Ermita' },
  { id: 'calle', nombre: 'Calle' },
  { id: 'comercio', nombre: 'Comercio' },
  { id: 'dolmen', nombre: 'Dolmen' },
  { id: 'teatro', nombre: 'Teatro' },
  { id: 'musica', nombre: 'Música' },
  { id: 'libro', nombre: 'Libro' },
  { id: 'casa', nombre: 'Casa' },
]

export const IDS_ESCENAS = ESCENAS.map((e) => e.id) as [TipoEscena, ...TipoEscena[]]

export const escenaPorDefecto = (c: Categoria): TipoEscena => CATEGORIAS.find((x) => x.id === c)?.escena ?? 'calle'
