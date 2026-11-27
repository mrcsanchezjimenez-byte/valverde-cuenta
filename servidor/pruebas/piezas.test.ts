import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cif } from './ayudas.ts'
import { cifValido, motivoCifNoGratis } from '../../compartido/cif.ts'
import { cifrarClave, comprobarClave, problemaConClave } from '../seguridad/claves.ts'
import { cifrar, descifrar } from '../seguridad/cifrado.ts'
import { base32, codigo, comprobarCodigo, desdeBase32 } from '../seguridad/totp.ts'

test('CIF: letra y control', () => {
  assert.ok(cifValido(cif('G', '2100001')))
  assert.ok(cifValido(cif('P', '2107200')))
  assert.ok(cifValido(cif('R', '2100055')))
  assert.ok(cifValido(` ${cif('g', '2100001').toLowerCase()} `), 'admite minúsculas y espacios')
  const bueno = cif('P', '2107200')
  const malo = bueno.slice(0, 8) + (bueno[8] === 'A' ? 'B' : 'A')
  assert.equal(cifValido(malo), false, 'control equivocado')
  assert.equal(cifValido('12345678Z'), false, 'un DNI no es un CIF')
})

test('CIF: empresas no publican gratis', () => {
  assert.equal(motivoCifNoGratis(cif('G', '2100001')), null)
  assert.equal(motivoCifNoGratis(cif('P', '2107200')), null)
  assert.match(motivoCifNoGratis(cif('B', '2112345'))!, /empresa/)
  assert.match(motivoCifNoGratis('G0000000X')!, /no es válido/)
})

test('Doble factor: vector oficial RFC 6238', () => {
  const secreto = base32(Buffer.from('12345678901234567890'))
  assert.equal(secreto, 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ')
  assert.deepEqual(desdeBase32(secreto), Buffer.from('12345678901234567890'))
  assert.equal(codigo(secreto, 1), '287082')
  assert.equal(codigo(secreto, Math.floor(1111111109 / 30)), '081804')
})

test('Doble factor: no se reutiliza un código', () => {
  const secreto = base32(Buffer.from('12345678901234567890'))
  const ms = 59_000
  assert.equal(comprobarCodigo(secreto, '287082', 0, ms), 1)
  assert.equal(comprobarCodigo(secreto, '287082', 1, ms), null)
  assert.equal(comprobarCodigo(secreto, 'abcdef', 0, ms), null)
})

test('Contraseñas: se comprueban y no se guardan en claro', async () => {
  const h = await cifrarClave('una clave larga de pruebas')
  assert.ok(!h.includes('una clave'))
  assert.ok(await comprobarClave('una clave larga de pruebas', h))
  assert.equal(await comprobarClave('otra clave larga distinta', h), false)
  assert.notEqual(h, await cifrarClave('una clave larga de pruebas'), 'cada una con su sal')
})

test('Contraseñas: reglas mínimas', () => {
  assert.ok(problemaConClave('corta'))
  assert.ok(problemaConClave('aaaaaaaaaaaaaaa'))
  assert.ok(problemaConClave('pilar.martinez.2026', 'pilar.martinez@ejemplo.es'))
  assert.equal(problemaConClave('caballo grapa batería'), null)
})

test('Cifrado de secretos: ida y vuelta, y detecta manipulación', () => {
  const c = cifrar('SECRETO')
  assert.equal(descifrar(c), 'SECRETO')
  const partes = c.split(':')
  partes[3] = Buffer.from('OTRA COSA').toString('base64')
  assert.throws(() => descifrar(partes.join(':')))
})
