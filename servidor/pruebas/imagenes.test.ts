import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'
import { Cliente, crearDireccion, crearEntidad, entrarDireccion, eventoValido, nuevoEntorno, type App } from './ayudas.ts'
import { detectar, limpiarJpeg } from '../archivos.ts'

let app: App
beforeEach(() => {
  app = nuevoEntorno()
})

/** JPEG mínimo con un bloque EXIF que dice «GPS»: el servidor tiene que quitarlo. */
const jpegConGps = () => Buffer.concat([
  Buffer.from([0xff, 0xd8]),
  Buffer.from([0xff, 0xe0, 0x00, 0x07]), Buffer.from('JFIF\0'),
  Buffer.from([0xff, 0xe1, 0x00, 0x0c]), Buffer.from('Exif\0\0GPS!'),
  Buffer.from([0xff, 0xda, 0x00, 0x04, 0x00, 0x00, 0x12, 0x34, 0xff, 0xd9]),
])

async function subir(cli: Cliente, datos: Buffer, nombre = 'cartel.jpg') {
  const form = new FormData()
  form.append('imagen', new File([new Uint8Array(datos)], nombre, { type: 'image/jpeg' }))
  const r = await app.request('/api/imagenes', { method: 'POST', body: form, headers: { 'x-vc': '1', cookie: cli.cookie } })
  return { estado: r.status, datos: await r.json() as { clave: string; url: string; error?: string } }
}

test('quita los metadatos (EXIF, GPS) de las fotos', () => {
  const limpio = limpiarJpeg(jpegConGps())
  assert.ok(!limpio.includes(Buffer.from('GPS')))
  assert.ok(limpio.includes(Buffer.from('JFIF')))
  assert.equal(detectar(limpio)?.mime, 'image/jpeg')
})

test('rechaza archivos que no son imágenes aunque digan serlo', async () => {
  const dir = await entrarDireccion(app, await crearDireccion())
  const { cli } = await crearEntidad(app, { verificar: dir })
  const r = await subir(cli, Buffer.from('<script>alert(1)</script>'), 'trampa.jpg')
  assert.equal(r.estado, 400)
})

test('sin sesión no se suben imágenes', async () => {
  const r = await subir(new Cliente(app), jpegConGps())
  assert.equal(r.estado, 401)
})

test('el cartel no es público hasta que el evento se publica', async () => {
  const dir = await entrarDireccion(app, await crearDireccion())
  const { cli } = await crearEntidad(app, { verificar: dir })
  const { datos: img } = await subir(cli, jpegConGps())
  const anon = new Cliente(app)
  assert.equal((await app.request(img.url)).status, 404, 'nadie la ve aún')
  assert.equal((await cli.pedir('GET', img.url)).estado, 200, 'la entidad sí')

  const { datos } = await cli.pedir('POST', '/api/entidad/eventos', { evento: eventoValido({ imagen: img.clave }), enviar: true, declaracion: true })
  assert.equal((await dir.pedir('GET', img.url)).estado, 200, 'dirección la ve para revisar')
  await dir.pedir('POST', `/api/direccion/eventos/${datos.id}/aprobar`, {})
  const r = await app.request(img.url)
  assert.equal(r.status, 200)
  assert.equal(r.headers.get('content-type'), 'image/jpeg')
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff')
  const [publico] = (await anon.pedir('GET', '/api/publico/eventos')).datos
  assert.equal(publico.imagen, img.url)
})

test('una entidad no puede usar la imagen de otra', async () => {
  const dir = await entrarDireccion(app, await crearDireccion())
  const a = await crearEntidad(app, { verificar: dir })
  const b = await crearEntidad(app, { verificar: dir, email: 'otra@ejemplo.es', cifSiete: '2100002' })
  const { datos: img } = await subir(a.cli, jpegConGps())
  const r = await b.cli.pedir('POST', '/api/entidad/eventos', { evento: eventoValido({ imagen: img.clave }), enviar: false, declaracion: false })
  assert.equal(r.estado, 400)
  assert.equal((await b.cli.pedir('GET', img.url)).estado, 404)
})

test('al publicar o no publicar, la entidad recibe un aviso en su panel', async () => {
  const dir = await entrarDireccion(app, await crearDireccion())
  const { cli } = await crearEntidad(app, { verificar: dir })
  const uno = await cli.pedir('POST', '/api/entidad/eventos', { evento: eventoValido(), enviar: true, declaracion: true })
  const dos = await cli.pedir('POST', '/api/entidad/eventos', { evento: eventoValido({ titulo: 'Otro evento' }), enviar: true, declaracion: true })
  const publicar = await dir.pedir('POST', `/api/direccion/eventos/${uno.datos.id}/aprobar`, {})
  assert.equal(publicar.datos.avisado, 'Peña Cultural El Boto')
  await dir.pedir('POST', `/api/direccion/eventos/${dos.datos.id}/rechazar`, { motivo: 'Falta el lugar exacto.' })
  const avisos = (await cli.pedir('GET', '/api/entidad/avisos')).datos
  assert.deepEqual(avisos.slice(0, 2).map((a: { tipo: string }) => a.tipo), ['mal', 'bien'])
  assert.match(avisos[0].texto, /Falta el lugar exacto/)
  await cli.pedir('POST', '/api/entidad/avisos/leidos', {})
  assert.ok((await cli.pedir('GET', '/api/entidad/avisos')).datos.every((a: { leido: boolean }) => a.leido))
})
