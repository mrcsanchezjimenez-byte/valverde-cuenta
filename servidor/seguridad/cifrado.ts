import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { config } from '../config.ts'

/**
 * Cifrado de secretos guardados (los de doble factor). Si alguien se llevara una copia de la
 * base de datos sin la clave del servidor, no podría generar códigos.
 */
export function cifrar(texto: string) {
  const iv = randomBytes(12)
  const c = createCipheriv('aes-256-gcm', config.clave(), iv)
  const datos = Buffer.concat([c.update(texto, 'utf8'), c.final()])
  return ['v1', iv.toString('base64'), c.getAuthTag().toString('base64'), datos.toString('base64')].join(':')
}

export function descifrar(guardado: string) {
  const [v, iv, etiqueta, datos] = guardado.split(':')
  if (v !== 'v1') throw new Error('Formato de cifrado desconocido')
  const d = createDecipheriv('aes-256-gcm', config.clave(), Buffer.from(iv, 'base64'))
  d.setAuthTag(Buffer.from(etiqueta, 'base64'))
  return Buffer.concat([d.update(Buffer.from(datos, 'base64')), d.final()]).toString('utf8')
}
