import { createHmac, randomBytes } from 'node:crypto'

/**
 * Códigos de 6 cifras que cambian cada 30 segundos (RFC 6238), compatibles con
 * Google Authenticator, Microsoft Authenticator, 1Password, etc.
 */
const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function base32(buf: Buffer) {
  let bits = 0
  let valor = 0
  let salida = ''
  for (const byte of buf) {
    valor = (valor << 8) | byte
    bits += 8
    while (bits >= 5) {
      salida += ALFABETO[(valor >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) salida += ALFABETO[(valor << (5 - bits)) & 31]
  return salida
}

export function desdeBase32(texto: string) {
  const limpio = texto.toUpperCase().replace(/=+$/, '')
  let bits = 0
  let valor = 0
  const bytes: number[] = []
  for (const letra of limpio) {
    const i = ALFABETO.indexOf(letra)
    if (i < 0) throw new Error('base32 no válido')
    valor = (valor << 5) | i
    bits += 5
    if (bits >= 8) {
      bytes.push((valor >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return Buffer.from(bytes)
}

export const nuevoSecreto = () => base32(randomBytes(20))

export function codigo(secreto: string, paso: number) {
  const contador = Buffer.alloc(8)
  contador.writeBigUInt64BE(BigInt(paso))
  const hmac = createHmac('sha1', desdeBase32(secreto)).update(contador).digest()
  const desplazamiento = hmac[hmac.length - 1] & 15
  const numero = (hmac.readUInt32BE(desplazamiento) & 0x7fffffff) % 1_000_000
  return String(numero).padStart(6, '0')
}

export const pasoActual = (ms = Date.now()) => Math.floor(ms / 30_000)

/**
 * Devuelve el paso usado si el código es bueno (admite el anterior y el siguiente por desfase
 * de reloj), o null. Un código ya usado no vale otra vez: así no sirve si alguien lo ve por encima del hombro.
 */
export function comprobarCodigo(secreto: string, entrada: string, ultimoPaso: number, ms = Date.now()): number | null {
  const limpio = entrada.replace(/\s/g, '')
  if (!/^\d{6}$/.test(limpio)) return null
  const ahora = pasoActual(ms)
  for (const paso of [ahora - 1, ahora, ahora + 1]) {
    if (paso > ultimoPaso && codigo(secreto, paso) === limpio) return paso
  }
  return null
}

export const uriAlta = (secreto: string, email: string) =>
  `otpauth://totp/${encodeURIComponent(`Valverde Cuenta:${email}`)}?secret=${secreto}&issuer=${encodeURIComponent('Valverde Cuenta')}&algorithm=SHA1&digits=6&period=30`
