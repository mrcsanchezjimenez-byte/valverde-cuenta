import { createHash, randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto'

/**
 * Contraseñas con scrypt (incluido en Node, sin dependencias). Cada contraseña lleva su sal y
 * sus parámetros, así se pueden endurecer más adelante sin invalidar las que ya existen.
 */
const PARAMETROS = { N: 2 ** 15, r: 8, p: 1 }
const LONGITUD = 32
const MEMORIA = 64 * 1024 * 1024

function derivar(clave: string, sal: Buffer, opciones: ScryptOptions) {
  return new Promise<Buffer>((ok, mal) =>
    scrypt(clave.normalize('NFKC'), sal, LONGITUD, { ...opciones, maxmem: MEMORIA }, (e, r) => (e ? mal(e) : ok(r))),
  )
}

export async function cifrarClave(clave: string) {
  const sal = randomBytes(16)
  const hash = await derivar(clave, sal, PARAMETROS)
  const { N, r, p } = PARAMETROS
  return `scrypt$${N}$${r}$${p}$${sal.toString('base64')}$${hash.toString('base64')}`
}

export async function comprobarClave(clave: string, guardado: string) {
  const [alg, N, r, p, sal, hash] = guardado.split('$')
  if (alg !== 'scrypt') return false
  const esperado = Buffer.from(hash, 'base64')
  const calculado = await derivar(clave, Buffer.from(sal, 'base64'), { N: Number(N), r: Number(r), p: Number(p) })
  return calculado.length === esperado.length && timingSafeEqual(calculado, esperado)
}

/** Para que entrar con un correo que no existe tarde lo mismo que con uno que sí. */
let falso: Promise<string> | null = null
export const hashFalso = () => (falso ??= cifrarClave(randomBytes(16).toString('hex')))

export const MIN_CLAVE = 12

/** Comprobaciones básicas; el mensaje se enseña tal cual a la persona. */
export function problemaConClave(clave: string, email = ''): string | null {
  if (clave.length < MIN_CLAVE) return `La contraseña debe tener al menos ${MIN_CLAVE} caracteres.`
  if (clave.length > 200) return 'La contraseña es demasiado larga.'
  const baja = clave.toLowerCase()
  if (new Set(baja).size < 5) return 'La contraseña repite demasiado los mismos caracteres.'
  const usuario = email.split('@')[0]?.toLowerCase()
  if (usuario && usuario.length >= 4 && baja.includes(usuario)) return 'La contraseña no puede contener tu correo.'
  if (/^(123456|qwerty|password|contrase|valverde)/.test(baja)) return 'Esa contraseña es demasiado fácil de adivinar.'
  return null
}

/** Ficha aleatoria para sesiones y enlaces por correo. En la base de datos solo se guarda su huella. */
export const fichaAleatoria = () => randomBytes(32).toString('base64url')
export const huella = (ficha: string) => createHash('sha256').update(ficha).digest('hex')
