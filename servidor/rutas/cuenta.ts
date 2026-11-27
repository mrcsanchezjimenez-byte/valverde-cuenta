import { Hono } from 'hono'
import { z } from 'zod'
import { motivoCifNoGratis } from '../../compartido/cif.ts'
import type { Rol } from '../../compartido/tipos.ts'
import { ahoraIso, ejecutar, transaccion, uno } from '../bd.ts'
import { fallo, ipDe, type Entorno, type UsuarioSesion } from '../contexto.ts'
import { avisarDireccion, enlaceGestion, enviarCorreo } from '../correo.ts'
import { anotar } from '../registro.ts'
import * as cifrado from '../seguridad/cifrado.ts'
import { cifrarClave, comprobarClave, fichaAleatoria, hashFalso, huella, problemaConClave } from '../seguridad/claves.ts'
import { permitir } from '../seguridad/limites.ts'
import { cerrarOtrasSesiones, cerrarSesion, crearSesion, exigir } from '../seguridad/sesiones.ts'
import { comprobarCodigo, nuevoSecreto, uriAlta } from '../seguridad/totp.ts'
import { altaEntidad, clave, codigo2fa, email, leer } from '../validacion.ts'

const MINUTO = 60_000
const MAX_FALLOS = 5
const BLOQUEO = 15 * MINUTO
const MAX_CODIGOS = 5

interface FilaUsuario {
  id: number
  email: string
  rol: Rol
  hash_clave: string | null
  email_verificado: number
  activo: number
  fallos: number
  bloqueado_hasta: string | null
  totp_activo: number
  totp_secreto: string | null
  totp_ultimo_paso: number
}

const NO_ENTRA = 'Correo o contraseña incorrectos.'

/** Qué le falta a la sesión para estar completa. */
const pendiente = (u: Pick<UsuarioSesion, 'rol' | 'totpActivo'>, segundoFactor: boolean) =>
  segundoFactor ? null : u.totpActivo ? 'codigo' : u.rol === 'direccion' ? 'alta2fa' : null

/** Crea un enlace de un solo uso y devuelve la ficha para meterla en el correo. */
function crearFicha(usuarioId: number, tipo: 'verificar' | 'clave', horas: number) {
  const ficha = fichaAleatoria()
  ejecutar('DELETE FROM fichas WHERE usuario_id = ? AND tipo = ?', usuarioId, tipo)
  ejecutar('INSERT INTO fichas (hash, usuario_id, tipo, caduca) VALUES (?, ?, ?, ?)',
    huella(ficha), usuarioId, tipo, new Date(Date.now() + horas * 3600_000).toISOString())
  return ficha
}

/** Gasta un enlace: solo vale una vez. */
function gastarFicha(ficha: string, tipo: 'verificar' | 'clave') {
  const fila = uno<{ usuario_id: number; caduca: string }>('SELECT usuario_id, caduca FROM fichas WHERE hash = ? AND tipo = ?', huella(ficha), tipo)
  if (!fila || Date.parse(fila.caduca) <= Date.now()) throw fallo(400, 'El enlace no es válido o ha caducado. Pide uno nuevo.')
  ejecutar('DELETE FROM fichas WHERE hash = ?', huella(ficha))
  return fila.usuario_id
}

export function enlacePonerClave(usuarioId: number, horas = 24) {
  return enlaceGestion(`/restablecer?t=${crearFicha(usuarioId, 'clave', horas)}`)
}

export const cuenta = new Hono<Entorno>()

cuenta.post('/entrar', async (c) => {
  const datos = await leer(c, z.object({ email, clave }))
  const ip = ipDe(c)
  if (!permitir(`entrar:${ip}`, 20, 15 * MINUTO)) throw fallo(429, 'Demasiados intentos. Espera unos minutos.')

  const u = uno<FilaUsuario>('SELECT * FROM usuarios WHERE email = ?', datos.email)
  if (!u || !u.hash_clave) {
    await comprobarClave(datos.clave, await hashFalso())
    anotar(c, null, 'entrar_fallo', '', datos.email)
    throw fallo(401, NO_ENTRA)
  }
  if (u.bloqueado_hasta && Date.parse(u.bloqueado_hasta) > Date.now()) {
    throw fallo(429, 'La cuenta está bloqueada unos minutos por demasiados intentos fallidos.')
  }
  if (!(await comprobarClave(datos.clave, u.hash_clave))) {
    const fallos = u.fallos + 1
    const bloquear = fallos >= MAX_FALLOS
    ejecutar('UPDATE usuarios SET fallos = ?, bloqueado_hasta = ? WHERE id = ?',
      bloquear ? 0 : fallos, bloquear ? new Date(Date.now() + BLOQUEO).toISOString() : null, u.id)
    anotar(c, u.id, bloquear ? 'cuenta_bloqueada' : 'entrar_fallo')
    throw fallo(401, NO_ENTRA)
  }
  if (!u.activo) throw fallo(403, 'Esta cuenta está desactivada. Escríbenos si crees que es un error.')
  if (!u.email_verificado) throw fallo(403, 'Antes de entrar, confirma tu correo con el enlace que te enviamos.')

  ejecutar('UPDATE usuarios SET fallos = 0, bloqueado_hasta = NULL, ultimo_acceso = ? WHERE id = ?', ahoraIso(), u.id)
  const completa = u.rol === 'entidad' && !u.totp_activo
  crearSesion(c, u, completa)
  anotar(c, u.id, 'entrar')
  return c.json({ falta: pendiente({ rol: u.rol, totpActivo: Boolean(u.totp_activo) }, completa) })
})

cuenta.post('/codigo', exigir({ aMedias: true }), async (c) => {
  const { codigo } = await leer(c, z.object({ codigo: codigo2fa }))
  const yo = c.get('usuario')
  const u = uno<FilaUsuario>('SELECT * FROM usuarios WHERE id = ?', yo.id)!
  if (!u.totp_activo || !u.totp_secreto) throw fallo(400, 'Esta cuenta no tiene doble factor.')
  const sesion = uno<{ intentos_codigo: number }>('SELECT intentos_codigo FROM sesiones WHERE hash = ?', c.get('sesion'))!
  if (sesion.intentos_codigo >= MAX_CODIGOS) {
    cerrarSesion(c)
    throw fallo(401, 'Demasiados códigos incorrectos. Vuelve a entrar.')
  }
  const paso = comprobarCodigo(cifrado.descifrar(u.totp_secreto), codigo, u.totp_ultimo_paso)
  if (paso === null) {
    ejecutar('UPDATE sesiones SET intentos_codigo = intentos_codigo + 1 WHERE hash = ?', c.get('sesion'))
    anotar(c, u.id, 'codigo_fallo')
    throw fallo(400, 'El código no es correcto.')
  }
  ejecutar('UPDATE usuarios SET totp_ultimo_paso = ? WHERE id = ?', paso, u.id)
  ejecutar('UPDATE sesiones SET segundo_factor = 1 WHERE hash = ?', c.get('sesion'))
  return c.json({ falta: null })
})

cuenta.get('/yo', exigir({ aMedias: true }), (c) => {
  const u = c.get('usuario')
  return c.json({ usuario: u, falta: pendiente(u, c.get('segundoFactor')) })
})

cuenta.post('/salir', exigir({ aMedias: true }), (c) => {
  anotar(c, c.get('usuario').id, 'salir')
  cerrarSesion(c)
  return c.json({ ok: true })
})

/** Prepara el doble factor: genera el secreto (aún sin activar) y devuelve el enlace para el código QR. */
cuenta.post('/2fa/preparar', exigir({ aMedias: true }), (c) => {
  const u = c.get('usuario')
  if (u.totpActivo) throw fallo(409, 'El doble factor ya está activado.')
  // Sin segundo factor solo se puede preparar si es una cuenta de dirección que aún no lo tiene.
  if (!c.get('segundoFactor') && u.rol !== 'direccion') throw fallo(401, 'Falta el código de verificación.')
  const secreto = nuevoSecreto()
  ejecutar('UPDATE usuarios SET totp_secreto = ? WHERE id = ?', cifrado.cifrar(secreto), u.id)
  return c.json({ secreto, uri: uriAlta(secreto, u.email) })
})

cuenta.post('/2fa/activar', exigir({ aMedias: true }), async (c) => {
  const { codigo } = await leer(c, z.object({ codigo: codigo2fa }))
  const u = c.get('usuario')
  if (u.totpActivo) throw fallo(409, 'El doble factor ya está activado.')
  if (!c.get('segundoFactor') && u.rol !== 'direccion') throw fallo(401, 'Falta el código de verificación.')
  const fila = uno<FilaUsuario>('SELECT * FROM usuarios WHERE id = ?', u.id)!
  if (!fila.totp_secreto) throw fallo(400, 'Primero hay que preparar el doble factor.')
  const paso = comprobarCodigo(cifrado.descifrar(fila.totp_secreto), codigo, 0)
  if (paso === null) throw fallo(400, 'El código no es correcto. Comprueba que la hora del móvil es la correcta.')
  ejecutar('UPDATE usuarios SET totp_activo = 1, totp_ultimo_paso = ? WHERE id = ?', paso, u.id)
  ejecutar('UPDATE sesiones SET segundo_factor = 1 WHERE hash = ?', c.get('sesion'))
  cerrarOtrasSesiones(u.id, c.get('sesion'))
  anotar(c, u.id, '2fa_activado')
  return c.json({ falta: null })
})

/** Las entidades pueden quitarse el doble factor; dirección no. */
cuenta.post('/2fa/quitar', exigir({ rol: 'entidad' }), async (c) => {
  const datos = await leer(c, z.object({ clave, codigo: codigo2fa }))
  const u = uno<FilaUsuario>('SELECT * FROM usuarios WHERE id = ?', c.get('usuario').id)!
  if (!u.totp_activo || !u.totp_secreto) throw fallo(400, 'El doble factor no está activado.')
  const buena = await comprobarClave(datos.clave, u.hash_clave!)
  const paso = buena ? comprobarCodigo(cifrado.descifrar(u.totp_secreto), datos.codigo, u.totp_ultimo_paso) : null
  if (paso === null) throw fallo(400, 'La contraseña o el código no son correctos.')
  ejecutar('UPDATE usuarios SET totp_activo = 0, totp_secreto = NULL, totp_ultimo_paso = 0 WHERE id = ?', u.id)
  anotar(c, u.id, '2fa_quitado')
  return c.json({ ok: true })
})

cuenta.post('/clave', exigir(), async (c) => {
  const datos = await leer(c, z.object({ actual: clave, nueva: z.string().max(200) }))
  const yo = c.get('usuario')
  if (!permitir(`clave:${yo.id}`, 5, 15 * MINUTO)) throw fallo(429, 'Demasiados intentos. Espera unos minutos.')
  const u = uno<FilaUsuario>('SELECT * FROM usuarios WHERE id = ?', yo.id)!
  if (!(await comprobarClave(datos.actual, u.hash_clave!))) throw fallo(400, 'La contraseña actual no es correcta.')
  const problema = problemaConClave(datos.nueva, u.email)
  if (problema) throw fallo(400, problema)
  ejecutar('UPDATE usuarios SET hash_clave = ? WHERE id = ?', await cifrarClave(datos.nueva), u.id)
  cerrarOtrasSesiones(u.id, c.get('sesion'))
  anotar(c, u.id, 'clave_cambiada')
  return c.json({ ok: true })
})

/** Alta de una asociación o institución. Queda pendiente hasta que dirección la verifique. */
cuenta.post('/alta', async (c) => {
  if (!permitir(`alta:${ipDe(c)}`, 5, 60 * MINUTO)) throw fallo(429, 'Demasiadas altas desde esta conexión. Prueba más tarde.')
  const d = await leer(c, altaEntidad)
  const noGratis = motivoCifNoGratis(d.cif)
  if (noGratis) throw fallo(400, noGratis)
  const problema = problemaConClave(d.clave, d.email)
  if (problema) throw fallo(400, problema)
  const m = uno<{ activo: number }>('SELECT activo FROM municipios WHERE id = ?', d.municipioId)
  if (!m?.activo) throw fallo(400, 'Elige un municipio de la lista.')
  if (uno('SELECT 1 FROM entidades WHERE cif = ?', d.cif)) {
    throw fallo(409, 'Esta entidad ya tiene cuenta. Si no sabéis quién la abrió, escribidnos.')
  }
  const hash = await cifrarClave(d.clave)
  const yaExiste = uno('SELECT 1 FROM usuarios WHERE email = ?', d.email)
  if (yaExiste) {
    // No se dice si el correo ya existe: se avisa a ese correo y se responde igual que siempre.
    await enviarCorreo({ para: d.email, asunto: 'Intento de alta en Valverde Cuenta',
      texto: `Alguien ha intentado dar de alta una entidad con este correo, que ya tiene cuenta.\nSi has sido tú y no recuerdas la contraseña: ${enlaceGestion('/olvide')}` })
    return c.json({ ok: true })
  }
  const usuarioId = transaccion(() => {
    const e = ejecutar(
      'INSERT INTO entidades (nombre, tipo, cif, municipio_id, persona_contacto, telefono, web) VALUES (?, ?, ?, ?, ?, ?, ?)',
      d.nombre, d.tipo, d.cif, d.municipioId, d.personaContacto, d.telefono.replace(/\s/g, ''), d.web,
    )
    const u = ejecutar("INSERT INTO usuarios (email, nombre, rol, entidad_id, hash_clave) VALUES (?, ?, 'entidad', ?, ?)",
      d.email, d.personaContacto, Number(e.lastInsertRowid), hash)
    return Number(u.lastInsertRowid)
  })
  anotar(c, usuarioId, 'alta_entidad', `entidad:${d.cif}`, d.nombre)
  await enviarCorreo({
    para: d.email, asunto: 'Confirma tu correo · Valverde Cuenta',
    texto: `Hola, ${d.personaContacto}:\n\nPara terminar el alta de «${d.nombre}», confirma tu correo en este enlace (vale 48 horas):\n${enlaceGestion(`/verificar?t=${crearFicha(usuarioId, 'verificar', 48)}`)}\n\nDespués revisaremos los datos de la entidad y os avisaremos.`,
  })
  return c.json({ ok: true })
})

cuenta.post('/verificar', async (c) => {
  const { token } = await leer(c, z.object({ token: z.string().min(10).max(100) }))
  const usuarioId = gastarFicha(token, 'verificar')
  ejecutar('UPDATE usuarios SET email_verificado = 1 WHERE id = ?', usuarioId)
  anotar(c, usuarioId, 'correo_verificado')
  const e = uno<{ nombre: string; estado: string }>(
    'SELECT e.nombre, e.estado FROM usuarios u JOIN entidades e ON e.id = u.entidad_id WHERE u.id = ?', usuarioId)
  if (e?.estado === 'pendiente') await avisarDireccion('Nueva entidad por verificar', `«${e.nombre}» ha pedido alta en la agenda.`)
  return c.json({ ok: true })
})

/** Siempre responde lo mismo, exista o no el correo. */
cuenta.post('/olvide', async (c) => {
  const datos = await leer(c, z.object({ email }))
  if (!permitir(`olvide:${ipDe(c)}`, 5, 60 * MINUTO) || !permitir(`olvide:${datos.email}`, 3, 60 * MINUTO)) {
    return c.json({ ok: true })
  }
  const u = uno<{ id: number; email_verificado: number; activo: number }>('SELECT id, email_verificado, activo FROM usuarios WHERE email = ?', datos.email)
  if (u?.activo) {
    await enviarCorreo({
      para: datos.email, asunto: 'Cambiar la contraseña · Valverde Cuenta',
      texto: `Para poner una contraseña nueva, entra en este enlace (vale 1 hora):\n${enlacePonerClave(u.id, 1)}\n\nSi no lo has pedido tú, ignora este correo: tu contraseña sigue igual.`,
    })
    anotar(c, u.id, 'clave_pedida')
  }
  return c.json({ ok: true })
})

cuenta.post('/restablecer', async (c) => {
  const datos = await leer(c, z.object({ token: z.string().min(10).max(100), clave: z.string().max(200) }))
  const fila = uno<{ email: string }>(
    "SELECT u.email FROM fichas f JOIN usuarios u ON u.id = f.usuario_id WHERE f.hash = ? AND f.tipo = 'clave'", huella(datos.token))
  const problema = problemaConClave(datos.clave, fila?.email)
  if (fila && problema) throw fallo(400, problema)
  const usuarioId = gastarFicha(datos.token, 'clave')
  // Poner la contraseña desde el correo también demuestra que el correo es suyo.
  ejecutar('UPDATE usuarios SET hash_clave = ?, email_verificado = 1, fallos = 0, bloqueado_hasta = NULL WHERE id = ?',
    await cifrarClave(datos.clave), usuarioId)
  cerrarOtrasSesiones(usuarioId)
  anotar(c, usuarioId, 'clave_restablecida')
  return c.json({ ok: true })
})
