import { useSyncExternalStore } from 'react'
import { escribir, leer } from '../nativo'

/** Estado guardado solo en este dispositivo: no hay cuentas ni servidor. */
function crearAlmacen<T>(clave: string, inicial: T) {
  let valor = leer(clave, inicial)
  const oyentes = new Set<() => void>()
  const suscribir = (o: () => void) => {
    oyentes.add(o)
    return () => {
      oyentes.delete(o)
    }
  }
  return {
    useValor: () => useSyncExternalStore(suscribir, () => valor),
    obtener: () => valor,
    poner(nuevo: T) {
      valor = nuevo
      escribir(clave, nuevo)
      oyentes.forEach((o) => o())
    },
  }
}

const guardados = crearAlmacen<string[]>('vc.guardados', [])
export const useGuardados = guardados.useValor
export function alternarGuardado(id: string) {
  const actual = guardados.obtener()
  guardados.poner(actual.includes(id) ? actual.filter((x) => x !== id) : [...actual, id])
}

const completadas = crearAlmacen<number[]>('vc.yincana', [])
export const useCompletadas = completadas.useValor
export function completarParada(numero: number) {
  const actual = completadas.obtener()
  if (!actual.includes(numero)) completadas.poner([...actual, numero])
}
export const reiniciarYincana = () => completadas.poner([])

/** Inscripciones hechas desde este móvil (con su código secreto para consultarlas o cancelarlas). */
export interface InscripcionGuardada {
  codigo: string
  evento: string
  personas: number
  estado: 'confirmada' | 'espera' | 'cancelada'
}
const inscripciones = crearAlmacen<InscripcionGuardada[]>('vc.inscripciones', [])
export const useMisInscripciones = inscripciones.useValor
export function guardarInscripcion(i: InscripcionGuardada) {
  inscripciones.poner([...inscripciones.obtener().filter((x) => x.evento !== i.evento), i])
}
export function olvidarInscripcion(codigo: string) {
  inscripciones.poner(inscripciones.obtener().filter((x) => x.codigo !== codigo))
}
