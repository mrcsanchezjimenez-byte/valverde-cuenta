import assert from 'node:assert/strict'
import { beforeEach, describe, test } from 'node:test'
import {
  bandeja, cif, CLAVE, Cliente, codigo, crearDireccion, crearEntidad, ejecutar, entrarDireccion, eventoValido, nuevoEntorno,
  pasoActual, uno, type App,
} from './ayudas.ts'

let app: App
beforeEach(() => {
  app = nuevoEntorno()
})

describe('Agenda pública', () => {
  test('solo enseña lo publicado y sin datos internos', async () => {
    const secreto = await crearDireccion()
    const dir = await entrarDireccion(app, secreto)
    const { cli } = await crearEntidad(app, { verificar: dir })

    const enviado = await cli.pedir('POST', '/api/entidad/eventos', { evento: eventoValido(), enviar: true, declaracion: true })
    assert.equal(enviado.estado, 201)
    const borrador = await cli.pedir('POST', '/api/entidad/eventos', { evento: eventoValido({ titulo: 'Borrador' }), enviar: false, declaracion: false })
    assert.equal(borrador.estado, 201)

    const anon = new Cliente(app)
    assert.deepEqual((await anon.pedir('GET', '/api/publico/eventos')).datos, [], 'nada publicado aún')

    assert.equal((await dir.pedir('POST', `/api/direccion/eventos/${enviado.datos.id}/aprobar`, {})).estado, 200)
    const lista = (await anon.pedir('GET', '/api/publico/eventos')).datos
    assert.equal(lista.length, 1)
    assert.equal(lista[0].organizador, 'Peña Cultural El Boto')
    assert.equal(lista[0].zona, 'valverde')
    assert.equal(lista[0].precio, null)
    for (const interno of ['estado', 'motivo', 'cambios', 'entidadId', 'entidad_id']) assert.equal(lista[0][interno], undefined, interno)
    assert.match(bandeja.at(-1)!.texto, /ya está en la agenda/)
  })

  test('responde con CORS abierto solo en lectura', async () => {
    const r = await new Cliente(app).pedir('GET', '/api/publico/eventos', undefined, { origin: 'capacitor://localhost' })
    assert.equal(r.cabeceras.get('access-control-allow-origin'), '*')
    assert.equal(r.cabeceras.get('access-control-allow-credentials'), null)
  })
})

describe('Entidades', () => {
  test('una empresa no puede darse de alta gratis', async () => {
    const r = await new Cliente(app).pedir('POST', '/api/cuenta/alta', {
      nombre: 'Zapatería Ejemplo SL', tipo: 'otra', cif: cif('B', '2112345'), municipioId: 1, personaContacto: 'Ana Ruiz',
      telefono: '600000000', web: '', email: 'tienda@ejemplo.es', clave: CLAVE, aceptaCondiciones: true,
    })
    assert.equal(r.estado, 400)
    assert.match(r.datos.error, /empresa/)
  })

  test('sin confirmar el correo no entra; pendiente solo hace borradores', async () => {
    await new Cliente(app).pedir('POST', '/api/cuenta/alta', {
      nombre: 'AMPA Colegio', tipo: 'ampa', cif: cif('G', '2100099'), municipioId: 1, personaContacto: 'Rosa Gil',
      telefono: '600000000', web: '', email: 'ampa@ejemplo.es', clave: CLAVE, aceptaCondiciones: true,
    })
    const cli = new Cliente(app)
    assert.equal((await cli.pedir('POST', '/api/cuenta/entrar', { email: 'ampa@ejemplo.es', clave: CLAVE })).estado, 403)

    const { cli: pendiente } = await crearEntidad(app)
    const envio = await pendiente.pedir('POST', '/api/entidad/eventos', { evento: eventoValido(), enviar: true, declaracion: true })
    assert.equal(envio.estado, 403)
    const borrador = await pendiente.pedir('POST', '/api/entidad/eventos', { evento: eventoValido(), enviar: false, declaracion: false })
    assert.equal(borrador.estado, 201)
  })

  test('una entidad no ve ni toca los eventos de otra', async () => {
    const dir = await entrarDireccion(app, await crearDireccion())
    const a = await crearEntidad(app, { verificar: dir })
    const b = await crearEntidad(app, { verificar: dir, email: 'otra@ejemplo.es', cifSiete: '2100002' })
    const { datos } = await a.cli.pedir('POST', '/api/entidad/eventos', { evento: eventoValido(), enviar: false, declaracion: false })
    assert.equal((await b.cli.pedir('GET', `/api/entidad/eventos/${datos.id}`)).estado, 404)
    assert.equal((await b.cli.pedir('PUT', `/api/entidad/eventos/${datos.id}`, { evento: eventoValido(), enviar: true, declaracion: true })).estado, 404)
    assert.equal((await b.cli.pedir('DELETE', `/api/entidad/eventos/${datos.id}`)).estado, 404)
    assert.equal((await b.cli.pedir('GET', '/api/entidad/eventos')).datos.length, 0)
  })

  test('una entidad no entra en el panel de dirección', async () => {
    const { cli } = await crearEntidad(app)
    assert.equal((await cli.pedir('GET', '/api/direccion/pendientes')).estado, 403)
  })

  test('cambios en un evento publicado: sigue visible hasta que se aprueban', async () => {
    const dir = await entrarDireccion(app, await crearDireccion())
    const { cli } = await crearEntidad(app, { verificar: dir })
    const { datos } = await cli.pedir('POST', '/api/entidad/eventos', { evento: eventoValido(), enviar: true, declaracion: true })
    await dir.pedir('POST', `/api/direccion/eventos/${datos.id}/aprobar`, {})

    const cambio = await cli.pedir('PUT', `/api/entidad/eventos/${datos.id}`, {
      evento: eventoValido({ titulo: 'Concierto de la banda (nuevo horario)' }), enviar: true, declaracion: true,
    })
    assert.equal(cambio.estado, 200)
    const anon = new Cliente(app)
    assert.equal((await anon.pedir('GET', '/api/publico/eventos')).datos[0].titulo, 'Concierto de la banda')
    assert.equal((await dir.pedir('GET', '/api/direccion/pendientes')).datos.cambios.length, 1)

    await dir.pedir('POST', `/api/direccion/eventos/${datos.id}/aprobar-cambios`, {})
    assert.equal((await anon.pedir('GET', '/api/publico/eventos')).datos[0].titulo, 'Concierto de la banda (nuevo horario)')
  })

  test('cancelar deja el evento visible y marcado', async () => {
    const dir = await entrarDireccion(app, await crearDireccion())
    const { cli } = await crearEntidad(app, { verificar: dir })
    const { datos } = await cli.pedir('POST', '/api/entidad/eventos', { evento: eventoValido(), enviar: true, declaracion: true })
    await dir.pedir('POST', `/api/direccion/eventos/${datos.id}/aprobar`, {})
    assert.equal((await cli.pedir('POST', `/api/entidad/eventos/${datos.id}/cancelar`, {})).estado, 200)
    const [e] = (await new Cliente(app).pedir('GET', '/api/publico/eventos')).datos
    assert.equal(e.cancelado, true)
  })

  test('rechazo con motivo, corrección y reenvío', async () => {
    const dir = await entrarDireccion(app, await crearDireccion())
    const { cli } = await crearEntidad(app, { verificar: dir })
    const { datos } = await cli.pedir('POST', '/api/entidad/eventos', { evento: eventoValido(), enviar: true, declaracion: true })
    assert.equal((await dir.pedir('POST', `/api/direccion/eventos/${datos.id}/rechazar`, { motivo: 'Falta la hora real.' })).estado, 200)
    const propio = (await cli.pedir('GET', `/api/entidad/eventos/${datos.id}`)).datos
    assert.equal(propio.estado, 'rechazado')
    assert.equal(propio.motivo, 'Falta la hora real.')
    const r = await cli.pedir('PUT', `/api/entidad/eventos/${datos.id}`, { evento: eventoValido(), enviar: true, declaracion: true })
    assert.equal(r.datos.estado, 'pendiente')
  })

  test('validación: enlaces raros, eventos pasados y lugares lejanos', async () => {
    const dir = await entrarDireccion(app, await crearDireccion())
    const { cli } = await crearEntidad(app, { verificar: dir })
    const enviar = (cambios: Record<string, unknown>) =>
      cli.pedir('POST', '/api/entidad/eventos', { evento: eventoValido(cambios), enviar: true, declaracion: true })
    assert.equal((await enviar({ enlace: 'javascript:alert(1)' })).estado, 400)
    assert.equal((await enviar({ inicio: '2020-01-01T10:00', fin: '2020-01-01T12:00' })).estado, 400)
    assert.equal((await enviar({ lat: 40.4, lng: -3.7 })).estado, 400)
    assert.equal((await enviar({ municipioId: 8 })).estado, 400, 'Nerva empieza desactivado')
    assert.equal((await enviar({ campoInventado: 1 })).estado, 400)
    const sinDeclarar = await cli.pedir('POST', '/api/entidad/eventos', { evento: eventoValido(), enviar: true, declaracion: false })
    assert.equal(sinDeclarar.estado, 400)
  })
})

describe('Seguridad de las cuentas', () => {
  test('dirección no entra sin el segundo factor', async () => {
    const secreto = await crearDireccion()
    const cli = new Cliente(app)
    const r = await cli.pedir('POST', '/api/cuenta/entrar', { email: 'pilar@ejemplo.es', clave: CLAVE })
    assert.equal(r.datos.falta, 'codigo')
    assert.equal((await cli.pedir('GET', '/api/direccion/pendientes')).estado, 401)
    assert.equal((await cli.pedir('POST', '/api/cuenta/codigo', { codigo: '000000' })).estado, 400)
    assert.equal((await cli.pedir('POST', '/api/cuenta/codigo', { codigo: codigo(secreto, pasoActual()) })).estado, 200)
    assert.equal((await cli.pedir('GET', '/api/direccion/pendientes')).estado, 200)
  })

  test('dirección nueva tiene que activar el doble factor antes de nada', async () => {
    ejecutar("INSERT INTO usuarios (email, nombre, rol, email_verificado) VALUES ('marcos@ejemplo.es', 'Marcos', 'direccion', 1)")
    const id = uno<{ id: number }>("SELECT id FROM usuarios WHERE email = 'marcos@ejemplo.es'")!.id
    const { enlacePonerClave } = await import('../rutas/cuenta.ts')
    const token = enlacePonerClave(id).split('t=')[1]
    const anon = new Cliente(app)
    assert.equal((await anon.pedir('POST', '/api/cuenta/restablecer', { token, clave: CLAVE })).estado, 200)
    assert.equal((await anon.pedir('POST', '/api/cuenta/restablecer', { token, clave: CLAVE })).estado, 400, 'el enlace vale una vez')

    const cli = new Cliente(app)
    assert.equal((await cli.pedir('POST', '/api/cuenta/entrar', { email: 'marcos@ejemplo.es', clave: CLAVE })).datos.falta, 'alta2fa')
    assert.equal((await cli.pedir('GET', '/api/direccion/pendientes')).estado, 401)
    const { secreto } = (await cli.pedir('POST', '/api/cuenta/2fa/preparar', {})).datos
    assert.equal((await cli.pedir('POST', '/api/cuenta/2fa/activar', { codigo: codigo(secreto, pasoActual()) })).estado, 200)
    assert.equal((await cli.pedir('GET', '/api/direccion/pendientes')).estado, 200)
  })

  test('el secreto del doble factor se guarda cifrado', async () => {
    const secreto = await crearDireccion()
    const guardado = uno<{ totp_secreto: string }>('SELECT totp_secreto FROM usuarios')!.totp_secreto
    assert.ok(!guardado.includes(secreto))
  })

  test('bloqueo tras varios intentos fallidos, con el mismo mensaje que un correo inexistente', async () => {
    await crearDireccion()
    const cli = new Cliente(app)
    const inexistente = await cli.pedir('POST', '/api/cuenta/entrar', { email: 'nadie@ejemplo.es', clave: 'lo que sea' })
    const mala = await cli.pedir('POST', '/api/cuenta/entrar', { email: 'pilar@ejemplo.es', clave: 'clave equivocada' })
    assert.equal(inexistente.datos.error, mala.datos.error)
    for (let i = 0; i < 4; i++) await cli.pedir('POST', '/api/cuenta/entrar', { email: 'pilar@ejemplo.es', clave: 'clave equivocada' })
    const bloqueada = await cli.pedir('POST', '/api/cuenta/entrar', { email: 'pilar@ejemplo.es', clave: CLAVE })
    assert.equal(bloqueada.estado, 429)
  })

  test('peticiones desde otra web o sin la cabecera propia se rechazan', async () => {
    await crearDireccion()
    const cli = new Cliente(app)
    const sinCabecera = await cli.pedir('POST', '/api/cuenta/entrar', { email: 'pilar@ejemplo.es', clave: CLAVE }, { 'x-vc': '0' })
    assert.equal(sinCabecera.estado, 403)
    const otraWeb = await cli.pedir('POST', '/api/cuenta/entrar', { email: 'pilar@ejemplo.es', clave: CLAVE }, { origin: 'https://malvada.example' })
    assert.equal(otraWeb.estado, 403)
    const formulario = await app.request('/api/cuenta/entrar', {
      method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-vc': '1' }, body: 'email=a&clave=b',
    })
    assert.equal(formulario.status, 403)
  })

  test('la cookie de sesión no es accesible desde JavaScript y es estricta', async () => {
    await crearDireccion()
    const r = await app.request('/api/cuenta/entrar', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-vc': '1' },
      body: JSON.stringify({ email: 'pilar@ejemplo.es', clave: CLAVE }),
    })
    const cookie = r.headers.get('set-cookie')!
    assert.match(cookie, /HttpOnly/i)
    assert.match(cookie, /SameSite=Strict/i)
  })

  test('cabeceras de seguridad en todas las respuestas', async () => {
    const r = await app.request('/api/publico/eventos')
    assert.match(r.headers.get('content-security-policy')!, /frame-ancestors 'none'/)
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff')
  })

  test('cerrar sesión invalida la cookie en el servidor', async () => {
    const dir = await entrarDireccion(app, await crearDireccion())
    const robada = dir.cookie
    await dir.pedir('POST', '/api/cuenta/salir', {})
    const ladron = new Cliente(app)
    ladron.cookie = robada
    assert.equal((await ladron.pedir('GET', '/api/direccion/pendientes')).estado, 401)
  })

  test('olvidé mi contraseña responde igual exista o no el correo', async () => {
    await crearDireccion()
    const a = await new Cliente(app).pedir('POST', '/api/cuenta/olvide', { email: 'pilar@ejemplo.es' })
    const b = await new Cliente(app).pedir('POST', '/api/cuenta/olvide', { email: 'nadie@ejemplo.es' })
    assert.deepEqual([a.estado, a.datos], [b.estado, b.datos])
    assert.equal(bandeja.length, 1)
  })

  test('una entidad suspendida pierde la sesión', async () => {
    const dir = await entrarDireccion(app, await crearDireccion())
    const { cli, entidadId } = await crearEntidad(app, { verificar: dir })
    await dir.pedir('POST', `/api/direccion/entidades/${entidadId}/suspender`, { motivo: 'Publicidad de empresa.' })
    assert.equal((await cli.pedir('GET', '/api/entidad/eventos')).estado, 401)
  })

  test('todo queda en el registro de actividad', async () => {
    const dir = await entrarDireccion(app, await crearDireccion())
    await crearEntidad(app, { verificar: dir })
    const acciones = (await dir.pedir('GET', '/api/direccion/registro')).datos.map((r: { accion: string }) => r.accion)
    for (const a of ['entrar', 'alta_entidad', 'correo_verificado', 'entidad_verificada']) assert.ok(acciones.includes(a), a)
  })
})
