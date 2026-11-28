import { Hono } from 'hono'
import { z } from 'zod'
import { documentoComercioValido, normalizarCif } from '../../compartido/cif.ts'
import type { DatosComercio, EstadoComercio } from '../../compartido/tipos.ts'
import { CATEGORIAS_COMERCIO, CENTRO_VALVERDE, distanciaKm } from '../../compartido/tipos.ts'
import { ahoraIso, ejecutar, transaccion, uno, varios } from '../bd.ts'
import {
  aGestion, avisarComercio, campanaActual, campanas, capacidades, comercioPublico, comerciosPublicos, contarVisita, crearComercio,
  guardarFicha, hoy, leerComercio, leerOferta, listarComercios, listarOfertas, listarPlanes, patrocinados, planesDe, renovacionesProximas,
  visitas30,
} from '../comercios.ts'
import { fallo, ipDe, type C, type Entorno } from '../contexto.ts'
import { avisarDireccion, enlaceGestion, enviarCorreo } from '../correo.ts'
import { comprobarImagen, comprobarMunicipio } from '../eventos.ts'
import { anotar } from '../registro.ts'
import { cifrarClave, fichaAleatoria, huella, problemaConClave } from '../seguridad/claves.ts'
import { permitir } from '../seguridad/limites.ts'
import { exigir } from '../seguridad/sesiones.ts'
import { email, leer, motivo } from '../validacion.ts'
import { enlacePonerClave } from './cuenta.ts'

// ——— Validación ———

const linea = (min: number, max: number, nombre: string) =>
  z.string().transform((s) => s.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim())
    .pipe(z.string().min(min, `${nombre}: escribe al menos ${min} caracteres.`).max(max, `${nombre}: como mucho ${max} caracteres.`))
const parrafos = (max: number, nombre: string) =>
  z.string().transform((s) => s.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, '').replace(/\n{3,}/g, '\n\n').trim())
    .pipe(z.string().max(max, `${nombre}: como mucho ${max} caracteres.`))
const web = z.string().trim().max(300).refine((s) => s === '' || (/^https?:\/\//i.test(s) && URL.canParse(s)), 'Los enlaces deben empezar por https://')
const telefono = z.string().trim().refine((s) => s === '' || /^\+?[\d\s]{9,15}$/.test(s), 'El teléfono no es válido.')
const clave = z.string().regex(/^[a-z0-9]{24}$/, 'La imagen no es válida.')
const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha no válida.')

export const esquemaComercio = z.object({
  nombre: linea(2, 90, 'Nombre'),
  categoria: z.enum(CATEGORIAS_COMERCIO.map((c) => c.id) as [string, ...string[]], 'Elige una categoría.'),
  descripcion: parrafos(1200, 'Descripción'),
  direccion: linea(3, 120, 'Dirección'),
  municipioId: z.number().int().positive(),
  lat: z.number(),
  lng: z.number(),
  telefono,
  whatsapp: telefono,
  emailPublico: z.string().trim().toLowerCase().max(254).refine((s) => s === '' || z.email().safeParse(s).success, 'El correo no es válido.'),
  web,
  instagram: web,
  facebook: web,
  horario: parrafos(300, 'Horario'),
  logo: clave.nullable(),
  fotos: z.array(clave).max(6, 'Como mucho 6 fotos.'),
}).strict().refine((c) => distanciaKm(CENTRO_VALVERDE, c) <= 35, { message: 'El comercio está demasiado lejos de Valverde.', path: ['lat'] })

function comprobarFicha(d: DatosComercio, quien: Parameters<typeof comprobarImagen>[1]) {
  comprobarMunicipio(d.municipioId)
  comprobarImagen(d.logo, quien)
  d.fotos.forEach((f) => comprobarImagen(f, quien))
}

const esquemaOferta = z.object({
  titulo: linea(3, 90, 'Título'),
  texto: parrafos(600, 'Texto'),
  imagen: clave.nullable(),
  desde: fecha,
  hasta: fecha,
  campanaId: z.number().int().positive().nullable(),
}).strict()
  .refine((o) => o.hasta >= o.desde, { message: 'La oferta tiene que acabar después de empezar.', path: ['hasta'] })
  .refine((o) => Date.parse(o.hasta) - Date.parse(o.desde) <= 92 * 86400_000, { message: 'Una oferta dura como mucho tres meses.', path: ['hasta'] })

const id = (c: C, nombre = 'id') => {
  const n = Number(c.req.param(nombre))
  if (!Number.isInteger(n) || n <= 0) throw fallo(404, 'No existe.')
  return n
}

// ——— Público: la guía ———

export const comerciosPublico = new Hono<Entorno>()

comerciosPublico.get('/comercios', (c) => {
  c.header('Cache-Control', 'public, max-age=60')
  return c.json(comerciosPublicos())
})

/** La ficha de un comercio; cuenta una visita por conexión y media hora. */
comerciosPublico.get('/comercios/:slug', (c) => {
  const { id: comercioId, comercio } = comercioPublico(c.req.param('slug'))
  if (permitir(`visita:${ipDe(c)}:${comercioId}`, 1, 30 * 60_000)) contarVisita(comercioId)
  c.header('Cache-Control', 'no-store')
  return c.json(comercio)
})

comerciosPublico.get('/patrocinados', (c) => {
  c.header('Cache-Control', 'public, max-age=60')
  return c.json(patrocinados())
})

comerciosPublico.get('/campana', (c) => {
  c.header('Cache-Control', 'public, max-age=60')
  return c.json(campanaActual())
})

// ——— Alta de comercio (sin cuenta) ———

export const altaComercio = new Hono<Entorno>()

altaComercio.post('/alta-comercio', async (c) => {
  if (!permitir(`alta:${ipDe(c)}`, 5, 3600_000)) throw fallo(429, 'Demasiadas altas desde esta conexión. Prueba más tarde.')
  const d = await leer(c, z.object({
    nombre: linea(2, 90, 'Nombre del comercio'),
    categoria: z.enum(CATEGORIAS_COMERCIO.map((x) => x.id) as [string, ...string[]], 'Elige una categoría.'),
    nif: z.string().transform(normalizarCif).refine(documentoComercioValido, 'El CIF, DNI o NIE no es válido.'),
    direccion: linea(3, 120, 'Dirección'),
    municipioId: z.number().int().positive(),
    telefono: z.string().trim().regex(/^\+?[\d\s]{9,15}$/, 'El teléfono no es válido.'),
    personaContacto: linea(3, 90, 'Persona de contacto'),
    email,
    clave: z.string().max(200),
    aceptaCondiciones: z.literal(true, 'Hay que aceptar las condiciones.'),
  }).strict())
  const m = uno<{ lat: number; lng: number; activo: number }>('SELECT lat, lng, activo FROM municipios WHERE id = ?', d.municipioId)
  if (!m?.activo) throw fallo(400, 'Elige un municipio de la lista.')
  const problema = problemaConClave(d.clave, d.email)
  if (problema) throw fallo(400, problema)
  if (uno('SELECT 1 FROM comercios WHERE nif = ?', d.nif)) throw fallo(409, 'Este comercio ya está dado de alta. Si no sabes quién lo hizo, escríbenos.')
  const hash = await cifrarClave(d.clave)
  if (uno('SELECT 1 FROM usuarios WHERE email = ?', d.email)) {
    await enviarCorreo({ para: d.email, asunto: 'Intento de alta en Valverde Cuenta',
      texto: `Alguien ha intentado dar de alta un comercio con este correo, que ya tiene cuenta.\nSi has sido tú y no recuerdas la contraseña: ${enlaceGestion('/olvide')}` })
    return c.json({ ok: true })
  }
  const usuarioId = transaccion(() => {
    const comercioId = crearComercio({
      nombre: d.nombre, categoria: d.categoria as DatosComercio['categoria'], descripcion: '', direccion: d.direccion, municipioId: d.municipioId,
      lat: m.lat, lng: m.lng, telefono: d.telefono.replace(/\s/g, ''), whatsapp: '', emailPublico: '', web: '', instagram: '', facebook: '',
      horario: '', logo: null, fotos: [],
    }, { nif: d.nif, personaContacto: d.personaContacto, telefonoContacto: d.telefono.replace(/\s/g, ''), estado: 'pendiente' })
    const u = ejecutar("INSERT INTO usuarios (email, nombre, rol, comercio_id, hash_clave) VALUES (?, ?, 'comercio', ?, ?)", d.email, d.personaContacto, comercioId, hash)
    return Number(u.lastInsertRowid)
  })
  anotar(c, usuarioId, 'alta_comercio', `comercio:${d.nif}`, d.nombre)
  const ficha = fichaAleatoria()
  ejecutar("INSERT INTO fichas (hash, usuario_id, tipo, caduca) VALUES (?, ?, 'verificar', ?)", huella(ficha), usuarioId, new Date(Date.now() + 48 * 3600_000).toISOString())
  await enviarCorreo({
    para: d.email, asunto: 'Confirma tu correo · Valverde Cuenta',
    texto: `Hola, ${d.personaContacto}:\n\nPara terminar el alta de «${d.nombre}» en la guía de comercios, confirma tu correo (vale 48 horas):\n${enlaceGestion(`/verificar?t=${ficha}`)}\n\nDespués revisaremos los datos y publicaremos tu ficha básica, que es gratis.`,
  })
  await avisarDireccion('Comercio nuevo por verificar', `«${d.nombre}» ha pedido entrar en la guía.`)
  return c.json({ ok: true })
})

// ——— El panel del propio comercio ———

export const comercio = new Hono<Entorno>()
comercio.use(exigir({ rol: 'comercio' }))

const miComercio = (c: C) => leerComercio(c.get('usuario').comercioId!)

comercio.get('/yo', (c) => {
  const f = miComercio(c)
  return c.json({ ...aGestion(f), planes: planesDe(f.id), visitas30: visitas30(f.id) })
})

/** Cambiar la ficha: si ya está publicada, los cambios esperan a que dirección los revise. */
comercio.put('/ficha', async (c) => {
  const u = c.get('usuario')
  const f = miComercio(c)
  if (f.estado === 'rechazado' || f.estado === 'suspendido') throw fallo(403, 'Tu comercio no puede cambiar la ficha ahora mismo.')
  const d = await leer(c, esquemaComercio) as DatosComercio
  comprobarFicha(d, u)
  const cap = capacidades(f.id)
  if (!cap.escaparate) {
    // Sin plan Escaparate solo cuenta la ficha básica: lo demás se guarda vacío.
    Object.assign(d, { descripcion: '', whatsapp: '', emailPublico: '', web: '', instagram: '', facebook: '', logo: null, fotos: [] })
  }
  if (f.estado === 'pendiente') {
    guardarFicha(f.id, d)
  } else {
    ejecutar('UPDATE comercios SET cambios = ? WHERE id = ?', JSON.stringify(d), f.id)
    await avisarDireccion('Cambios en una ficha de comercio', `«${f.nombre}» ha cambiado su ficha.`)
  }
  anotar(c, u.id, 'ficha_comercio_enviada', `comercio:${f.id}`, d.nombre)
  return c.json({ ok: true, revision: f.estado !== 'pendiente' })
})

comercio.delete('/ficha/cambios', (c) => {
  ejecutar('UPDATE comercios SET cambios = NULL WHERE id = ?', miComercio(c).id)
  return c.json({ ok: true })
})

comercio.get('/ofertas', (c) => c.json(listarOfertas('o.comercio_id = ?', miComercio(c).id)))

async function guardarOferta(c: C, ofertaId: number | null) {
  const u = c.get('usuario')
  const f = miComercio(c)
  if (f.estado !== 'verificado') throw fallo(403, 'Podrás publicar ofertas cuando verifiquemos tu comercio.')
  if (!capacidades(f.id).ofertas) throw fallo(403, 'Para publicar ofertas hace falta un plan (Escaparate, Destacado, Campaña o Promoción).')
  if (!permitir(`ofertas:${u.id}`, 20, 3600_000)) throw fallo(429, 'Demasiadas ofertas seguidas. Prueba más tarde.')
  const d = await leer(c, esquemaOferta)
  comprobarImagen(d.imagen, u)
  if (d.hasta < hoy()) throw fallo(400, 'Esa oferta ya habría terminado.')
  if (d.campanaId && !capacidades(f.id).campanas.includes(d.campanaId)) throw fallo(400, 'No tienes contratada esa campaña.')
  if (ofertaId) {
    const o = leerOferta(ofertaId)
    if (o.comercio_id !== f.id) throw fallo(404, 'Esa oferta no existe.')
    if (o.estado === 'publicada') throw fallo(409, 'Una oferta publicada no se cambia: retírala y crea otra.')
    ejecutar("UPDATE ofertas SET titulo = ?, texto = ?, imagen = ?, desde = ?, hasta = ?, campana_id = ?, estado = 'pendiente', motivo = NULL WHERE id = ?",
      d.titulo, d.texto, d.imagen, d.desde, d.hasta, d.campanaId, o.id)
  } else {
    const r = ejecutar('INSERT INTO ofertas (comercio_id, titulo, texto, imagen, desde, hasta, campana_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      f.id, d.titulo, d.texto, d.imagen, d.desde, d.hasta, d.campanaId)
    ofertaId = Number(r.lastInsertRowid)
  }
  anotar(c, u.id, 'oferta_enviada', `oferta:${ofertaId}`, d.titulo)
  await avisarDireccion('Oferta nueva por revisar', `«${d.titulo}», de ${f.nombre}.`)
  return c.json({ id: ofertaId }, 201)
}

comercio.post('/ofertas', (c) => guardarOferta(c, null))
comercio.put('/ofertas/:id', (c) => guardarOferta(c, id(c)))

/** Quitar una oferta propia: si está publicada, se retira; si no, se borra. */
comercio.delete('/ofertas/:id', (c) => {
  const o = leerOferta(id(c))
  if (o.comercio_id !== miComercio(c).id) throw fallo(404, 'Esa oferta no existe.')
  if (o.estado === 'publicada') ejecutar("UPDATE ofertas SET estado = 'retirada' WHERE id = ?", o.id)
  else ejecutar('DELETE FROM ofertas WHERE id = ?', o.id)
  return c.json({ ok: true })
})

comercio.get('/avisos', (c) => {
  const filas = varios<{ id: number; tipo: 'bien' | 'mal' | 'info'; titulo: string; texto: string; leido: number; creado: string }>(
    'SELECT * FROM avisos_comercio WHERE comercio_id = ? ORDER BY id DESC LIMIT 50', miComercio(c).id)
  return c.json(filas.map((a) => ({ id: a.id, tipo: a.tipo, titulo: a.titulo, texto: a.texto, eventoId: null, leido: Boolean(a.leido), creado: a.creado })))
})

comercio.post('/avisos/leidos', (c) => {
  ejecutar('UPDATE avisos_comercio SET leido = 1 WHERE comercio_id = ?', miComercio(c).id)
  return c.json({ ok: true })
})

comercio.get('/campanas', (c) => {
  const mias = capacidades(miComercio(c).id).campanas
  return c.json(campanas().filter((x) => mias.includes(x.id)))
})

// ——— Dirección ———

export const comerciosDireccion = new Hono<Entorno>()
comerciosDireccion.use('/comercios/*', exigir({ rol: 'direccion' }))
comerciosDireccion.use('/comercios', exigir({ rol: 'direccion' }))
comerciosDireccion.use('/planes/*', exigir({ rol: 'direccion' }))
comerciosDireccion.use('/campanas/*', exigir({ rol: 'direccion' }))
comerciosDireccion.use('/campanas', exigir({ rol: 'direccion' }))
comerciosDireccion.use('/ofertas/*', exigir({ rol: 'direccion' }))
comerciosDireccion.use('/cobros', exigir({ rol: 'direccion' }))

comerciosDireccion.get('/comercios', (c) => c.json(listarComercios()))

comerciosDireccion.get('/comercios/:id', (c) => {
  const f = leerComercio(id(c))
  return c.json({ ...aGestion(f), planes: planesDe(f.id), ofertas: listarOfertas('o.comercio_id = ?', f.id) })
})

/** Dirección da de alta un comercio que ha venido en persona: sale verificado. Opcionalmente, con cuenta para él. */
comerciosDireccion.post('/comercios', async (c) => {
  const d = await leer(c, z.object({
    ficha: esquemaComercio,
    nif: z.string().transform(normalizarCif).refine((s) => s === '' || documentoComercioValido(s), 'El CIF, DNI o NIE no es válido.'),
    personaContacto: linea(0, 90, 'Persona de contacto'),
    telefonoContacto: telefono,
    emailCuenta: z.string().trim().toLowerCase().max(254).refine((s) => s === '' || z.email().safeParse(s).success, 'El correo no es válido.'),
  }).strict())
  const ficha = d.ficha as DatosComercio
  comprobarFicha(ficha, c.get('usuario'))
  if (d.nif && uno('SELECT 1 FROM comercios WHERE nif = ?', d.nif)) throw fallo(409, 'Ya hay un comercio con ese CIF o NIF.')
  if (d.emailCuenta && uno('SELECT 1 FROM usuarios WHERE email = ?', d.emailCuenta)) throw fallo(409, 'Ya hay una cuenta con ese correo.')
  const nuevo = transaccion(() => crearComercio(ficha, { nif: d.nif || null, personaContacto: d.personaContacto, telefonoContacto: d.telefonoContacto, estado: 'verificado' }))
  anotar(c, c.get('usuario').id, 'comercio_creado', `comercio:${nuevo}`, ficha.nombre)
  if (d.emailCuenta) await invitar(nuevo, d.emailCuenta, d.personaContacto || ficha.nombre)
  return c.json({ id: nuevo }, 201)
})

/** Crea la cuenta del comercio y le manda un enlace para poner su contraseña. */
async function invitar(comercioId: number, correo: string, nombre: string) {
  const u = ejecutar("INSERT INTO usuarios (email, nombre, rol, comercio_id, email_verificado) VALUES (?, ?, 'comercio', ?, 1)", correo, nombre, comercioId)
  const enlace = enlacePonerClave(Number(u.lastInsertRowid), 72)
  await enviarCorreo({
    para: correo, asunto: 'Tu comercio ya está en Valverde Cuenta',
    texto: `Hola, ${nombre}:\n\nHemos dado de alta tu comercio en la guía de Valverde Cuenta. Para entrar en tu panel y completar tu ficha, pon tu contraseña aquí (vale 3 días):\n${enlace}`,
  })
}

comerciosDireccion.post('/comercios/:id/cuenta', async (c) => {
  const f = leerComercio(id(c))
  const { email: correo, nombre } = await leer(c, z.object({ email, nombre: linea(2, 90, 'Nombre') }).strict())
  if (uno('SELECT 1 FROM usuarios WHERE comercio_id = ?', f.id)) throw fallo(409, 'Este comercio ya tiene cuenta.')
  if (uno('SELECT 1 FROM usuarios WHERE email = ?', correo)) throw fallo(409, 'Ya hay una cuenta con ese correo.')
  await invitar(f.id, correo, nombre)
  anotar(c, c.get('usuario').id, 'comercio_invitado', `comercio:${f.id}`, correo)
  return c.json({ ok: true })
})

comerciosDireccion.put('/comercios/:id', async (c) => {
  const f = leerComercio(id(c))
  const d = await leer(c, z.object({ ficha: esquemaComercio, nota: parrafos(2000, 'Nota') }).strict())
  comprobarFicha(d.ficha as DatosComercio, c.get('usuario'))
  transaccion(() => {
    guardarFicha(f.id, d.ficha as DatosComercio)
    ejecutar('UPDATE comercios SET nota = ? WHERE id = ?', d.nota, f.id)
  })
  anotar(c, c.get('usuario').id, 'comercio_editado', `comercio:${f.id}`, d.ficha.nombre)
  return c.json({ ok: true })
})

async function cambiarEstado(c: C, desde: EstadoComercio[], hasta: EstadoComercio, accion: string, m: string | null, aviso?: [string, string, 'bien' | 'mal']) {
  const f = leerComercio(id(c))
  if (!desde.includes(f.estado)) throw fallo(409, 'El comercio no está en un estado que permita esto.')
  ejecutar('UPDATE comercios SET estado = ?, motivo = ?, revisado = ?, revisado_por = ? WHERE id = ?', hasta, m, ahoraIso(), c.get('usuario').id, f.id)
  if (hasta === 'suspendido') ejecutar('DELETE FROM sesiones WHERE usuario_id IN (SELECT id FROM usuarios WHERE comercio_id = ?)', f.id)
  anotar(c, c.get('usuario').id, accion, `comercio:${f.id}`, m ?? f.nombre)
  const avisado = aviso ? await avisarComercio(f.id, aviso[2], aviso[0], aviso[1].replace('{nombre}', f.nombre).replace('{motivo}', m ?? '')) : undefined
  return c.json({ ok: true, avisado })
}

comerciosDireccion.post('/comercios/:id/verificar', (c) => cambiarEstado(c, ['pendiente', 'rechazado'], 'verificado', 'comercio_verificado', null,
  ['Comercio publicado en la guía', '«{nombre}» ya sale en la guía de comercios con su ficha básica. Si quieres más visibilidad, pregúntanos por los planes.', 'bien']))
comerciosDireccion.post('/comercios/:id/rechazar', async (c) => cambiarEstado(c, ['pendiente'], 'rechazado', 'comercio_rechazado', (await leer(c, motivo)).motivo,
  ['Alta no aceptada', 'No hemos podido publicar «{nombre}» por este motivo:\n\n{motivo}', 'mal']))
comerciosDireccion.post('/comercios/:id/suspender', async (c) => cambiarEstado(c, ['verificado'], 'suspendido', 'comercio_suspendido', (await leer(c, motivo)).motivo,
  ['Ficha suspendida', 'Hemos quitado de la guía «{nombre}» por este motivo:\n\n{motivo}', 'mal']))
comerciosDireccion.post('/comercios/:id/reactivar', (c) => cambiarEstado(c, ['suspendido'], 'verificado', 'comercio_reactivado', null))

comerciosDireccion.post('/comercios/:id/aprobar-cambios', async (c) => {
  const f = leerComercio(id(c))
  if (!f.cambios) throw fallo(409, 'No hay cambios pendientes.')
  guardarFicha(f.id, JSON.parse(f.cambios) as DatosComercio)
  anotar(c, c.get('usuario').id, 'comercio_cambios_aprobados', `comercio:${f.id}`, f.nombre)
  const avisado = await avisarComercio(f.id, 'bien', 'Ficha actualizada', 'Los cambios en tu ficha ya se ven en la guía.')
  return c.json({ ok: true, avisado })
})

comerciosDireccion.post('/comercios/:id/rechazar-cambios', async (c) => {
  const f = leerComercio(id(c))
  const { motivo: m } = await leer(c, motivo)
  ejecutar('UPDATE comercios SET cambios = NULL WHERE id = ?', f.id)
  anotar(c, c.get('usuario').id, 'comercio_cambios_rechazados', `comercio:${f.id}`, m)
  const avisado = await avisarComercio(f.id, 'mal', 'Cambios no aplicados', `No hemos aplicado los cambios en tu ficha por este motivo:\n\n${m}`)
  return c.json({ ok: true, avisado })
})

// ——— Planes y cobros ———

const esquemaPlan = z.object({
  tipo: z.enum(['escaparate', 'destacado', 'campana', 'promocion', 'patrocinio']),
  campanaId: z.number().int().positive().nullable(),
  desde: fecha,
  hasta: fecha,
  importe: z.number().min(0).max(10000),
  estadoPago: z.enum(['pendiente', 'pagado', 'anulado']),
  metodo: linea(0, 40, 'Método'),
  factura: linea(0, 40, 'Factura'),
  nota: parrafos(500, 'Nota'),
}).strict()
  .refine((p) => p.hasta >= p.desde, { message: 'El plan tiene que acabar después de empezar.', path: ['hasta'] })
  .refine((p) => p.tipo !== 'campana' || p.campanaId, { message: 'Elige la campaña.', path: ['campanaId'] })

comerciosDireccion.post('/comercios/:id/planes', async (c) => {
  const f = leerComercio(id(c))
  const p = await leer(c, esquemaPlan)
  if (p.campanaId && !uno('SELECT 1 FROM campanas WHERE id = ?', p.campanaId)) throw fallo(400, 'Esa campaña no existe.')
  const r = ejecutar(`INSERT INTO planes (comercio_id, tipo, campana_id, desde, hasta, importe_centimos, estado_pago, metodo, factura, nota, pagado_el, creado_por)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    f.id, p.tipo, p.tipo === 'campana' ? p.campanaId : null, p.desde, p.hasta, Math.round(p.importe * 100), p.estadoPago, p.metodo, p.factura, p.nota,
    p.estadoPago === 'pagado' ? hoy() : null, c.get('usuario').id)
  anotar(c, c.get('usuario').id, 'plan_creado', `comercio:${f.id}`, `${p.tipo} ${p.desde}–${p.hasta} ${p.importe} €`)
  return c.json({ id: Number(r.lastInsertRowid) }, 201)
})

comerciosDireccion.put('/planes/:id', async (c) => {
  const planId = id(c)
  const actual = uno<{ comercio_id: number; estado_pago: string; pagado_el: string | null }>('SELECT comercio_id, estado_pago, pagado_el FROM planes WHERE id = ?', planId)
  if (!actual) throw fallo(404, 'Ese plan no existe.')
  const p = await leer(c, esquemaPlan)
  const pagadoEl = p.estadoPago === 'pagado' ? actual.pagado_el ?? hoy() : null
  ejecutar(`UPDATE planes SET tipo = ?, campana_id = ?, desde = ?, hasta = ?, importe_centimos = ?, estado_pago = ?, metodo = ?, factura = ?, nota = ?, pagado_el = ?
            WHERE id = ?`, p.tipo, p.tipo === 'campana' ? p.campanaId : null, p.desde, p.hasta, Math.round(p.importe * 100), p.estadoPago, p.metodo,
  p.factura, p.nota, pagadoEl, planId)
  anotar(c, c.get('usuario').id, 'plan_cambiado', `comercio:${actual.comercio_id}`, `${p.tipo} ${p.estadoPago}`)
  return c.json({ ok: true })
})

/** Resumen de cobros: lo cobrado este mes y este año, lo pendiente y las renovaciones próximas. */
comerciosDireccion.get('/cobros', (c) => {
  const dia = hoy()
  const suma = (donde: string, ...vs: string[]) => (uno<{ n: number }>(`SELECT COALESCE(SUM(importe_centimos), 0) AS n FROM planes WHERE ${donde}`, ...vs)?.n ?? 0) / 100
  return c.json({
    cobradoMes: suma("estado_pago = 'pagado' AND substr(pagado_el, 1, 7) = ?", dia.slice(0, 7)),
    cobradoAnio: suma("estado_pago = 'pagado' AND substr(pagado_el, 1, 4) = ?", dia.slice(0, 4)),
    pendiente: suma("estado_pago = 'pendiente'"),
    planes: listarPlanes(),
    renovaciones: renovacionesProximas(),
  })
})

// ——— Campañas ———

const esquemaCampana = z.object({
  nombre: linea(3, 60, 'Nombre'),
  descripcion: parrafos(300, 'Descripción'),
  desde: fecha,
  hasta: fecha,
  activa: z.boolean(),
}).strict().refine((x) => x.hasta >= x.desde, { message: 'La campaña tiene que acabar después de empezar.', path: ['hasta'] })

comerciosDireccion.get('/campanas', (c) => c.json(campanas()))

comerciosDireccion.post('/campanas', async (c) => {
  const d = await leer(c, esquemaCampana)
  const base = `${d.nombre}-${d.desde.slice(0, 4)}`.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  let slug = base
  for (let i = 2; uno('SELECT 1 FROM campanas WHERE slug = ?', slug); i++) slug = `${base}-${i}`
  ejecutar('INSERT INTO campanas (slug, nombre, descripcion, desde, hasta, activa) VALUES (?, ?, ?, ?, ?, ?)', slug, d.nombre, d.descripcion, d.desde, d.hasta, d.activa)
  anotar(c, c.get('usuario').id, 'campana_creada', `campana:${slug}`, d.nombre)
  return c.json({ slug }, 201)
})

comerciosDireccion.put('/campanas/:id', async (c) => {
  const d = await leer(c, esquemaCampana)
  const r = ejecutar('UPDATE campanas SET nombre = ?, descripcion = ?, desde = ?, hasta = ?, activa = ? WHERE id = ?', d.nombre, d.descripcion, d.desde, d.hasta, d.activa, id(c))
  if (!r.changes) throw fallo(404, 'Esa campaña no existe.')
  anotar(c, c.get('usuario').id, 'campana_cambiada', `campana:${id(c)}`, d.nombre)
  return c.json({ ok: true })
})

// ——— Ofertas ———

comerciosDireccion.post('/ofertas/:id/aprobar', async (c) => {
  const o = leerOferta(id(c))
  if (o.estado !== 'pendiente') throw fallo(409, 'Esta oferta no está pendiente.')
  ejecutar("UPDATE ofertas SET estado = 'publicada', motivo = NULL, revisado = ?, revisado_por = ? WHERE id = ?", ahoraIso(), c.get('usuario').id, o.id)
  anotar(c, c.get('usuario').id, 'oferta_publicada', `oferta:${o.id}`, o.titulo)
  const avisado = await avisarComercio(o.comercio_id, 'bien', 'Oferta publicada', `«${o.titulo}» ya se ve en la app hasta el ${o.hasta}.`)
  return c.json({ ok: true, avisado })
})

comerciosDireccion.post('/ofertas/:id/rechazar', async (c) => {
  const o = leerOferta(id(c))
  const { motivo: m } = await leer(c, motivo)
  ejecutar("UPDATE ofertas SET estado = 'rechazada', motivo = ?, revisado = ?, revisado_por = ? WHERE id = ?", m, ahoraIso(), c.get('usuario').id, o.id)
  anotar(c, c.get('usuario').id, 'oferta_rechazada', `oferta:${o.id}`, m)
  const avisado = await avisarComercio(o.comercio_id, 'mal', 'Oferta no publicada', `No hemos publicado «${o.titulo}» por este motivo:\n\n${m}\n\nPuedes corregirla desde tu panel.`)
  return c.json({ ok: true, avisado })
})

comerciosDireccion.post('/ofertas/:id/retirar', async (c) => {
  const o = leerOferta(id(c))
  const { motivo: m } = await leer(c, motivo)
  ejecutar("UPDATE ofertas SET estado = 'retirada', motivo = ? WHERE id = ?", m, o.id)
  anotar(c, c.get('usuario').id, 'oferta_retirada', `oferta:${o.id}`, m)
  const avisado = await avisarComercio(o.comercio_id, 'mal', 'Oferta retirada', `Hemos retirado «${o.titulo}» por este motivo:\n\n${m}`)
  return c.json({ ok: true, avisado })
})

/** Para «Pendientes» de dirección. */
export function pendientesComercios() {
  return {
    comercios: listarComercios("c.estado = 'pendiente'"),
    cambiosComercio: listarComercios("c.estado = 'verificado' AND c.cambios IS NOT NULL"),
    ofertas: listarOfertas("o.estado = 'pendiente'"),
    renovaciones: renovacionesProximas(),
  }
}

export const cuantosPendientesComercios = () => {
  const p = pendientesComercios()
  return p.comercios.length + p.cambiosComercio.length + p.ofertas.length + p.renovaciones.length
}

