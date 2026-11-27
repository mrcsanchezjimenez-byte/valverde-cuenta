import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, test } from 'node:test'
import { bandeja, Cliente, crearDireccion, entrarDireccion, nuevoEntorno, uno, type App } from './ayudas.ts'

let app: App
beforeEach(() => {
  app = nuevoEntorno()
})

const jpegConGps = () => Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x07]), Buffer.from('JFIF\0'),
  Buffer.from([0xff, 0xe1, 0x00, 0x0c]), Buffer.from('Exif\0\0GPS!'),
  Buffer.from([0xff, 0xda, 0x00, 0x04, 0x00, 0x00, 0x12, 0x34, 0xff, 0xd9]),
])
const audioOgg = () => Buffer.concat([Buffer.from('OggS'), Buffer.alloc(200, 1)])

const TEXTO = 'Mi abuelo contaba que en esta esquina había una fragua donde se herraban los mulos de toda la comarca.'

function formulario(campos: Record<string, string> = {}, archivos: { fotos?: Buffer[]; audio?: Buffer } = {}) {
  const f = new FormData()
  const base: Record<string, string> = {
    titulo: 'La fragua de la esquina', texto: TEXTO, epoca: '1936–1960', lugarId: '', lugarTexto: 'Calle Real',
    firma: 'nombre', autor: 'Manuel', contactoNombre: 'Manuel Ruiz', contactoEmail: 'manuel@ejemplo.es', contactoTelefono: '',
    acepta_cesion: 'si', acepta_autoria: 'si', acepta_personas: 'si', acepta_edad: 'si', ...campos,
  }
  for (const [k, v] of Object.entries(base)) f.append(k, v)
  for (const b of archivos.fotos ?? []) f.append('fotos', new File([new Uint8Array(b)], 'foto.jpg', { type: 'image/jpeg' }))
  if (archivos.audio) f.append('audio', new File([new Uint8Array(archivos.audio)], 'voz.ogg', { type: 'audio/ogg' }))
  return f
}

const enviar = (f: FormData) => app.request('/api/publico/historias', { method: 'POST', body: f })

async function lugar(dir: Cliente, nombre = 'Ermita de la Trinidad') {
  await dir.pedir('POST', '/api/direccion/lugares', { nombre, descripcion: 'Ermita del siglo XVIII.', direccion: 'Calle Trinidad', lat: 37.5727, lng: -6.7567, anfitrion: 'Parroquia', activo: true })
  return (await dir.pedir('GET', '/api/direccion/lugares')).datos.find((l: { nombre: string }) => l.nombre === nombre)
}

test('una historia enviada no se ve hasta que dirección la publica', async () => {
  const dir = await entrarDireccion(app, await crearDireccion())
  const l = await lugar(dir)
  assert.equal(l.slug, 'ermita-de-la-trinidad')
  assert.match(l.urlQr, /#\/lugar\/ermita-de-la-trinidad\?qr=1$/)

  const r = await enviar(formulario({ lugarId: String(l.id) }, { fotos: [jpegConGps()], audio: audioOgg() }))
  assert.equal(r.status, 201)
  assert.ok(bandeja.some((c) => /Hemos recibido tu historia/.test(c.asunto)))
  const anon = new Cliente(app)
  assert.deepEqual((await anon.pedir('GET', '/api/publico/historias')).datos, [])

  const [pendiente] = (await dir.pedir('GET', '/api/direccion/pendientes')).datos.historias
  assert.equal(pendiente.contactoEmail, 'manuel@ejemplo.es')
  assert.deepEqual(pendiente.consentimiento.aceptados.sort(), ['autoria', 'cesion', 'edad', 'personas'])
  const foto = pendiente.archivos.find((a: { tipo: string }) => a.tipo === 'foto')
  assert.equal((await app.request(`/api/publico/archivos/${foto.clave}`)).status, 404, 'el archivo no es público aún')

  await dir.pedir('POST', `/api/direccion/historias/${pendiente.id}/publicar`, {})
  const [publica] = (await anon.pedir('GET', '/api/publico/historias')).datos
  assert.equal(publica.autor, 'Manuel')
  assert.equal(publica.lugar.slug, 'ermita-de-la-trinidad')
  for (const privado of ['contactoEmail', 'contactoNombre', 'consentimiento', 'nota']) assert.equal(publica[privado], undefined, privado)
  const fichero = await app.request(publica.archivos.find((a: { tipo: string }) => a.tipo === 'foto').url)
  assert.equal(fichero.status, 200)
  assert.ok(!Buffer.from(await fichero.arrayBuffer()).includes(Buffer.from('GPS')), 'la foto se sirve sin metadatos')
  const audio = await app.request(publica.archivos.find((a: { tipo: string }) => a.tipo === 'audio').url, { headers: { range: 'bytes=0-3' } })
  assert.equal(audio.status, 206, 'el audio admite rangos (Safari)')
  assert.equal(await audio.text(), 'OggS')
})

test('el lugar del QR cuenta los escaneos sin repetir por la misma conexión', async () => {
  const dir = await entrarDireccion(app, await crearDireccion())
  const l = await lugar(dir)
  const anon = new Cliente(app)
  const pagina = await anon.pedir('GET', `/api/publico/lugares/${l.slug}?qr=1`)
  assert.equal(pagina.estado, 200)
  assert.equal(pagina.datos.nombre, 'Ermita de la Trinidad')
  await anon.pedir('GET', `/api/publico/lugares/${l.slug}?qr=1`)
  await anon.pedir('GET', `/api/publico/lugares/${l.slug}`)
  const [conEscaneos] = (await dir.pedir('GET', '/api/direccion/lugares')).datos
  assert.equal(conEscaneos.escaneosTotal, 1)
})

test('sin todos los permisos marcados, la historia no se acepta', async () => {
  const r = await enviar(formulario({ acepta_personas: '' }))
  assert.equal(r.status, 400)
  assert.match(((await r.json()) as { error: string }).error, /casillas/)
})

test('hace falta texto o un audio', async () => {
  assert.equal((await enviar(formulario({ texto: 'Muy corto' }))).status, 400)
  assert.equal((await enviar(formulario({ texto: '' }, { audio: audioOgg() }))).status, 201)
})

test('se rechazan archivos que no son fotos ni audios', async () => {
  const r = await enviar(formulario({}, { fotos: [Buffer.from('<html><script>alert(1)</script></html>')] }))
  assert.equal(r.status, 400)
})

test('firmar con nombre exige escribirlo; si no, firma «un vecino o vecina»', async () => {
  assert.equal((await enviar(formulario({ firma: 'nombre', autor: '' }))).status, 400)
  const dir = await entrarDireccion(app, await crearDireccion())
  await enviar(formulario({ firma: 'anonimo', autor: '' }))
  const [h] = (await dir.pedir('GET', '/api/direccion/historias?estado=pendiente')).datos
  await dir.pedir('POST', `/api/direccion/historias/${h.id}/publicar`, {})
  const [publica] = (await new Cliente(app).pedir('GET', '/api/publico/historias')).datos
  assert.equal(publica.autor, 'Un vecino o vecina de Valverde')
})

test('dirección decide qué foto se publica', async () => {
  const dir = await entrarDireccion(app, await crearDireccion())
  await enviar(formulario({}, { fotos: [jpegConGps(), jpegConGps()] }))
  const [h] = (await dir.pedir('GET', '/api/direccion/historias')).datos
  const [primera, segunda] = h.archivos
  const r = await dir.pedir('PUT', `/api/direccion/historias/${h.id}`, {
    titulo: h.titulo, texto: h.texto, epoca: h.epoca, lugarId: null, lugarTexto: h.lugarTexto, firma: h.firma, autor: h.autor, nota: 'Revisada',
    archivos: [{ id: primera.id, publicar: true, pie: 'La fragua', orden: 0 }, { id: segunda.id, publicar: false, pie: '', orden: 1 }],
  })
  assert.equal(r.estado, 200)
  await dir.pedir('POST', `/api/direccion/historias/${h.id}/publicar`, {})
  const [publica] = (await new Cliente(app).pedir('GET', '/api/publico/historias')).datos
  assert.equal(publica.archivos.length, 1)
  assert.equal(publica.archivos[0].pie, 'La fragua')
  assert.equal((await app.request(`/api/publico/archivos/${segunda.clave}`)).status, 404)
})

test('borrar una historia elimina también sus archivos del disco', async () => {
  const dir = await entrarDireccion(app, await crearDireccion())
  await enviar(formulario({}, { fotos: [jpegConGps()] }))
  const [h] = (await dir.pedir('GET', '/api/direccion/historias')).datos
  const { config } = await import('../config.ts')
  const ruta = join(config.datos, 'archivos', h.archivos[0].clave)
  assert.ok(existsSync(ruta))
  await dir.pedir('POST', `/api/direccion/historias/${h.id}/publicar`, {})
  assert.equal((await dir.pedir('DELETE', `/api/direccion/historias/${h.id}`)).estado, 409, 'publicada: primero hay que retirarla')
  await dir.pedir('POST', `/api/direccion/historias/${h.id}/retirar`, { motivo: 'Lo pide quien la contó.' })
  assert.equal((await dir.pedir('DELETE', `/api/direccion/historias/${h.id}`)).estado, 200)
  assert.equal(existsSync(ruta), false)
  assert.equal(uno('SELECT 1 FROM archivos WHERE clave = ?', h.archivos[0].clave), undefined)
})

test('una entidad no puede ver las historias pendientes', async () => {
  const anon = new Cliente(app)
  assert.equal((await anon.pedir('GET', '/api/direccion/historias')).estado, 401)
})

test('el campo trampa no guarda nada', async () => {
  const dir = await entrarDireccion(app, await crearDireccion())
  assert.equal((await enviar(formulario({ web: 'http://spam.example' }))).status, 201)
  assert.deepEqual((await dir.pedir('GET', '/api/direccion/historias')).datos, [])
})
