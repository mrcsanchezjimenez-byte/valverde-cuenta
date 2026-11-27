import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'
import { bandeja, Cliente, crearDireccion, crearEntidad, entrarDireccion, eventoValido, nuevoEntorno, type App } from './ayudas.ts'

let app: App
beforeEach(() => {
  app = nuevoEntorno()
})

const jpeg = () => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x07]), Buffer.from('JFIF\0'), Buffer.from([0xff, 0xda, 0x00, 0x04, 0x00, 0x00, 0x12, 0x34, 0xff, 0xd9])])

async function subir(cli: Cliente) {
  const form = new FormData()
  form.append('imagen', new File([new Uint8Array(jpeg())], 'foto.jpg', { type: 'image/jpeg' }))
  const r = await app.request('/api/imagenes', { method: 'POST', body: form, headers: { 'x-vc': '1', cookie: cli.cookie } })
  return (await r.json()) as { clave: string; url: string }
}

async function eventoPublicado() {
  const dir = await entrarDireccion(app, await crearDireccion())
  const ent = await crearEntidad(app, { verificar: dir })
  const { datos } = await ent.cli.pedir('POST', '/api/entidad/eventos', { evento: eventoValido(), enviar: true, declaracion: true })
  await dir.pedir('POST', `/api/direccion/eventos/${datos.id}/aprobar`, {})
  return { dir, ent, id: datos.id as number }
}

test('las fotos de un evento no se ven hasta que dirección las aprueba', async () => {
  const { dir, ent, id } = await eventoPublicado()
  const img = await subir(ent.cli)
  const alta = await ent.cli.pedir('POST', `/api/entidad/eventos/${id}/fotos`, { imagen: img.clave, pie: 'La plaza llena' })
  assert.equal(alta.estado, 201)
  const anon = new Cliente(app)
  assert.equal((await anon.pedir('GET', '/api/publico/eventos')).datos[0].fotos, undefined)
  assert.equal((await app.request(img.url)).status, 404, 'la imagen aún no es pública')

  const pendientes = (await dir.pedir('GET', '/api/direccion/pendientes')).datos.fotos
  assert.equal(pendientes.length, 1)
  assert.equal(pendientes[0].fotos[0].pie, 'La plaza llena')

  const r = await dir.pedir('POST', '/api/direccion/fotos/revisar', { aprobar: [alta.datos.id], rechazar: [] })
  assert.equal(r.datos.avisado, 'Peña Cultural El Boto')
  assert.match(bandeja.at(-1)!.texto, /Se ha publicado 1 foto/)
  const [publico] = (await anon.pedir('GET', '/api/publico/eventos')).datos
  assert.deepEqual(publico.fotos, [{ url: img.url, pie: 'La plaza llena' }])
  assert.equal((await app.request(img.url)).status, 200)
})

test('una foto rechazada no se publica', async () => {
  const { dir, ent, id } = await eventoPublicado()
  const img = await subir(ent.cli)
  const alta = await ent.cli.pedir('POST', `/api/entidad/eventos/${id}/fotos`, { imagen: img.clave, pie: '' })
  await dir.pedir('POST', '/api/direccion/fotos/revisar', { aprobar: [], rechazar: [alta.datos.id] })
  assert.equal((await new Cliente(app).pedir('GET', '/api/publico/eventos')).datos[0].fotos, undefined)
  assert.equal((await app.request(img.url)).status, 404)
})

test('una entidad no puede poner fotos en eventos de otra ni con imágenes ajenas', async () => {
  const { dir, ent, id } = await eventoPublicado()
  const otra = await crearEntidad(app, { verificar: dir, email: 'otra@ejemplo.es', cifSiete: '2100002' })
  const suya = await subir(otra.cli)
  assert.equal((await otra.cli.pedir('POST', `/api/entidad/eventos/${id}/fotos`, { imagen: suya.clave, pie: '' })).estado, 404)
  assert.equal((await ent.cli.pedir('POST', `/api/entidad/eventos/${id}/fotos`, { imagen: suya.clave, pie: '' })).estado, 400)
})

test('no se añaden fotos a un evento que aún no está publicado', async () => {
  const dir = await entrarDireccion(app, await crearDireccion())
  const ent = await crearEntidad(app, { verificar: dir })
  const { datos } = await ent.cli.pedir('POST', '/api/entidad/eventos', { evento: eventoValido(), enviar: true, declaracion: true })
  const img = await subir(ent.cli)
  assert.equal((await ent.cli.pedir('POST', `/api/entidad/eventos/${datos.id}/fotos`, { imagen: img.clave, pie: '' })).estado, 409)
})
