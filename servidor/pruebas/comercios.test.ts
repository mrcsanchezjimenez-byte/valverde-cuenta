import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'
import { documentoComercioValido, nifPersonaValido } from '../../compartido/cif.ts'
import { bandeja, CLAVE, Cliente, crearDireccion, entrarDireccion, nuevoEntorno, uno, type App } from './ayudas.ts'

let app: App
beforeEach(() => {
  app = nuevoEntorno()
})

const dia = (n: number) => new Date(Date.now() + n * 86400_000).toISOString().slice(0, 10)

const ficha = (cambios: Record<string, unknown> = {}) => ({
  nombre: 'Botos El Andévalo', categoria: 'calzado', descripcion: 'Botos hechos a mano desde 1950.', direccion: 'Calle Real, 10',
  municipioId: 1, lat: 37.5745, lng: -6.752, telefono: '959000000', whatsapp: '600000000', emailPublico: 'tienda@ejemplo.es',
  web: 'https://ejemplo.es', instagram: '', facebook: '', horario: 'L-S 10-14 y 17-20', logo: null, fotos: [], ...cambios,
})

/** Dirección da de alta un comercio con cuenta; devuelve también la sesión del comercio. */
async function comercioConCuenta() {
  const dir = await entrarDireccion(app, await crearDireccion())
  const r = await dir.pedir('POST', '/api/direccion/comercios', {
    ficha: ficha(), nif: '12345678Z', personaContacto: 'Ana', telefonoContacto: '', emailCuenta: 'ana@ejemplo.es',
  })
  assert.equal(r.estado, 201, JSON.stringify(r.datos))
  const token = bandeja.at(-1)!.texto.match(/restablecer\?t=([\w-]+)/)![1]
  await new Cliente(app).pedir('POST', '/api/cuenta/restablecer', { token, clave: CLAVE })
  const cli = new Cliente(app)
  const entrar = await cli.pedir('POST', '/api/cuenta/entrar', { email: 'ana@ejemplo.es', clave: CLAVE })
  assert.equal(entrar.datos.falta, null, 'un comercio entra sin doble factor si no lo ha activado')
  return { dir, cli, id: r.datos.id as number }
}

const plan = (dir: Cliente, id: number, cambios: Record<string, unknown> = {}) => dir.pedir('POST', `/api/direccion/comercios/${id}/planes`, {
  tipo: 'escaparate', campanaId: null, desde: dia(-1), hasta: dia(30), importe: 15, estadoPago: 'pagado', metodo: 'Bizum', factura: 'F-1', nota: '', ...cambios,
})

test('DNI, NIE y CIF de los comercios', () => {
  assert.ok(nifPersonaValido('12345678Z'))
  assert.ok(nifPersonaValido('X1234567L'))
  assert.equal(nifPersonaValido('12345678A'), false)
  assert.ok(documentoComercioValido('B21123454') || documentoComercioValido('12345678Z'))
  assert.equal(documentoComercioValido('hola'), false)
})

test('sin plan solo se ve la ficha básica; con Escaparate, todo', async () => {
  const { dir, id } = await comercioConCuenta()
  const anon = new Cliente(app)
  const [basica] = (await anon.pedir('GET', '/api/publico/comercios')).datos
  assert.equal(basica.nivel, 'basica')
  assert.equal(basica.telefono, '959000000')
  for (const deEscaparate of ['descripcion', 'web', 'whatsapp', 'emailPublico']) assert.equal(basica[deEscaparate], undefined, deEscaparate)

  assert.equal((await plan(dir, id)).estado, 201)
  const [conPlan] = (await anon.pedir('GET', '/api/publico/comercios')).datos
  assert.equal(conPlan.nivel, 'escaparate')
  assert.equal(conPlan.web, 'https://ejemplo.es')
})

test('un plan caducado o anulado deja de contar', async () => {
  const { dir, id } = await comercioConCuenta()
  await plan(dir, id, { desde: dia(-60), hasta: dia(-1) })
  assert.equal((await new Cliente(app).pedir('GET', '/api/publico/comercios')).datos[0].nivel, 'basica')
  const { datos } = await plan(dir, id, { tipo: 'destacado', importe: 35 })
  assert.equal((await new Cliente(app).pedir('GET', '/api/publico/patrocinados')).datos.length, 1)
  await dir.pedir('PUT', `/api/direccion/planes/${datos.id}`, {
    tipo: 'destacado', campanaId: null, desde: dia(-1), hasta: dia(30), importe: 35, estadoPago: 'anulado', metodo: '', factura: '', nota: 'No pagó',
  })
  assert.equal((await new Cliente(app).pedir('GET', '/api/publico/patrocinados')).datos.length, 0)
})

test('las ofertas necesitan plan y aprobación de dirección', async () => {
  const { dir, cli, id } = await comercioConCuenta()
  const oferta = { titulo: '20 % en botos de niño', texto: 'Hasta fin de mes.', imagen: null, desde: dia(0), hasta: dia(20), campanaId: null }
  assert.equal((await cli.pedir('POST', '/api/comercio/ofertas', oferta)).estado, 403, 'sin plan no hay ofertas')
  await plan(dir, id)
  const r = await cli.pedir('POST', '/api/comercio/ofertas', oferta)
  assert.equal(r.estado, 201)
  const anon = new Cliente(app)
  assert.equal((await anon.pedir('GET', '/api/publico/comercios')).datos[0].ofertas.length, 0, 'no se ve hasta aprobarla')
  assert.equal((await dir.pedir('GET', '/api/direccion/pendientes')).datos.ofertas.length, 1)
  const aprobada = await dir.pedir('POST', `/api/direccion/ofertas/${r.datos.id}/aprobar`, {})
  assert.equal(aprobada.datos.avisado, 'Botos El Andévalo')
  const [publico] = (await anon.pedir('GET', '/api/publico/comercios')).datos
  assert.equal(publico.ofertas[0].titulo, '20 % en botos de niño')
  const avisos = (await cli.pedir('GET', '/api/comercio/avisos')).datos
  assert.equal(avisos[0].titulo, 'Oferta publicada')
})

test('la campaña enseña sus comercios y ofertas', async () => {
  const { dir, cli, id } = await comercioConCuenta()
  const { datos } = await dir.pedir('POST', '/api/direccion/campanas', { nombre: 'Feria', descripcion: 'Ofertas de feria', desde: dia(-1), hasta: dia(5), activa: true })
  const campana = (await dir.pedir('GET', '/api/direccion/campanas')).datos.find((x: { slug: string }) => x.slug === datos.slug)
  // La campaña de Navidad de la migración podría coincidir con la fecha: se desactiva para la prueba.
  for (const x of (await dir.pedir('GET', '/api/direccion/campanas')).datos.filter((y: { slug: string }) => y.slug !== datos.slug)) {
    await dir.pedir('PUT', `/api/direccion/campanas/${x.id}`, { nombre: x.nombre, descripcion: x.descripcion, desde: x.desde, hasta: x.hasta, activa: false })
  }
  await plan(dir, id, { tipo: 'campana', campanaId: campana.id, desde: dia(-1), hasta: dia(5), importe: 30 })
  const o = await cli.pedir('POST', '/api/comercio/ofertas', { titulo: 'Oferta de feria', texto: '', imagen: null, desde: dia(0), hasta: dia(5), campanaId: campana.id })
  await dir.pedir('POST', `/api/direccion/ofertas/${o.datos.id}/aprobar`, {})
  const actual = (await new Cliente(app).pedir('GET', '/api/publico/campana')).datos
  assert.equal(actual.nombre, 'Feria')
  assert.equal(actual.comercios[0].nombre, 'Botos El Andévalo')
  assert.equal(actual.ofertas[0].titulo, 'Oferta de feria')
})

test('los cambios de la ficha esperan a dirección', async () => {
  const { dir, cli, id } = await comercioConCuenta()
  const r = await cli.pedir('PUT', '/api/comercio/ficha', ficha({ horario: 'L-V 9-14' }))
  assert.equal(r.datos.revision, true)
  assert.equal((await new Cliente(app).pedir('GET', '/api/publico/comercios')).datos[0].horario, 'L-S 10-14 y 17-20')
  await dir.pedir('POST', `/api/direccion/comercios/${id}/aprobar-cambios`, {})
  assert.equal((await new Cliente(app).pedir('GET', '/api/publico/comercios')).datos[0].horario, 'L-V 9-14')
})

test('alta de un comercio desde la web: correo, verificación y ficha básica', async () => {
  const dir = await entrarDireccion(app, await crearDireccion())
  const r = await new Cliente(app).pedir('POST', '/api/cuenta/alta-comercio', {
    nombre: 'Panadería La Espiga', categoria: 'alimentacion', nif: 'X1234567L', direccion: 'Plaza de España, 2', municipioId: 1,
    telefono: '600111222', personaContacto: 'Luis Gómez', email: 'luis@ejemplo.es', clave: CLAVE, aceptaCondiciones: true,
  })
  assert.equal(r.estado, 200, JSON.stringify(r.datos))
  assert.deepEqual((await new Cliente(app).pedir('GET', '/api/publico/comercios')).datos, [], 'pendiente: no sale aún')
  const token = bandeja.find((c) => c.para === 'luis@ejemplo.es')!.texto.match(/verificar\?t=([\w-]+)/)![1]
  await new Cliente(app).pedir('POST', '/api/cuenta/verificar', { token })
  const [pendiente] = (await dir.pedir('GET', '/api/direccion/pendientes')).datos.comercios
  assert.equal(pendiente.nombre, 'Panadería La Espiga')
  await dir.pedir('POST', `/api/direccion/comercios/${pendiente.id}/verificar`, {})
  assert.equal((await new Cliente(app).pedir('GET', '/api/publico/comercios')).datos[0].nombre, 'Panadería La Espiga')
})

test('un comercio no toca lo de otro ni entra en dirección', async () => {
  const { dir, cli } = await comercioConCuenta()
  const otro = await dir.pedir('POST', '/api/direccion/comercios', { ficha: ficha({ nombre: 'Otro comercio' }), nif: '', personaContacto: '', telefonoContacto: '', emailCuenta: '' })
  await plan(dir, otro.datos.id)
  const ofertaAjena = uno<{ id: number }>('SELECT id FROM comercios WHERE id = ?', otro.datos.id)
  assert.ok(ofertaAjena)
  assert.equal((await cli.pedir('GET', '/api/direccion/comercios')).estado, 403)
  assert.equal((await cli.pedir('DELETE', '/api/comercio/ofertas/999')).estado, 404)
  assert.equal((await cli.pedir('GET', '/api/entidad/eventos')).estado, 403)
})

test('las visitas a la ficha se cuentan sin repetir por conexión', async () => {
  const { dir, id } = await comercioConCuenta()
  const anon = new Cliente(app)
  await anon.pedir('GET', '/api/publico/comercios/botos-el-andevalo')
  await anon.pedir('GET', '/api/publico/comercios/botos-el-andevalo')
  assert.equal((await dir.pedir('GET', `/api/direccion/comercios/${id}`)).datos.visitas30, 1)
})

test('resumen de cobros', async () => {
  const { dir, id } = await comercioConCuenta()
  await plan(dir, id)
  await plan(dir, id, { tipo: 'promocion', importe: 10, estadoPago: 'pendiente', desde: dia(0), hasta: dia(7) })
  const r = (await dir.pedir('GET', '/api/direccion/cobros')).datos
  assert.equal(r.cobradoMes, 15)
  assert.equal(r.pendiente, 10)
  assert.equal(r.planes.length, 2)
})
