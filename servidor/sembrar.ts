/**
 * Solo para probar en local: mete los eventos de ejemplo en la base de datos, como publicados,
 * a nombre de la entidad interna. Mueve las fechas para que siempre caigan en las próximas semanas.
 *
 *   npm run sembrar
 */
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { EVENTOS, HISTORIAS_EJEMPLO, LUGARES_EJEMPLO } from '../compartido/ejemplo.ts'
import { VERSION_CONSENTIMIENTO } from '../compartido/tipos.ts'
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
  console.log('Los eventos de ejemplo ya estaban.')
} else {
  sembrarEventos()
}

function sembrarEventos() {
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
      categoria: e.categoria, paraNinos: Boolean(e.paraNinos), enlace: '', imagen: null, inscripcion: null,
    }, 'publicado', { organizador: `${e.organizador} (ejemplo)` })
    ejecutar('UPDATE eventos SET escena = ?, enlaza_yincana = ? WHERE id = ?', e.escena, Boolean(e.enlazaYincana), id)
  }
})
console.log(`Sembrados ${EVENTOS.length} eventos de ejemplo.`)
}

// Lugares con placa e historias de ejemplo (publicadas)
if (!uno('SELECT 1 FROM lugares')) {
  transaccion(() => {
    for (const l of LUGARES_EJEMPLO) {
      ejecutar('INSERT INTO lugares (slug, nombre, descripcion, direccion, lat, lng, anfitrion) VALUES (?, ?, ?, ?, ?, ?, ?)',
        l.slug, l.nombre, l.descripcion, l.direccion, l.lat, l.lng, l.anfitrion)
    }
    for (const [i, h] of HISTORIAS_EJEMPLO.entries()) {
      const lugar = uno<{ id: number }>('SELECT id FROM lugares WHERE slug = ?', h.lugar)!
      ejecutar(`INSERT INTO historias (slug, estado, origen, titulo, texto, epoca, lugar_id, firma, autor, consentimiento)
                VALUES (?, 'publicada', 'entrevista', ?, ?, ?, ?, ?, ?, ?)`,
        `ejemplo${i + 1}`, h.titulo, h.texto, h.epoca, lugar.id, h.autor ? 'nombre' : 'anonimo', h.autor,
        JSON.stringify({ version: VERSION_CONSENTIMIENTO, aceptados: ['cesion', 'autoria', 'personas', 'edad'], fecha: new Date().toISOString() }))
    }
  })
  console.log(`Sembrados ${LUGARES_EJEMPLO.length} lugares y ${HISTORIAS_EJEMPLO.length} historias de ejemplo.`)
}
