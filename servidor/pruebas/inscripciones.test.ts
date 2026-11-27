import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'
import { bandeja, Cliente, crearDireccion, crearEntidad, entrarDireccion, eventoValido, nuevoEntorno, type App } from './ayudas.ts'

let app: App
beforeEach(() => {
  app = nuevoEntorno()
})

/** Una entidad con un evento publicado que pide inscripción. */
async function eventoConPlazas(plazas: number | null, hasta: string | null = null) {
  const dir = await entrarDireccion(app, await crearDireccion())
  const ent = await crearEntidad(app, { verificar: dir })
  const { datos } = await ent.cli.pedir('POST', '/api/entidad/eventos', {
    evento: eventoValido({ inscripcion: { plazas, hasta } }), enviar: true, declaracion: true,
  })
  await dir.pedir('POST', `/api/direccion/eventos/${datos.id}/aprobar`, {})
  const [publico] = (await new Cliente(app).pedir('GET', '/api/publico/eventos')).datos
  return { dir, ent, id: datos.id as number, slug: publico.id as string, publico }
}

const apuntar = (slug: string, cambios: Record<string, unknown> = {}) => new Cliente(app).pedir('POST', `/api/publico/eventos/${slug}/inscripciones`, {
  nombre: 'Carmen López', email: '', telefono: '600111222', personas: 1, acepta: true, ...cambios,
})

test('el evento público dice cuántas plazas quedan', async () => {
  const { publico } = await eventoConPlazas(10)
  assert.deepEqual(publico.inscripcion, { plazas: 10, libres: 10, hasta: null, abierta: true })
})

test('plazas, lista de espera y subida automática al cancelar', async () => {
  const { slug, ent, id } = await eventoConPlazas(3)
  const a = await apuntar(slug, { personas: 2, telefono: '600000001', email: 'carmen@ejemplo.es' })
  assert.equal(a.estado, 201)
  assert.equal(a.datos.estado, 'confirmada')
  assert.match(bandeja.at(-1)!.asunto, /Plaza confirmada/)
  const b = await apuntar(slug, { personas: 2, telefono: '600000002', email: 'antonio@ejemplo.es' })
  assert.equal(b.datos.estado, 'espera', 'solo queda 1 plaza y pide 2')
  assert.equal(b.datos.posicion, 1)

  const [publico] = (await new Cliente(app).pedir('GET', '/api/publico/eventos')).datos
  assert.equal(publico.inscripcion.libres, 1)

  const cancelada = await new Cliente(app).pedir('POST', `/api/publico/inscripciones/${a.datos.codigo}/cancelar`, {})
  assert.equal(cancelada.datos.estado, 'cancelada')
  const mia = await new Cliente(app).pedir('GET', `/api/publico/inscripciones/${b.datos.codigo}`)
  assert.equal(mia.datos.estado, 'confirmada', 'la de la lista de espera sube sola')
  assert.match(bandeja.at(-1)!.asunto, /Tienes plaza/)

  const lista = (await ent.cli.pedir('GET', `/api/entidad/eventos/${id}/inscripciones`)).datos
  assert.equal(lista.confirmadas, 2)
  assert.equal(lista.plazas, 3)
})

test('no se puede apuntar dos veces con el mismo teléfono', async () => {
  const { slug } = await eventoConPlazas(null)
  assert.equal((await apuntar(slug, { telefono: '600 11 12 22' })).estado, 201)
  assert.equal((await apuntar(slug, { telefono: '600111222' })).estado, 409)
})

test('hace falta un teléfono o un correo y aceptar el aviso', async () => {
  const { slug } = await eventoConPlazas(null)
  assert.equal((await apuntar(slug, { telefono: '', email: '' })).estado, 400)
  assert.equal((await apuntar(slug, { acepta: false })).estado, 400)
  assert.equal((await apuntar(slug, { personas: 30 })).estado, 400)
})

test('el campo trampa engaña a los robots sin guardar nada', async () => {
  const { slug, ent, id } = await eventoConPlazas(null)
  await apuntar(slug, { web: 'http://spam.example' })
  assert.equal((await ent.cli.pedir('GET', `/api/entidad/eventos/${id}/inscripciones`)).datos.lista.length, 0)
})

test('la inscripción se cierra en su fecha límite', async () => {
  const hoy = new Date(Date.now() + 2 * 86400_000).toISOString().slice(0, 10)
  const dir = await entrarDireccion(app, await crearDireccion())
  const ent = await crearEntidad(app, { verificar: dir })
  // Cierre en el pasado: el evento se acepta (es antes del inicio) pero ya no admite gente.
  const ayer = new Date(Date.now() - 86400_000).toISOString().slice(0, 16)
  const { datos } = await ent.cli.pedir('POST', '/api/entidad/eventos', {
    evento: eventoValido({ inicio: `${hoy}T19:00`, fin: `${hoy}T21:00`, inscripcion: { plazas: 5, hasta: ayer } }), enviar: true, declaracion: true,
  })
  await dir.pedir('POST', `/api/direccion/eventos/${datos.id}/aprobar`, {})
  const [publico] = (await new Cliente(app).pedir('GET', '/api/publico/eventos')).datos
  assert.equal(publico.inscripcion.abierta, false)
  assert.equal((await apuntar(publico.id)).estado, 409)
})

test('no se admite un cierre de inscripción posterior al inicio', async () => {
  const dir = await entrarDireccion(app, await crearDireccion())
  const ent = await crearEntidad(app, { verificar: dir })
  const e = eventoValido()
  const r = await ent.cli.pedir('POST', '/api/entidad/eventos', {
    evento: { ...e, inscripcion: { plazas: 5, hasta: e.fin } }, enviar: true, declaracion: true,
  })
  assert.equal(r.estado, 400)
})

test('una entidad no ve los inscritos de otra', async () => {
  const { id, dir } = await eventoConPlazas(10)
  const otra = await crearEntidad(app, { verificar: dir, email: 'otra@ejemplo.es', cifSiete: '2100002' })
  assert.equal((await otra.cli.pedir('GET', `/api/entidad/eventos/${id}/inscripciones`)).estado, 404)
  assert.equal((await new Cliente(app).pedir('GET', `/api/entidad/eventos/${id}/inscripciones`)).estado, 401)
})

test('si se cancela el evento, se avisa a quien estaba apuntado', async () => {
  const { slug, ent, id } = await eventoConPlazas(10)
  await apuntar(slug, { email: 'pepa@ejemplo.es' })
  await ent.cli.pedir('POST', `/api/entidad/eventos/${id}/cancelar`, {})
  assert.ok(bandeja.some((c) => c.para === 'pepa@ejemplo.es' && /cancelado/i.test(c.asunto)))
})

test('apuntarse desde otra web funciona (es público), pero solo en JSON', async () => {
  const { slug } = await eventoConPlazas(null)
  const r = await app.request(`/api/publico/eventos/${slug}/inscripciones`, {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', origin: 'https://otra.example' }, body: 'nombre=a',
  })
  assert.equal(r.status, 403)
  const ok = await apuntar(slug, {})
  assert.equal(ok.estado, 201)
})
