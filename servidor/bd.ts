import { DatabaseSync, type SQLInputValue } from 'node:sqlite'
import { MIGRACIONES } from './migraciones.ts'

let actual: DatabaseSync | null = null

/** Abre la base de datos y aplica las migraciones pendientes. ':memory:' para pruebas. */
export function iniciarBd(ruta: string) {
  const bd = new DatabaseSync(ruta)
  bd.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;')
  const version = (bd.prepare('PRAGMA user_version').get() as { user_version: number }).user_version
  // Algunas migraciones rehacen tablas: las claves ajenas se apagan mientras tanto y se comprueban al final.
  if (version < MIGRACIONES.length) bd.exec('PRAGMA foreign_keys = OFF')
  for (let i = version; i < MIGRACIONES.length; i++) {
    bd.exec('BEGIN')
    try {
      bd.exec(MIGRACIONES[i])
      const rotas = bd.prepare('PRAGMA foreign_key_check').all()
      if (rotas.length) throw new Error(`La migración ${i + 1} deja referencias rotas: ${JSON.stringify(rotas.slice(0, 3))}`)
      bd.exec(`PRAGMA user_version = ${i + 1}`)
      bd.exec('COMMIT')
    } catch (e) {
      bd.exec('ROLLBACK')
      bd.exec('PRAGMA foreign_keys = ON')
      throw e
    }
  }
  bd.exec('PRAGMA foreign_keys = ON')
  actual = bd
  return bd
}

export function bd() {
  if (!actual) throw new Error('La base de datos no está abierta')
  return actual
}

type Valor = SQLInputValue | boolean | undefined
const limpiar = (vs: Valor[]) => vs.map((v) => (v === undefined ? null : typeof v === 'boolean' ? (v ? 1 : 0) : v))

export const uno = <T>(sql: string, ...vs: Valor[]) => bd().prepare(sql).get(...limpiar(vs)) as T | undefined
export const varios = <T>(sql: string, ...vs: Valor[]) => bd().prepare(sql).all(...limpiar(vs)) as T[]
export const ejecutar = (sql: string, ...vs: Valor[]) => bd().prepare(sql).run(...limpiar(vs))

export function transaccion<T>(fn: () => T): T {
  bd().exec('BEGIN IMMEDIATE')
  try {
    const r = fn()
    bd().exec('COMMIT')
    return r
  } catch (e) {
    bd().exec('ROLLBACK')
    throw e
  }
}

export const ahoraIso = () => new Date().toISOString().replace(/\.\d+Z$/, 'Z')

/** Hora local de Valverde en el formato de los eventos (AAAA-MM-DDTHH:mm). */
export function ahoraLocal(fecha = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(fecha).map((x) => [x.type, x.value]),
  )
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`
}
