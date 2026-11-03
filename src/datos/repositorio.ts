import { EVENTOS } from './eventos'
import { fecha, noHaTerminado } from './fechas'

/**
 * Único punto por el que las pantallas piden datos. Hoy lee ficheros locales; cuando haya
 * un sitio donde 27 Vueltas edite la agenda, solo cambia este módulo.
 */
const ordenados = [...EVENTOS].sort((a, b) => fecha(a.inicio).getTime() - fecha(b.inicio).getTime())

export const todosLosEventos = () => ordenados
export const proximosEventos = () => ordenados.filter((e) => noHaTerminado(e))
export const obtenerEvento = (id: string) => ordenados.find((e) => e.id === id)
