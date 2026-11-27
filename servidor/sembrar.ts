/**
 * Solo para probar en local: mete los eventos de ejemplo en la base de datos, como publicados,
 * a nombre de la entidad interna. Mueve las fechas para que siempre caigan en las próximas semanas.
 *
 *   npm run sembrar
 */
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { EVENTOS } from '../compartido/ejemplo.ts'
import { ejecutar, iniciarBd, transaccion, uno } from './bd.ts'
import { config } from './config.ts'
import { crearEvento } from './eventos.ts'

if (config.produccion) {
  console.error('No se siembran datos de ejemplo en producción.')
  process.exit(1)
}

mkdirSync(config.datos, { recursive: true })
iniciarBd(join(config.datos, 'valverde.db'))

if (uno("SELECT 1 FROM eventos WHERE organizador LIKE '%(ejemplo)'")) {
  console.log('Los eventos de ejemplo ya estaban. Nada que hacer.')
  process.exit(0)
}

const interna = uno<{ id: number }>('SELECT id FROM entidades WHERE interna = 1')!.id
const primero = Math.min(...EVENTOS.map((e) => Date.parse(`${e.inicio}:00Z`)))
const desplazamiento = Math.max(0, Math.ceil((Date.now() + 86400_000 - primero) / (7 * 86400_000))) * 7 * 86400_000
const mover = (s: string) => new Date(Date.parse(`${s}:00Z`) + desplazamiento).toISOString().slice(0, 16)

transaccion(() => {
  for (const e of EVENTOS) {
    const m = uno<{ id: number }>('SELECT id FROM municipios WHERE nombre = ?', e.municipio)
    if (!m) continue
    const id = crearEvento(interna, {
      titulo: e.titulo, resumen: e.resumen, descripcion: e.descripcion, inicio: mover(e.inicio), fin: mover(e.fin),
      lugar: e.lugar, municipioId: m.id, lat: e.lat, lng: e.lng, precio: e.precio, publico: e.publico,
      categoria: e.categoria, paraNinos: Boolean(e.paraNinos), enlace: '', imagen: null,
    }, 'publicado', { organizador: `${e.organizador} (ejemplo)` })
    ejecutar('UPDATE eventos SET escena = ?, enlaza_yincana = ? WHERE id = ?', e.escena, Boolean(e.enlazaYincana), id)
  }
})
console.log(`Sembrados ${EVENTOS.length} eventos de ejemplo.`)
