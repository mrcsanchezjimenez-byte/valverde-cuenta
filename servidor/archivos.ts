import { randomBytes } from 'node:crypto'
import { createReadStream, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import type { Context } from 'hono'
import { LIMITES_ARCHIVOS } from '../compartido/tipos.ts'
import { config } from './config.ts'
import { fallo } from './contexto.ts'

/**
 * Fotos y audios que manda la gente. Reglas:
 * - El tipo se decide mirando los primeros bytes del archivo, no lo que diga el navegador ni el nombre.
 * - Solo fotos JPEG/PNG y audios habituales (WebM, Ogg, MP4/M4A, MP3, WAV).
 * - A las fotos se les quitan los metadatos (ubicación GPS, modelo del móvil, fecha…).
 * - Se guardan con un nombre aleatorio, sin extensión, fuera de cualquier carpeta que se sirva directamente.
 */

export type TipoArchivo = 'foto' | 'audio'

const empieza = (b: Uint8Array, firma: number[], desde = 0) => firma.every((x, i) => b[desde + i] === x)
const texto = (b: Uint8Array, desde: number, s: string) => empieza(b, [...s].map((c) => c.charCodeAt(0)), desde)

export function detectar(b: Uint8Array): { tipo: TipoArchivo; mime: string } | null {
  if (empieza(b, [0xff, 0xd8, 0xff])) return { tipo: 'foto', mime: 'image/jpeg' }
  if (empieza(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { tipo: 'foto', mime: 'image/png' }
  if (empieza(b, [0x1a, 0x45, 0xdf, 0xa3])) return { tipo: 'audio', mime: 'audio/webm' }
  if (texto(b, 0, 'OggS')) return { tipo: 'audio', mime: 'audio/ogg' }
  if (texto(b, 4, 'ftyp')) return { tipo: 'audio', mime: 'audio/mp4' }
  if (texto(b, 0, 'RIFF') && texto(b, 8, 'WAVE')) return { tipo: 'audio', mime: 'audio/wav' }
  if (texto(b, 0, 'ID3') || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)) return { tipo: 'audio', mime: 'audio/mpeg' }
  return null
}

/** JPEG sin metadatos: fuera EXIF/XMP (APP1), los demás APPn salvo el perfil de color (APP2) y comentarios. */
export function limpiarJpeg(b: Buffer): Buffer {
  const partes: Buffer[] = [b.subarray(0, 2)]
  let i = 2
  while (i < b.length - 1) {
    if (b[i] !== 0xff) throw fallo(400, 'Una de las fotos está dañada.')
    const m = b[i + 1]
    if (m === 0xff) {
      i++
      continue
    }
    // A partir del comienzo de la imagen (SOS) ya son los píxeles: se copian tal cual.
    if (m === 0xda) {
      partes.push(b.subarray(i))
      break
    }
    if ((m >= 0xd0 && m <= 0xd9) || m === 0x01) {
      partes.push(b.subarray(i, i + 2))
      i += 2
      continue
    }
    if (i + 4 > b.length) throw fallo(400, 'Una de las fotos está dañada.')
    const largo = b.readUInt16BE(i + 2)
    const quitar = (m >= 0xe1 && m <= 0xef && m !== 0xe2) || m === 0xfe
    if (!quitar) partes.push(b.subarray(i, i + 2 + largo))
    i += 2 + largo
  }
  return Buffer.concat(partes)
}

/** PNG sin trozos de texto, EXIF ni fecha. */
export function limpiarPng(b: Buffer): Buffer {
  const QUITAR = new Set(['tEXt', 'zTXt', 'iTXt', 'eXIf', 'tIME'])
  const partes: Buffer[] = [b.subarray(0, 8)]
  let i = 8
  while (i + 12 <= b.length) {
    const largo = b.readUInt32BE(i)
    const tipo = b.toString('latin1', i + 4, i + 8)
    const fin = i + 12 + largo
    if (fin > b.length) throw fallo(400, 'Una de las fotos está dañada.')
    if (!QUITAR.has(tipo)) partes.push(b.subarray(i, fin))
    i = fin
    if (tipo === 'IEND') break
  }
  return Buffer.concat(partes)
}

const carpeta = () => {
  const c = join(config.datos, 'archivos')
  mkdirSync(c, { recursive: true })
  return c
}

const rutaDe = (clave: string) => {
  if (!/^[a-z0-9]{24}$/.test(clave)) throw fallo(404, 'No existe.')
  return join(carpeta(), clave)
}

export interface ArchivoPreparado {
  clave: string
  tipo: TipoArchivo
  mime: string
  bytes: number
}

/** Comprueba, limpia y guarda un archivo subido. Devuelve lo que hay que apuntar en la base de datos. */
export async function guardarSubida(f: File, esperado: TipoArchivo): Promise<ArchivoPreparado> {
  const limite = esperado === 'foto' ? LIMITES_ARCHIVOS.bytesFoto : LIMITES_ARCHIVOS.bytesAudio
  if (f.size === 0) throw fallo(400, 'Uno de los archivos está vacío.')
  if (f.size > limite) {
    throw fallo(400, esperado === 'foto' ? 'Una foto pesa demasiado (máximo 6 MB).' : 'El audio pesa demasiado (máximo 20 MB, unos 20 minutos).')
  }
  let datos: Buffer = Buffer.from(await f.arrayBuffer())
  const tipo = detectar(datos)
  if (!tipo || tipo.tipo !== esperado) {
    throw fallo(400, esperado === 'foto' ? 'Solo se admiten fotos JPG o PNG.' : 'Ese formato de audio no se admite.')
  }
  if (tipo.mime === 'image/jpeg') datos = limpiarJpeg(datos)
  if (tipo.mime === 'image/png') datos = limpiarPng(datos)
  const clave = randomBytes(18).toString('base64url').toLowerCase().replace(/[^a-z0-9]/g, '0').slice(0, 24).padEnd(24, '0')
  writeFileSync(rutaDe(clave), datos, { flag: 'wx' })
  return { clave, tipo: tipo.tipo, mime: tipo.mime, bytes: datos.length }
}

export function borrarArchivo(clave: string) {
  try {
    rmSync(rutaDe(clave), { force: true })
  } catch {
    // Si ya no estaba, no pasa nada.
  }
}

/**
 * Sirve un archivo con soporte de rangos (Safari no reproduce audios sin ellos).
 * Nunca se ejecuta: tipo fijo, nosniff y CSP sandbox.
 */
export function servirArchivo(c: Context, a: { clave: string; mime: string }, publico: boolean) {
  const ruta = rutaDe(a.clave)
  let total: number
  try {
    total = statSync(ruta).size
  } catch {
    throw fallo(404, 'No existe.')
  }
  const cabeceras: Record<string, string> = {
    'Content-Type': a.mime,
    'Accept-Ranges': 'bytes',
    'X-Content-Type-Options': 'nosniff',
    'Content-Disposition': 'inline',
    'Cache-Control': publico ? 'public, max-age=86400' : 'private, no-store',
    'Cross-Origin-Resource-Policy': 'cross-origin',
  }
  const rango = /^bytes=(\d*)-(\d*)$/.exec(c.req.header('range') ?? '')
  if (rango && (rango[1] || rango[2])) {
    let inicio = rango[1] ? Number(rango[1]) : total - Number(rango[2])
    let fin = rango[1] && rango[2] ? Number(rango[2]) : total - 1
    inicio = Math.max(0, inicio)
    fin = Math.min(fin, total - 1)
    if (inicio > fin) return c.body(null, 416, { ...cabeceras, 'Content-Range': `bytes */${total}` })
    const flujo = Readable.toWeb(createReadStream(ruta, { start: inicio, end: fin })) as ReadableStream
    return c.body(flujo, 206, { ...cabeceras, 'Content-Range': `bytes ${inicio}-${fin}/${total}`, 'Content-Length': String(fin - inicio + 1) })
  }
  const flujo = Readable.toWeb(createReadStream(ruta)) as ReadableStream
  return c.body(flujo, 200, { ...cabeceras, 'Content-Length': String(total) })
}
