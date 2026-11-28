/**
 * Servidor de mentira para la demostración (VITE_DEMO=1): responde a las mismas rutas que el
 * de verdad, pero con los datos del navegador (demo/almacen.ts). Las reglas importantes se imitan
 * (quién puede hacer qué, estados de los eventos); la seguridad real está en el servidor.
 */
import { LETRAS_GRATIS, motivoCifNoGratis, normalizarCif } from '../../compartido/cif.ts'
import { escenaPorDefecto } from '../../compartido/categorias.ts'
import { blobADataUrl, prepararFoto } from '../../navegador/medios.ts'
import { documentoComercioValido } from '../../compartido/cif.ts'
import type { DatosComercio, TipoPlan } from '../../compartido/tipos.ts'
import {
  aGestionDemo, aOfertaDemo, aPlanDemo, campanasDemo, capacidadesDemo, hoyDemo, renovacionesDemo, type ComercioDemo,
} from '../../demo/comercios.ts'
import type { DatosEvento, EstadoEntidad, EstadoEvento } from '../../compartido/tipos.ts'
import {
  aFotoDemo, CUENTAS_DEMO, cancelarInscripcionDemo, guardarHistoriaDemo, type HistoriaDemo, conDistancia, guardarAlmacen, leerAlmacen, listaInscripcionesDemo, type AlmacenDemo, type EntidadDemo, type EventoDemo, type UsuarioDemo,
} from '../../demo/almacen.ts'

class FalloDemo extends Error {
  estado: number
  constructor(estado: number, mensaje: string) {
    super(mensaje)
    this.estado = estado
  }
}

const fallo = (estado: number, mensaje: string) => new FalloDemo(estado, mensaje)
const ahora = () => new Date().toISOString().replace(/\.\d+Z$/, 'Z')
type Cuerpo = Record<string, unknown>

function apuntar(a: AlmacenDemo, usuarioId: number | null, accion: string, objeto = '', detalle = '') {
  a.registro.unshift({ id: a.siguienteId++, fecha: ahora(), accion, objeto, detalle, ip: 'demostración', usuarioId })
  a.registro = a.registro.slice(0, 300)
}

function yo(a: AlmacenDemo, { aMedias = false } = {}) {
  if (!a.sesion) throw fallo(401, 'Tienes que entrar con tu cuenta.')
  if (!a.sesion.segundoFactor && !aMedias) throw fallo(401, 'Falta el código de verificación.')
  const u = a.usuarios.find((x) => x.id === a.sesion!.usuarioId)
  if (!u) throw fallo(401, 'Tienes que entrar con tu cuenta.')
  return u
}

function usuarioPublico(a: AlmacenDemo, u: UsuarioDemo) {
  const e = a.entidades.find((x) => x.id === u.entidadId)
  const c = a.comercios.find((x) => x.id === u.comercioId)
  return {
    id: u.id, email: u.email, nombre: u.nombre, rol: u.rol, totpActivo: u.totpActivo,
    entidadId: u.entidadId, entidadNombre: e?.nombre ?? null, entidadEstado: e?.estado ?? null,
    comercioId: c?.id ?? null, comercioNombre: c?.nombre ?? null, comercioEstado: c?.estado ?? null,
  }
}

const falta = (u: UsuarioDemo, segundoFactor: boolean) =>
  segundoFactor ? null : u.totpActivo ? 'codigo' : u.rol === 'direccion' ? 'alta2fa' : null

const aGestion = (a: AlmacenDemo, e: EventoDemo) => ({
  ...e, entidadNombre: a.entidades.find((x) => x.id === e.entidadId)?.nombre ?? '',
  imagenUrl: e.imagen ? a.imagenes[e.imagen] ?? null : null,
  cambiosImagenUrl: e.cambios?.imagen ? a.imagenes[e.cambios.imagen] ?? null : null,
})

/** Como en el servidor real: avisa a la entidad en su panel y devuelve su nombre. */
function avisarEntidad(a: AlmacenDemo, entidadId: number, tipo: 'bien' | 'mal' | 'info', titulo: string, texto: string, eventoId: number | null = null) {
  a.avisos.unshift({ id: a.siguienteId++, entidadId, tipo, titulo, texto, eventoId, leido: false, creado: ahora() })
  return a.entidades.find((e) => e.id === entidadId)?.nombre ?? ''
}

function aEntidad(a: AlmacenDemo, e: EntidadDemo) {
  const u = a.usuarios.find((x) => x.entidadId === e.id)
  return {
    ...e, municipio: a.municipios.find((m) => m.id === e.municipioId)?.nombre ?? '',
    tipoCif: e.cif ? (LETRAS_GRATIS[e.cif[0]] ?? 'No admitido') : null,
    email: u?.email ?? null, emailVerificado: true, eventos: a.eventos.filter((x) => x.entidadId === e.id).length,
  }
}

function evento(a: AlmacenDemo, id: number, entidadId?: number) {
  const e = a.eventos.find((x) => x.id === id)
  if (!e || (entidadId !== undefined && e.entidadId !== entidadId)) throw fallo(404, 'Ese evento no existe.')
  return e
}

/** Comprobaciones básicas del evento, con los mismos mensajes que el servidor. */
function comprobarEvento(a: AlmacenDemo, d: DatosEvento, enviar: boolean) {
  if (!d.titulo || d.titulo.trim().length < 3) throw fallo(400, 'Título: escribe al menos 3 caracteres.')
  if (!d.resumen || d.resumen.trim().length < 10) throw fallo(400, 'Resumen: escribe al menos 10 caracteres.')
  if (!d.descripcion || d.descripcion.trim().length < 20) throw fallo(400, 'Descripción: escribe al menos 20 caracteres.')
  if (!d.inicio || !d.fin) throw fallo(400, 'Fecha y hora no válidas.')
  if (d.fin <= d.inicio) throw fallo(400, 'El final tiene que ser después del inicio.')
  if (!d.lugar || d.lugar.trim().length < 2) throw fallo(400, 'Lugar: escribe al menos 2 caracteres.')
  if (!a.municipios.find((m) => m.id === d.municipioId && m.activo)) throw fallo(400, 'Ese municipio no está en la zona de la agenda.')
  if (d.enlace && !/^https?:\/\//i.test(d.enlace)) throw fallo(400, 'El enlace debe empezar por https://')
  if (d.imagen && !a.imagenes[d.imagen]) throw fallo(400, 'La imagen no es válida. Vuelve a subirla.')
  if (enviar && d.fin <= new Date().toISOString().slice(0, 16)) throw fallo(400, 'Ese evento ya ha terminado.')
}

const datos = (d: DatosEvento): DatosEvento => ({
  titulo: d.titulo.trim(), resumen: d.resumen.trim(), descripcion: d.descripcion.trim(), inicio: d.inicio, fin: d.fin,
  lugar: d.lugar.trim(), municipioId: d.municipioId, lat: d.lat, lng: d.lng, precio: d.precio || null,
  publico: d.publico.trim(), categoria: d.categoria, paraNinos: d.paraNinos, enlace: d.enlace.trim(), imagen: d.imagen ?? null,
  inscripcion: d.inscripcion ?? null,
})

type Manejador = (a: AlmacenDemo, p: string[], cuerpo: Cuerpo, consulta: URLSearchParams) => unknown
const RUTAS: [string, RegExp, Manejador][] = []
const ruta = (metodo: string, patron: string, fn: Manejador) =>
  RUTAS.push([metodo, new RegExp(`^${patron.replace(/:\w+/g, '([^/]+)')}$`), fn])

// ——— Cuenta ———

ruta('GET', '/cuenta/yo', (a) => {
  const u = yo(a, { aMedias: true })
  return { usuario: usuarioPublico(a, u), falta: falta(u, a.sesion!.segundoFactor) }
})

ruta('POST', '/cuenta/entrar', (a, _, c) => {
  const u = a.usuarios.find((x) => x.email === String(c.email ?? '').trim().toLowerCase())
  if (!u || u.clave !== c.clave) throw fallo(401, 'Correo o contraseña incorrectos.')
  const completa = u.rol !== 'direccion' && !u.totpActivo
  a.sesion = { usuarioId: u.id, segundoFactor: completa }
  apuntar(a, u.id, 'entrar')
  return { falta: falta(u, completa) }
})

ruta('POST', '/cuenta/codigo', (a, _, c) => {
  const u = yo(a, { aMedias: true })
  if (!/^\d{6}$/.test(String(c.codigo))) throw fallo(400, 'El código son 6 cifras.')
  if (c.codigo !== CUENTAS_DEMO.direccion.codigo) throw fallo(400, `El código no es correcto. En la demostración es ${CUENTAS_DEMO.direccion.codigo}.`)
  a.sesion!.segundoFactor = true
  apuntar(a, u.id, 'entrar')
  return { falta: null }
})

ruta('POST', '/cuenta/salir', (a) => {
  if (a.sesion) apuntar(a, a.sesion.usuarioId, 'salir')
  a.sesion = null
  return { ok: true }
})

ruta('POST', '/cuenta/2fa/preparar', (a) => {
  const u = yo(a, { aMedias: true })
  const secreto = 'DEMODEMODEMODEMODEMODEMODEMODEMO'
  return { secreto, uri: `otpauth://totp/${encodeURIComponent(`Valverde Cuenta (demo):${u.email}`)}?secret=${secreto}&issuer=Valverde%20Cuenta%20demo` }
})

ruta('POST', '/cuenta/2fa/activar', (a, _, c) => {
  const u = yo(a, { aMedias: true })
  if (!/^\d{6}$/.test(String(c.codigo))) throw fallo(400, 'El código son 6 cifras.')
  u.totpActivo = true
  a.sesion!.segundoFactor = true
  apuntar(a, u.id, '2fa_activado')
  return { falta: null }
})

ruta('POST', '/cuenta/2fa/quitar', (a) => {
  const u = yo(a)
  u.totpActivo = false
  apuntar(a, u.id, '2fa_quitado')
  return { ok: true }
})

ruta('POST', '/cuenta/clave', (a, _, c) => {
  const u = yo(a)
  if (c.actual !== u.clave) throw fallo(400, 'La contraseña actual no es correcta.')
  if (String(c.nueva ?? '').length < 12) throw fallo(400, 'La contraseña debe tener al menos 12 caracteres.')
  u.clave = String(c.nueva)
  apuntar(a, u.id, 'clave_cambiada')
  return { ok: true }
})

ruta('POST', '/cuenta/alta', (a, _, c) => {
  const cif = normalizarCif(String(c.cif ?? ''))
  const motivo = motivoCifNoGratis(cif)
  if (motivo) throw fallo(400, motivo)
  const email = String(c.email ?? '').trim().toLowerCase()
  if (a.usuarios.some((u) => u.email === email)) throw fallo(409, 'Ya hay una cuenta con ese correo.')
  if (a.entidades.some((e) => e.cif === cif)) throw fallo(409, 'Esta entidad ya tiene cuenta.')
  if (String(c.clave ?? '').length < 12) throw fallo(400, 'La contraseña debe tener al menos 12 caracteres.')
  const entidad: EntidadDemo = {
    id: a.siguienteId++, nombre: String(c.nombre), tipo: String(c.tipo), cif, municipioId: Number(c.municipioId),
    personaContacto: String(c.personaContacto), telefono: String(c.telefono), web: String(c.web ?? ''), estado: 'pendiente',
    motivo: null, nota: '', interna: false, creado: ahora(), revisado: null,
  }
  a.entidades.push(entidad)
  // En la demo no hay correos: la cuenta queda con el correo ya confirmado.
  a.usuarios.push({ id: a.siguienteId++, email, clave: String(c.clave), nombre: entidad.personaContacto, rol: 'entidad', entidadId: entidad.id, totpActivo: false })
  apuntar(a, null, 'alta_entidad', `entidad:${cif}`, entidad.nombre)
  return { ok: true }
})

ruta('POST', '/cuenta/verificar', () => ({ ok: true }))
ruta('POST', '/cuenta/olvide', () => ({ ok: true }))
ruta('POST', '/cuenta/restablecer', () => {
  throw fallo(400, 'En la demostración no hay correos ni enlaces. Las contraseñas se ven en la pantalla de entrada.')
})

// ——— Municipios ———

ruta('GET', '/publico/municipios', (a) => a.municipios.filter((m) => m.activo).map(conDistancia))
ruta('GET', '/municipios/todos', (a) => a.municipios.map(conDistancia))

// ——— Entidad ———

function entidadDe(a: AlmacenDemo) {
  const u = yo(a)
  if (u.rol !== 'entidad') throw fallo(403, 'No tienes permiso para esto.')
  const e = a.entidades.find((x) => x.id === u.entidadId)!
  return { u, e }
}

function exigirVerificada(e: EntidadDemo) {
  if (e.estado !== 'verificada') {
    throw fallo(403, e.estado === 'pendiente'
      ? 'Estamos revisando los datos de vuestra entidad. Podéis preparar borradores mientras tanto.'
      : 'Vuestra entidad no puede publicar eventos ahora mismo.')
  }
}

ruta('GET', '/entidad/eventos', (a) => {
  const { e } = entidadDe(a)
  return a.eventos.filter((x) => x.entidadId === e.id).map((x) => aGestion(a, x)).reverse()
})

ruta('GET', '/entidad/eventos/(\\d+)', (a, [id]) => aGestion(a, evento(a, Number(id), entidadDe(a).e.id)))

ruta('POST', '/entidad/eventos', (a, _, c) => {
  const { u, e } = entidadDe(a)
  const d = c.evento as DatosEvento
  const enviar = Boolean(c.enviar)
  comprobarEvento(a, d, enviar)
  if (enviar) {
    exigirVerificada(e)
    if (!c.declaracion) throw fallo(400, 'Marca la casilla de la declaración para enviarlo.')
  }
  const t = ahora()
  const nuevo: EventoDemo = {
    ...datos(d), id: a.siguienteId++, slug: `demo-${a.siguienteId}`, estado: enviar ? 'pendiente' : 'borrador', entidadId: e.id,
    organizador: null, escena: escenaPorDefecto(d.categoria), enlazaYincana: false, motivo: null, cambios: null,
    creado: t, actualizado: t, enviado: enviar ? t : null,
  }
  a.eventos.push(nuevo)
  apuntar(a, u.id, enviar ? 'evento_enviado' : 'evento_borrador', `evento:${nuevo.id}`, nuevo.titulo)
  return { id: nuevo.id }
})

ruta('PUT', '/entidad/eventos/(\\d+)', (a, [id], c) => {
  const { u, e } = entidadDe(a)
  const ev = evento(a, Number(id), e.id)
  const d = c.evento as DatosEvento
  const enviar = Boolean(c.enviar)
  if (ev.estado === 'publicado') {
    exigirVerificada(e)
    if (!c.declaracion) throw fallo(400, 'Marca la casilla de la declaración para enviar los cambios.')
    comprobarEvento(a, d, true)
    ev.cambios = datos(d)
    ev.actualizado = ahora()
    apuntar(a, u.id, 'cambios_enviados', `evento:${ev.id}`, d.titulo)
    return { id: ev.id, estado: ev.estado }
  }
  if (!['borrador', 'rechazado', 'pendiente'].includes(ev.estado)) throw fallo(409, 'Este evento ya no se puede cambiar.')
  const estado: EstadoEvento = enviar || ev.estado === 'pendiente' ? 'pendiente' : 'borrador'
  comprobarEvento(a, d, estado === 'pendiente')
  if (estado === 'pendiente') {
    exigirVerificada(e)
    if (!c.declaracion) throw fallo(400, 'Marca la casilla de la declaración para enviarlo.')
  }
  Object.assign(ev, datos(d), { estado, actualizado: ahora(), motivo: null })
  if (estado === 'pendiente') ev.enviado = ahora()
  apuntar(a, u.id, estado === 'pendiente' ? 'evento_enviado' : 'evento_borrador', `evento:${ev.id}`, ev.titulo)
  return { id: ev.id, estado }
})

ruta('DELETE', '/entidad/eventos/(\\d+)/cambios', (a, [id]) => {
  evento(a, Number(id), entidadDe(a).e.id).cambios = null
  return { ok: true }
})

ruta('POST', '/entidad/eventos/(\\d+)/cancelar', (a, [id]) => {
  const { u, e } = entidadDe(a)
  const ev = evento(a, Number(id), e.id)
  if (ev.estado !== 'publicado') throw fallo(409, 'Solo se puede cancelar un evento publicado.')
  ev.estado = 'cancelado'
  ev.cambios = null
  apuntar(a, u.id, 'evento_cancelado', `evento:${ev.id}`, ev.titulo)
  return { ok: true }
})

ruta('DELETE', '/entidad/eventos/(\\d+)', (a, [id]) => {
  const { u, e } = entidadDe(a)
  const ev = evento(a, Number(id), e.id)
  if (!['borrador', 'rechazado', 'pendiente'].includes(ev.estado)) throw fallo(409, 'Un evento publicado no se borra: se cancela.')
  a.eventos = a.eventos.filter((x) => x.id !== ev.id)
  apuntar(a, u.id, 'evento_borrado', `evento:${ev.id}`, ev.titulo)
  return { ok: true }
})

ruta('GET', '/entidad/avisos', (a) => {
  const { e } = entidadDe(a)
  return a.avisos.filter((x) => x.entidadId === e.id).map(({ entidadId: _, ...x }) => x)
})

ruta('POST', '/entidad/avisos/leidos', (a) => {
  const { e } = entidadDe(a)
  a.avisos.forEach((x) => {
    if (x.entidadId === e.id) x.leido = true
  })
  return { ok: true }
})

ruta('GET', '/entidad/eventos/(\\d+)/fotos', (a, [id]) => {
  const ev = evento(a, Number(id), entidadDe(a).e.id)
  return a.fotos.filter((f) => f.eventoId === ev.id).map((f) => aFotoDemo(a, f))
})

ruta('POST', '/entidad/eventos/(\\d+)/fotos', (a, [id], c) => {
  const { u, e } = entidadDe(a)
  const ev = evento(a, Number(id), e.id)
  if (!['publicado', 'cancelado'].includes(ev.estado)) throw fallo(409, 'Solo se añaden fotos a eventos publicados.')
  if (!a.imagenes[String(c.imagen)]) throw fallo(400, 'La imagen no es válida. Vuelve a subirla.')
  const foto = { id: a.siguienteId++, eventoId: ev.id, imagen: String(c.imagen), pie: String(c.pie ?? ''), estado: 'pendiente' as const, creado: ahora() }
  a.fotos.push(foto)
  apuntar(a, u.id, 'foto_enviada', `evento:${ev.id}`, ev.titulo)
  return { id: foto.id }
})

ruta('DELETE', '/entidad/fotos/(\\d+)', (a, [id]) => {
  const { e } = entidadDe(a)
  const f = a.fotos.find((x) => x.id === Number(id))
  if (!f || a.eventos.find((x) => x.id === f.eventoId)?.entidadId !== e.id) throw fallo(404, 'Esa foto no existe.')
  a.fotos = a.fotos.filter((x) => x.id !== f.id)
  return { ok: true }
})

ruta('GET', '/entidad/eventos/(\\d+)/inscripciones', (a, [id]) => listaInscripcionesDemo(a, evento(a, Number(id), entidadDe(a).e.id).id))

ruta('POST', '/entidad/inscripciones/(\\d+)/cancelar', (a, [id]) => {
  const { e } = entidadDe(a)
  const i = a.inscripciones.find((x) => x.id === Number(id))
  if (!i || a.eventos.find((x) => x.id === i.eventoId)?.entidadId !== e.id) throw fallo(404, 'Esa inscripción no existe.')
  cancelarInscripcionDemo(a, i)
  return { ok: true }
})

// ——— Dirección ———

function direccion(a: AlmacenDemo) {
  const u = yo(a)
  if (u.rol !== 'direccion') throw fallo(403, 'No tienes permiso para esto.')
  return u
}

const pendientes = (a: AlmacenDemo) => ({
  entidades: a.entidades.filter((e) => e.estado === 'pendiente').map((e) => aEntidad(a, e)),
  eventos: a.eventos.filter((e) => e.estado === 'pendiente').map((e) => aGestion(a, e)),
  cambios: a.eventos.filter((e) => e.estado === 'publicado' && e.cambios).map((e) => aGestion(a, e)),
  historias: a.historias.filter((h) => h.estado === 'pendiente').map((h) => aHistoriaGestionDemo(a, h)),
  comercios: a.comercios.filter((c) => c.estado === 'pendiente').map((c) => aGestionDemo(a, c)),
  cambiosComercio: a.comercios.filter((c) => c.estado === 'verificado' && c.cambios).map((c) => aGestionDemo(a, c)),
  ofertas: a.ofertas.filter((o) => o.estado === 'pendiente').map((o) => aOfertaDemo(a, o)),
  renovaciones: renovacionesDemo(a),
  fotos: [...new Set(a.fotos.filter((f) => f.estado === 'pendiente').map((f) => f.eventoId))].map((eventoId) => {
    const ev = a.eventos.find((e) => e.id === eventoId)!
    return {
      eventoId, titulo: ev.titulo, inicio: ev.inicio, entidadNombre: a.entidades.find((x) => x.id === ev.entidadId)?.nombre ?? '',
      fotos: a.fotos.filter((f) => f.eventoId === eventoId && f.estado === 'pendiente').map((f) => aFotoDemo(a, f)),
    }
  }),
})

ruta('GET', '/direccion/pendientes', (a) => {
  direccion(a)
  return pendientes(a)
})

ruta('GET', '/direccion/resumen', (a) => {
  direccion(a)
  const p = pendientes(a)
  return {
    pendientes: p.entidades.length + p.eventos.length + p.cambios.length + p.fotos.length + p.historias.length
      + p.comercios.length + p.cambiosComercio.length + p.ofertas.length + p.renovaciones.length,
  }
})

ruta('GET', '/direccion/eventos', (a, _, __, q) => {
  direccion(a)
  const estado = q.get('estado')
  return a.eventos.filter((e) => (estado ? e.estado === estado : e.estado !== 'borrador'))
    .sort((x, y) => x.inicio.localeCompare(y.inicio)).map((e) => aGestion(a, e))
})

ruta('GET', '/direccion/eventos/(\\d+)', (a, [id]) => {
  direccion(a)
  return aGestion(a, evento(a, Number(id)))
})

ruta('POST', '/direccion/eventos', (a, _, c) => {
  const u = direccion(a)
  const d = c.evento as DatosEvento
  const ajustes = c.ajustes as { escena: EventoDemo['escena']; enlazaYincana: boolean; organizador: string | null }
  comprobarEvento(a, d, false)
  const en = a.entidades.find((e) => e.id === Number(c.entidadId))
  if (!en || en.estado !== 'verificada') throw fallo(400, 'Elige una entidad verificada.')
  if (en.interna && !ajustes.organizador) throw fallo(400, 'Escribe quién organiza el evento.')
  const t = ahora()
  const nuevo: EventoDemo = {
    ...datos(d), id: a.siguienteId++, slug: `demo-${a.siguienteId}`, estado: 'publicado', entidadId: en.id,
    organizador: en.interna ? ajustes.organizador : null, escena: ajustes.escena, enlazaYincana: ajustes.enlazaYincana,
    motivo: null, cambios: null, creado: t, actualizado: t, enviado: t,
  }
  a.eventos.push(nuevo)
  apuntar(a, u.id, 'evento_creado_direccion', `evento:${nuevo.id}`, nuevo.titulo)
  return { id: nuevo.id }
})

ruta('PUT', '/direccion/eventos/(\\d+)', (a, [id], c) => {
  const u = direccion(a)
  const ev = evento(a, Number(id))
  const d = c.evento as DatosEvento
  const ajustes = c.ajustes as { escena: EventoDemo['escena']; enlazaYincana: boolean; organizador: string | null }
  comprobarEvento(a, d, false)
  Object.assign(ev, datos(d), { escena: ajustes.escena, enlazaYincana: ajustes.enlazaYincana, actualizado: ahora() })
  if (ev.organizador !== null) ev.organizador = ajustes.organizador
  apuntar(a, u.id, 'evento_editado_direccion', `evento:${ev.id}`, ev.titulo)
  return { ok: true }
})

const MENSAJES: Record<string, (t: string, m: string) => [titulo: string, texto: string, tipo: 'bien' | 'mal']> = {
  evento_publicado: (t) => ['Evento publicado', `«${t}» ya está en la agenda. ¡Gracias!`, 'bien'],
  evento_rechazado: (t, m) => ['Evento no publicado', `No hemos publicado «${t}» por este motivo:\n\n${m}\n\nPodéis corregirlo y volver a enviarlo.`, 'mal'],
  evento_retirado: (t, m) => ['Evento retirado', `Hemos retirado «${t}» de la agenda por este motivo:\n\n${m}`, 'mal'],
}

const cambio = (desde: EstadoEvento[], hasta: EstadoEvento, accion: string, conMotivo = false): Manejador => (a, [id], c) => {
  const u = direccion(a)
  const ev = evento(a, Number(id))
  if (!desde.includes(ev.estado)) throw fallo(409, 'Este evento no está en un estado que permita esto.')
  if (conMotivo && String(c.motivo ?? '').trim().length < 5) throw fallo(400, 'Motivo: escribe al menos 5 caracteres.')
  ev.estado = hasta
  ev.motivo = conMotivo ? String(c.motivo).trim() : null
  if (hasta === 'retirado') ev.cambios = null
  apuntar(a, u.id, accion, `evento:${ev.id}`, conMotivo ? ev.motivo! : ev.titulo)
  const mensaje = MENSAJES[accion]?.(ev.titulo, ev.motivo ?? '')
  const avisado = mensaje && ev.entidadId !== 1 ? avisarEntidad(a, ev.entidadId, mensaje[2], mensaje[0], mensaje[1], ev.id) : undefined
  return { ok: true, avisado }
}

ruta('POST', '/direccion/eventos/(\\d+)/aprobar', cambio(['pendiente'], 'publicado', 'evento_publicado'))
ruta('POST', '/direccion/eventos/(\\d+)/rechazar', cambio(['pendiente'], 'rechazado', 'evento_rechazado', true))
ruta('POST', '/direccion/eventos/(\\d+)/retirar', cambio(['publicado', 'cancelado'], 'retirado', 'evento_retirado', true))
ruta('POST', '/direccion/eventos/(\\d+)/republicar', cambio(['retirado', 'cancelado', 'rechazado'], 'publicado', 'evento_republicado'))

ruta('POST', '/direccion/eventos/(\\d+)/aprobar-cambios', (a, [id]) => {
  const u = direccion(a)
  const ev = evento(a, Number(id))
  if (!ev.cambios) throw fallo(409, 'No hay cambios pendientes en este evento.')
  Object.assign(ev, ev.cambios, { cambios: null, actualizado: ahora() })
  apuntar(a, u.id, 'cambios_aprobados', `evento:${ev.id}`, ev.titulo)
  return { ok: true, avisado: avisarEntidad(a, ev.entidadId, 'bien', 'Cambios publicados', `Los cambios en «${ev.titulo}» ya se ven en la agenda.`, ev.id) }
})

ruta('POST', '/direccion/eventos/(\\d+)/rechazar-cambios', (a, [id], c) => {
  const u = direccion(a)
  const ev = evento(a, Number(id))
  if (!ev.cambios) throw fallo(409, 'No hay cambios pendientes en este evento.')
  ev.cambios = null
  ev.motivo = String(c.motivo ?? '')
  apuntar(a, u.id, 'cambios_rechazados', `evento:${ev.id}`, ev.motivo)
  return { ok: true, avisado: avisarEntidad(a, ev.entidadId, 'mal', 'Cambios no publicados', `No hemos aplicado los cambios en «${ev.titulo}» por este motivo:\n\n${ev.motivo}\n\nEl evento sigue publicado como estaba.`, ev.id) }
})

ruta('GET', '/direccion/eventos/(\\d+)/fotos', (a, [id]) => {
  direccion(a)
  const ev = evento(a, Number(id))
  return a.fotos.filter((f) => f.eventoId === ev.id).map((f) => aFotoDemo(a, f))
})

ruta('POST', '/direccion/fotos/revisar', (a, _, c) => {
  const u = direccion(a)
  const aprobar = (c.aprobar as number[]) ?? []
  const rechazar = (c.rechazar as number[]) ?? []
  let avisado = ''
  const porEvento = new Map<number, { si: number; no: number }>()
  for (const [lista, estado] of [[aprobar, 'publicada'], [rechazar, 'rechazada']] as const) {
    for (const id of lista) {
      const f = a.fotos.find((x) => x.id === id)
      if (!f) continue
      f.estado = estado
      const r = porEvento.get(f.eventoId) ?? { si: 0, no: 0 }
      if (estado === 'publicada') r.si++
      else r.no++
      porEvento.set(f.eventoId, r)
    }
  }
  for (const [eventoId, r] of porEvento) {
    const ev = a.eventos.find((e) => e.id === eventoId)!
    const partes = [r.si && (r.si === 1 ? 'Se ha publicado 1 foto' : `Se han publicado ${r.si} fotos`), r.no && `${r.no} no (no cumplían las normas o no se veían bien)`]
    avisado = avisarEntidad(a, ev.entidadId, r.no && !r.si ? 'mal' : 'bien', 'Fotos revisadas', `Hemos revisado las fotos de «${ev.titulo}». ${partes.filter(Boolean).join(' y ')}.`, ev.id)
  }
  apuntar(a, u.id, 'fotos_revisadas', '', `${aprobar.length} aprobadas, ${rechazar.length} rechazadas`)
  return { ok: true, avisado }
})

ruta('POST', '/direccion/fotos/(\\d+)/retirar', (a, [id]) => {
  direccion(a)
  const f = a.fotos.find((x) => x.id === Number(id))
  if (!f) throw fallo(404, 'Esa foto no existe.')
  f.estado = 'rechazada'
  return { ok: true }
})

ruta('GET', '/direccion/eventos/(\\d+)/inscripciones', (a, [id]) => {
  direccion(a)
  return listaInscripcionesDemo(a, evento(a, Number(id)).id)
})

// ——— Historias y lugares ———

function aHistoriaGestionDemo(a: AlmacenDemo, h: HistoriaDemo) {
  return {
    ...h, lugarNombre: a.lugares.find((l) => l.id === h.lugarId)?.nombre ?? null,
    archivos: h.archivos.map((x) => ({ ...x, url: a.imagenes[x.clave] ?? '' })),
  }
}

const historia = (a: AlmacenDemo, id: number) => {
  const h = a.historias.find((x) => x.id === id)
  if (!h) throw fallo(404, 'Esa historia no existe.')
  return h
}

ruta('GET', '/direccion/historias', (a, _, __, q) => {
  direccion(a)
  const estado = q.get('estado')
  return a.historias.filter((h) => !estado || h.estado === estado).map((h) => aHistoriaGestionDemo(a, h))
})

ruta('GET', '/direccion/historias/(\\d+)', (a, [id]) => {
  direccion(a)
  return aHistoriaGestionDemo(a, historia(a, Number(id)))
})

ruta('PUT', '/direccion/historias/(\\d+)', (a, [id], c) => {
  const u = direccion(a)
  const h = historia(a, Number(id))
  if (String(c.titulo ?? '').trim().length < 3) throw fallo(400, 'Ponle un título.')
  Object.assign(h, {
    titulo: String(c.titulo).trim(), texto: String(c.texto ?? ''), epoca: String(c.epoca ?? ''), lugarId: (c.lugarId as number | null) ?? null,
    lugarTexto: String(c.lugarTexto ?? ''), firma: c.firma === 'nombre' ? 'nombre' : 'anonimo', autor: String(c.autor ?? ''), nota: String(c.nota ?? ''),
    actualizado: ahora(),
  })
  for (const x of (c.archivos as { id: number; publicar: boolean; pie: string; orden: number }[]) ?? []) {
    const ar = h.archivos.find((y) => y.id === x.id)
    if (ar) Object.assign(ar, { publicar: x.publicar, pie: x.pie, orden: x.orden })
  }
  apuntar(a, u.id, 'historia_editada', `historia:${h.id}`, h.titulo)
  return { ok: true }
})

const estadoHistoria = (desde: HistoriaDemo['estado'][], hasta: HistoriaDemo['estado'], accion: string, conMotivo = false): Manejador => (a, [id], c) => {
  const u = direccion(a)
  const h = historia(a, Number(id))
  if (!desde.includes(h.estado)) throw fallo(409, 'La historia no está en un estado que permita esto.')
  if (conMotivo && String(c.motivo ?? '').trim().length < 5) throw fallo(400, 'Motivo: escribe al menos 5 caracteres.')
  h.estado = hasta
  h.motivo = conMotivo ? String(c.motivo).trim() : null
  h.actualizado = ahora()
  apuntar(a, u.id, accion, `historia:${h.id}`, h.motivo ?? h.titulo)
  return { ok: true, avisado: hasta === 'publicada' && h.contactoEmail && h.origen === 'web' ? h.contactoNombre || h.contactoEmail : undefined }
}

ruta('POST', '/direccion/historias/(\\d+)/publicar', estadoHistoria(['pendiente', 'retirada', 'rechazada'], 'publicada', 'historia_publicada'))
ruta('POST', '/direccion/historias/(\\d+)/rechazar', estadoHistoria(['pendiente'], 'rechazada', 'historia_rechazada', true))
ruta('POST', '/direccion/historias/(\\d+)/retirar', estadoHistoria(['publicada'], 'retirada', 'historia_retirada', true))

ruta('DELETE', '/direccion/historias/(\\d+)', (a, [id]) => {
  const u = direccion(a)
  const h = historia(a, Number(id))
  if (h.estado === 'publicada') throw fallo(409, 'Primero retírala de la app.')
  h.archivos.forEach((x) => delete a.imagenes[x.clave])
  a.historias = a.historias.filter((x) => x.id !== h.id)
  apuntar(a, u.id, 'historia_borrada', `historia:${h.id}`, h.titulo)
  return { ok: true }
})

const urlApp = () => import.meta.env.VITE_URL_APP ?? new URL('../', location.href).href

ruta('GET', '/direccion/lugares', (a) => {
  direccion(a)
  return a.lugares.map((l) => ({
    ...l, urlQr: `${urlApp()}#/lugar/${l.slug}?qr=1`,
    historias: a.historias.filter((h) => h.estado === 'publicada' && h.lugarId === l.id).length,
    pendientes: a.historias.filter((h) => h.estado === 'pendiente' && h.lugarId === l.id).length,
  }))
})

const datosLugar = (c: Record<string, unknown>) => {
  const nombre = String(c.nombre ?? '').trim()
  if (nombre.length < 2) throw fallo(400, 'Escribe el nombre del lugar.')
  return {
    nombre, descripcion: String(c.descripcion ?? ''), direccion: String(c.direccion ?? ''), lat: Number(c.lat), lng: Number(c.lng),
    anfitrion: String(c.anfitrion ?? ''), activo: Boolean(c.activo),
  }
}

ruta('POST', '/direccion/lugares', (a, _, c) => {
  const u = direccion(a)
  const d = datosLugar(c)
  const base = d.nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'lugar'
  let slug = base
  for (let i = 2; a.lugares.some((l) => l.slug === slug); i++) slug = `${base}-${i}`
  a.lugares.push({ ...d, id: a.siguienteId++, slug, escaneosTotal: 0, escaneos30: 0 })
  apuntar(a, u.id, 'lugar_creado', `lugar:${slug}`, d.nombre)
  return { slug }
})

ruta('PUT', '/direccion/lugares/(\\d+)', (a, [id], c) => {
  const u = direccion(a)
  const l = a.lugares.find((x) => x.id === Number(id))
  if (!l) throw fallo(404, 'Ese lugar no existe.')
  Object.assign(l, datosLugar(c))
  apuntar(a, u.id, 'lugar_cambiado', `lugar:${l.id}`, l.nombre)
  return { ok: true }
})

ruta('GET', '/direccion/entidades', (a) => {
  direccion(a)
  return [...a.entidades].sort((x, y) => Number(y.interna) - Number(x.interna) || x.nombre.localeCompare(y.nombre)).map((e) => aEntidad(a, e))
})

ruta('GET', '/direccion/entidades/(\\d+)', (a, [id]) => {
  direccion(a)
  const e = a.entidades.find((x) => x.id === Number(id))
  if (!e) throw fallo(404, 'Esa entidad no existe.')
  return { ...aEntidad(a, e), listaEventos: a.eventos.filter((x) => x.entidadId === e.id && x.estado !== 'borrador').map((x) => aGestion(a, x)) }
})

const cambioEntidad = (desde: EstadoEntidad[], hasta: EstadoEntidad, accion: string, conMotivo = false): Manejador => (a, [id], c) => {
  const u = direccion(a)
  const e = a.entidades.find((x) => x.id === Number(id))
  if (!e) throw fallo(404, 'Esa entidad no existe.')
  if (e.interna) throw fallo(409, 'La entidad interna de dirección no se puede cambiar.')
  if (!desde.includes(e.estado)) throw fallo(409, 'La entidad no está en un estado que permita esto.')
  if (conMotivo && String(c.motivo ?? '').trim().length < 5) throw fallo(400, 'Motivo: escribe al menos 5 caracteres.')
  e.estado = hasta
  e.motivo = conMotivo ? String(c.motivo).trim() : null
  e.revisado = ahora()
  apuntar(a, u.id, accion, `entidad:${e.id}`, e.motivo ?? e.nombre)
  const textos: Record<string, [string, string, 'bien' | 'mal']> = {
    entidad_verificada: ['Entidad verificada', `«${e.nombre}» ya puede publicar en la agenda. Cada evento lo revisaremos antes de que salga.`, 'bien'],
    entidad_rechazada: ['Alta no aceptada', `No hemos podido dar de alta «${e.nombre}» por este motivo:\n\n${e.motivo}`, 'mal'],
    entidad_suspendida: ['Cuenta suspendida', `Hemos suspendido la cuenta de «${e.nombre}» por este motivo:\n\n${e.motivo}`, 'mal'],
  }
  const t = textos[accion]
  return { ok: true, avisado: t ? avisarEntidad(a, e.id, t[2], t[0], t[1]) : undefined }
}

ruta('POST', '/direccion/entidades/(\\d+)/verificar', cambioEntidad(['pendiente', 'rechazada'], 'verificada', 'entidad_verificada'))
ruta('POST', '/direccion/entidades/(\\d+)/rechazar', cambioEntidad(['pendiente'], 'rechazada', 'entidad_rechazada', true))
ruta('POST', '/direccion/entidades/(\\d+)/suspender', cambioEntidad(['verificada'], 'suspendida', 'entidad_suspendida', true))
ruta('POST', '/direccion/entidades/(\\d+)/reactivar', cambioEntidad(['suspendida'], 'verificada', 'entidad_reactivada'))

ruta('PUT', '/direccion/entidades/(\\d+)/nota', (a, [id], c) => {
  direccion(a)
  const e = a.entidades.find((x) => x.id === Number(id))
  if (!e) throw fallo(404, 'Esa entidad no existe.')
  e.nota = String(c.nota ?? '')
  return { ok: true }
})

ruta('POST', '/direccion/municipios', (a, _, c) => {
  const u = direccion(a)
  const nombre = String(c.nombre ?? '').trim()
  if (nombre.length < 2) throw fallo(400, 'Nombre: escribe al menos 2 caracteres.')
  if (!Number.isFinite(c.lat) || !Number.isFinite(c.lng)) throw fallo(400, 'Las coordenadas no son válidas.')
  a.municipios.push({ id: a.siguienteId++, nombre, lat: Number(c.lat), lng: Number(c.lng), activo: true, esValverde: false })
  apuntar(a, u.id, 'municipio_creado', '', nombre)
  return { ok: true }
})

ruta('PUT', '/direccion/municipios/(\\d+)', (a, [id], c) => {
  const u = direccion(a)
  const m = a.municipios.find((x) => x.id === Number(id))
  if (!m) throw fallo(404, 'Ese municipio no existe.')
  if (m.esValverde && !c.activo) throw fallo(409, 'Valverde no se puede desactivar.')
  m.activo = Boolean(c.activo)
  apuntar(a, u.id, 'municipio_cambiado', `municipio:${m.id}`, `${m.nombre} ${m.activo ? 'activo' : 'inactivo'}`)
  return { ok: true }
})

ruta('GET', '/direccion/registro', (a) => {
  direccion(a)
  return a.registro.slice(0, 100).map((r) => {
    const u = a.usuarios.find((x) => x.id === r.usuarioId)
    return { ...r, quien: u?.nombre ?? null, rol: u?.rol ?? null }
  })
})

ruta('GET', '/direccion/equipo', (a) => {
  direccion(a)
  return a.usuarios.filter((u) => u.rol === 'direccion').map((u) => ({ id: u.id, nombre: u.nombre, email: u.email, dobleFactor: u.totpActivo ? 1 : 0, ultimoAcceso: ahora() }))
})

// ——— Comercios (fase 3) ———

const comercioPorId = (a: AlmacenDemo, id: number) => {
  const c = a.comercios.find((x) => x.id === id)
  if (!c) throw fallo(404, 'Ese comercio no existe.')
  return c
}
const slugDe = (a: AlmacenDemo, nombre: string) => {
  const base = nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'comercio'
  let s = base
  for (let i = 2; a.comercios.some((c) => c.slug === s); i++) s = `${base}-${i}`
  return s
}
function fichaDe(c: Cuerpo): DatosComercio {
  const nombre = String(c.nombre ?? '').trim()
  if (nombre.length < 2) throw fallo(400, 'Nombre: escribe al menos 2 caracteres.')
  if (String(c.direccion ?? '').trim().length < 3) throw fallo(400, 'Dirección: escribe al menos 3 caracteres.')
  return {
    nombre, categoria: c.categoria as DatosComercio['categoria'], descripcion: String(c.descripcion ?? ''), direccion: String(c.direccion).trim(),
    municipioId: Number(c.municipioId), lat: Number(c.lat), lng: Number(c.lng), telefono: String(c.telefono ?? ''), whatsapp: String(c.whatsapp ?? ''),
    emailPublico: String(c.emailPublico ?? ''), web: String(c.web ?? ''), instagram: String(c.instagram ?? ''), facebook: String(c.facebook ?? ''),
    horario: String(c.horario ?? ''), logo: (c.logo as string | null) ?? null, fotos: ((c.fotos as string[]) ?? []).slice(0, 6),
  }
}
function avisarComercioDemo(a: AlmacenDemo, comercioId: number, tipo: 'bien' | 'mal' | 'info', titulo: string, texto: string) {
  a.avisosComercio.unshift({ id: a.siguienteId++, comercioId, tipo, titulo, texto, eventoId: null, leido: false, creado: ahora() })
  return a.comercios.find((c) => c.id === comercioId)?.nombre ?? ''
}

ruta('POST', '/cuenta/alta-comercio', (a, _, c) => {
  const nif = normalizarCif(String(c.nif ?? ''))
  if (!documentoComercioValido(nif)) throw fallo(400, 'El CIF, DNI o NIE no es válido.')
  const email = String(c.email ?? '').trim().toLowerCase()
  if (a.usuarios.some((u) => u.email === email)) throw fallo(409, 'Ya hay una cuenta con ese correo.')
  if (String(c.clave ?? '').length < 12) throw fallo(400, 'La contraseña debe tener al menos 12 caracteres.')
  const m = a.municipios.find((x) => x.id === Number(c.municipioId))
  if (!m) throw fallo(400, 'Elige un municipio de la lista.')
  const id = a.siguienteId++
  a.comercios.push({
    ...fichaDe({ ...c, lat: m.lat, lng: m.lng, fotos: [], logo: null }), id, slug: slugDe(a, String(c.nombre)), nif,
    personaContacto: String(c.personaContacto ?? ''), telefonoContacto: String(c.telefono ?? ''), estado: 'pendiente', motivo: null, nota: '', cambios: null, creado: ahora(), visitas: 0,
  })
  a.usuarios.push({ id: a.siguienteId++, email, clave: String(c.clave), nombre: String(c.personaContacto), rol: 'comercio', entidadId: null, comercioId: id, totpActivo: false })
  apuntar(a, null, 'alta_comercio', `comercio:${nif}`, String(c.nombre))
  return { ok: true }
})

// El propio comercio
function miComercio(a: AlmacenDemo) {
  const u = yo(a)
  if (u.rol !== 'comercio') throw fallo(403, 'No tienes permiso para esto.')
  return { u, c: comercioPorId(a, u.comercioId!) }
}

ruta('GET', '/comercio/yo', (a) => {
  const { c } = miComercio(a)
  return { ...aGestionDemo(a, c), planes: a.planes.filter((p) => p.comercioId === c.id).map((p) => aPlanDemo(a, p)) }
})

ruta('PUT', '/comercio/ficha', (a, _, cuerpo) => {
  const { u, c } = miComercio(a)
  const d = fichaDe(cuerpo)
  if (!capacidadesDemo(a, c.id).escaparate) Object.assign(d, { descripcion: '', whatsapp: '', emailPublico: '', web: '', instagram: '', facebook: '', logo: null, fotos: [] })
  if (c.estado === 'pendiente') Object.assign(c, d)
  else c.cambios = d
  apuntar(a, u.id, 'ficha_comercio_enviada', `comercio:${c.id}`, d.nombre)
  return { ok: true, revision: c.estado !== 'pendiente' }
})

ruta('DELETE', '/comercio/ficha/cambios', (a) => {
  miComercio(a).c.cambios = null
  return { ok: true }
})

ruta('GET', '/comercio/ofertas', (a) => {
  const { c } = miComercio(a)
  return a.ofertas.filter((o) => o.comercioId === c.id).map((o) => aOfertaDemo(a, o))
})

const guardarOfertaDemo = (a: AlmacenDemo, id: number | null, cuerpo: Cuerpo) => {
  const { u, c } = miComercio(a)
  if (c.estado !== 'verificado') throw fallo(403, 'Podrás publicar ofertas cuando verifiquemos tu comercio.')
  if (!capacidadesDemo(a, c.id).ofertas) throw fallo(403, 'Para publicar ofertas hace falta un plan (Escaparate, Destacado, Campaña o Promoción).')
  const titulo = String(cuerpo.titulo ?? '').trim()
  if (titulo.length < 3) throw fallo(400, 'Título: escribe al menos 3 caracteres.')
  const datos = { titulo, texto: String(cuerpo.texto ?? ''), imagen: (cuerpo.imagen as string | null) ?? null, desde: String(cuerpo.desde), hasta: String(cuerpo.hasta), campanaId: (cuerpo.campanaId as number | null) ?? null }
  if (datos.hasta < datos.desde) throw fallo(400, 'La oferta tiene que acabar después de empezar.')
  if (datos.hasta < hoyDemo()) throw fallo(400, 'Esa oferta ya habría terminado.')
  if (id) {
    const o = a.ofertas.find((x) => x.id === id && x.comercioId === c.id)
    if (!o) throw fallo(404, 'Esa oferta no existe.')
    Object.assign(o, datos, { estado: 'pendiente', motivo: null })
  } else {
    id = a.siguienteId++
    a.ofertas.unshift({ id, comercioId: c.id, ...datos, estado: 'pendiente', motivo: null, creado: ahora() })
  }
  apuntar(a, u.id, 'oferta_enviada', `oferta:${id}`, titulo)
  return { id }
}
ruta('POST', '/comercio/ofertas', (a, _, c) => guardarOfertaDemo(a, null, c))
ruta('PUT', '/comercio/ofertas/(\\d+)', (a, [id], c) => guardarOfertaDemo(a, Number(id), c))
ruta('DELETE', '/comercio/ofertas/(\\d+)', (a, [id]) => {
  const { c } = miComercio(a)
  const o = a.ofertas.find((x) => x.id === Number(id) && x.comercioId === c.id)
  if (!o) throw fallo(404, 'Esa oferta no existe.')
  if (o.estado === 'publicada') o.estado = 'retirada'
  else a.ofertas = a.ofertas.filter((x) => x.id !== o.id)
  return { ok: true }
})
ruta('GET', '/comercio/avisos', (a) => {
  const { c } = miComercio(a)
  return a.avisosComercio.filter((x) => x.comercioId === c.id).map(({ comercioId: _, ...x }) => x)
})
ruta('POST', '/comercio/avisos/leidos', (a) => {
  const { c } = miComercio(a)
  a.avisosComercio.forEach((x) => {
    if (x.comercioId === c.id) x.leido = true
  })
  return { ok: true }
})
ruta('GET', '/comercio/campanas', (a) => {
  const { c } = miComercio(a)
  const mias = capacidadesDemo(a, c.id).campanas
  return campanasDemo(a).filter((x) => mias.includes(x.id))
})

// Dirección
ruta('GET', '/direccion/comercios', (a) => {
  direccion(a)
  return [...a.comercios].sort((x, y) => x.nombre.localeCompare(y.nombre)).map((c) => aGestionDemo(a, c))
})
ruta('GET', '/direccion/comercios/(\\d+)', (a, [id]) => {
  direccion(a)
  const c = comercioPorId(a, Number(id))
  return {
    ...aGestionDemo(a, c), planes: a.planes.filter((p) => p.comercioId === c.id).sort((x, y) => y.desde.localeCompare(x.desde)).map((p) => aPlanDemo(a, p)),
    ofertas: a.ofertas.filter((o) => o.comercioId === c.id).map((o) => aOfertaDemo(a, o)),
  }
})
ruta('POST', '/direccion/comercios', (a, _, c) => {
  const u = direccion(a)
  const ficha = fichaDe(c.ficha as Cuerpo)
  const id = a.siguienteId++
  const nuevo: ComercioDemo = {
    ...ficha, id, slug: slugDe(a, ficha.nombre), nif: String(c.nif ?? '') || null, personaContacto: String(c.personaContacto ?? ''),
    telefonoContacto: String(c.telefonoContacto ?? ''), estado: 'verificado', motivo: null, nota: '', cambios: null, creado: ahora(), visitas: 0,
  }
  a.comercios.push(nuevo)
  const email = String(c.emailCuenta ?? '').trim().toLowerCase()
  if (email) a.usuarios.push({ id: a.siguienteId++, email, clave: 'demo-valverde', nombre: nuevo.personaContacto || nuevo.nombre, rol: 'comercio', entidadId: null, comercioId: id, totpActivo: false })
  apuntar(a, u.id, 'comercio_creado', `comercio:${id}`, ficha.nombre)
  return { id }
})
ruta('PUT', '/direccion/comercios/(\\d+)', (a, [id], c) => {
  const u = direccion(a)
  const co = comercioPorId(a, Number(id))
  Object.assign(co, fichaDe(c.ficha as Cuerpo), { nota: String(c.nota ?? ''), cambios: null })
  apuntar(a, u.id, 'comercio_editado', `comercio:${co.id}`, co.nombre)
  return { ok: true }
})
ruta('POST', '/direccion/comercios/(\\d+)/cuenta', (a, [id], c) => {
  direccion(a)
  const co = comercioPorId(a, Number(id))
  a.usuarios.push({ id: a.siguienteId++, email: String(c.email), clave: 'demo-valverde', nombre: String(c.nombre), rol: 'comercio', entidadId: null, comercioId: co.id, totpActivo: false })
  return { ok: true }
})
const estadoComercio = (desde: ComercioDemo['estado'][], hasta: ComercioDemo['estado'], accion: string, conMotivo: boolean, aviso?: [string, string, 'bien' | 'mal']): Manejador => (a, [id], c) => {
  const u = direccion(a)
  const co = comercioPorId(a, Number(id))
  if (!desde.includes(co.estado)) throw fallo(409, 'El comercio no está en un estado que permita esto.')
  if (conMotivo && String(c.motivo ?? '').trim().length < 5) throw fallo(400, 'Motivo: escribe al menos 5 caracteres.')
  co.estado = hasta
  co.motivo = conMotivo ? String(c.motivo).trim() : null
  apuntar(a, u.id, accion, `comercio:${co.id}`, co.motivo ?? co.nombre)
  return { ok: true, avisado: aviso ? avisarComercioDemo(a, co.id, aviso[2], aviso[0], aviso[1].replace('{nombre}', co.nombre).replace('{motivo}', co.motivo ?? '')) : undefined }
}
ruta('POST', '/direccion/comercios/(\\d+)/verificar', estadoComercio(['pendiente', 'rechazado'], 'verificado', 'comercio_verificado', false, ['Comercio publicado en la guía', '«{nombre}» ya sale en la guía con su ficha básica.', 'bien']))
ruta('POST', '/direccion/comercios/(\\d+)/rechazar', estadoComercio(['pendiente'], 'rechazado', 'comercio_rechazado', true, ['Alta no aceptada', 'No hemos podido publicar «{nombre}»:\n\n{motivo}', 'mal']))
ruta('POST', '/direccion/comercios/(\\d+)/suspender', estadoComercio(['verificado'], 'suspendido', 'comercio_suspendido', true, ['Ficha suspendida', 'Hemos quitado de la guía «{nombre}»:\n\n{motivo}', 'mal']))
ruta('POST', '/direccion/comercios/(\\d+)/reactivar', estadoComercio(['suspendido'], 'verificado', 'comercio_reactivado', false))
ruta('POST', '/direccion/comercios/(\\d+)/aprobar-cambios', (a, [id]) => {
  direccion(a)
  const co = comercioPorId(a, Number(id))
  if (!co.cambios) throw fallo(409, 'No hay cambios pendientes.')
  Object.assign(co, co.cambios, { cambios: null })
  return { ok: true, avisado: avisarComercioDemo(a, co.id, 'bien', 'Ficha actualizada', 'Los cambios en tu ficha ya se ven en la guía.') }
})
ruta('POST', '/direccion/comercios/(\\d+)/rechazar-cambios', (a, [id], c) => {
  direccion(a)
  const co = comercioPorId(a, Number(id))
  co.cambios = null
  return { ok: true, avisado: avisarComercioDemo(a, co.id, 'mal', 'Cambios no aplicados', `No hemos aplicado los cambios en tu ficha:\n\n${String(c.motivo ?? '')}`) }
})

const planDe = (c: Cuerpo) => {
  if (String(c.hasta) < String(c.desde)) throw fallo(400, 'El plan tiene que acabar después de empezar.')
  if (c.tipo === 'campana' && !c.campanaId) throw fallo(400, 'Elige la campaña.')
  return {
    tipo: c.tipo as TipoPlan, campanaId: c.tipo === 'campana' ? Number(c.campanaId) : null, desde: String(c.desde), hasta: String(c.hasta),
    importe: Number(c.importe ?? 0), estadoPago: c.estadoPago as 'pendiente' | 'pagado' | 'anulado', metodo: String(c.metodo ?? ''),
    factura: String(c.factura ?? ''), nota: String(c.nota ?? ''),
  }
}
ruta('POST', '/direccion/comercios/(\\d+)/planes', (a, [id], c) => {
  const u = direccion(a)
  const co = comercioPorId(a, Number(id))
  const p = planDe(c)
  const nuevo = a.siguienteId++
  a.planes.push({ id: nuevo, comercioId: co.id, ...p, pagadoEl: p.estadoPago === 'pagado' ? hoyDemo() : null })
  apuntar(a, u.id, 'plan_creado', `comercio:${co.id}`, `${p.tipo} ${p.desde}–${p.hasta} ${p.importe} €`)
  return { id: nuevo }
})
ruta('PUT', '/direccion/planes/(\\d+)', (a, [id], c) => {
  direccion(a)
  const actual = a.planes.find((x) => x.id === Number(id))
  if (!actual) throw fallo(404, 'Ese plan no existe.')
  const p = planDe(c)
  Object.assign(actual, p, { pagadoEl: p.estadoPago === 'pagado' ? actual.pagadoEl ?? hoyDemo() : null })
  return { ok: true }
})
ruta('GET', '/direccion/cobros', (a) => {
  direccion(a)
  const hoy = hoyDemo()
  const suma = (f: (p: (typeof a.planes)[number]) => boolean) => a.planes.filter(f).reduce((t, p) => t + p.importe, 0)
  return {
    cobradoMes: suma((p) => p.estadoPago === 'pagado' && (p.pagadoEl ?? '').slice(0, 7) === hoy.slice(0, 7)),
    cobradoAnio: suma((p) => p.estadoPago === 'pagado' && (p.pagadoEl ?? '').slice(0, 4) === hoy.slice(0, 4)),
    pendiente: suma((p) => p.estadoPago === 'pendiente'),
    planes: [...a.planes].sort((x, y) => y.desde.localeCompare(x.desde)).map((p) => aPlanDemo(a, p)),
    renovaciones: renovacionesDemo(a),
  }
})
ruta('GET', '/direccion/campanas', (a) => {
  direccion(a)
  return campanasDemo(a)
})
const campanaDe = (c: Cuerpo) => {
  if (String(c.nombre ?? '').trim().length < 3) throw fallo(400, 'Nombre: escribe al menos 3 caracteres.')
  if (String(c.hasta) < String(c.desde)) throw fallo(400, 'La campaña tiene que acabar después de empezar.')
  return { nombre: String(c.nombre).trim(), descripcion: String(c.descripcion ?? ''), desde: String(c.desde), hasta: String(c.hasta), activa: Boolean(c.activa) }
}
ruta('POST', '/direccion/campanas', (a, _, c) => {
  direccion(a)
  const d = campanaDe(c)
  const slug = `${slugDe(a, d.nombre)}-${a.siguienteId}`
  a.campanas.unshift({ id: a.siguienteId++, slug, ...d })
  return { slug }
})
ruta('PUT', '/direccion/campanas/(\\d+)', (a, [id], c) => {
  direccion(a)
  const ca = a.campanas.find((x) => x.id === Number(id))
  if (!ca) throw fallo(404, 'Esa campaña no existe.')
  Object.assign(ca, campanaDe(c))
  return { ok: true }
})
const estadoOferta = (desde: string[], hasta: 'publicada' | 'rechazada' | 'retirada', conMotivo: boolean, titulo: string): Manejador => (a, [id], c) => {
  const u = direccion(a)
  const o = a.ofertas.find((x) => x.id === Number(id))
  if (!o) throw fallo(404, 'Esa oferta no existe.')
  if (!desde.includes(o.estado)) throw fallo(409, 'Esta oferta no está en un estado que permita esto.')
  if (conMotivo && String(c.motivo ?? '').trim().length < 5) throw fallo(400, 'Motivo: escribe al menos 5 caracteres.')
  o.estado = hasta
  o.motivo = conMotivo ? String(c.motivo).trim() : null
  apuntar(a, u.id, `oferta_${hasta}`, `oferta:${o.id}`, o.titulo)
  return { ok: true, avisado: avisarComercioDemo(a, o.comercioId, hasta === 'publicada' ? 'bien' : 'mal', titulo, hasta === 'publicada' ? `«${o.titulo}» ya se ve en la app.` : `«${o.titulo}»: ${o.motivo}`) }
}
ruta('POST', '/direccion/ofertas/(\\d+)/aprobar', estadoOferta(['pendiente'], 'publicada', false, 'Oferta publicada'))
ruta('POST', '/direccion/ofertas/(\\d+)/rechazar', estadoOferta(['pendiente'], 'rechazada', true, 'Oferta no publicada'))
ruta('POST', '/direccion/ofertas/(\\d+)/retirar', estadoOferta(['publicada'], 'retirada', true, 'Oferta retirada'))

/** Punto de entrada: mismo contrato que api() contra el servidor real. */
export async function apiDemo(metodo: string, rutaPedida: string, cuerpo: unknown) {
  const [camino, consulta = ''] = rutaPedida.split('?')
  const a = leerAlmacen()
  for (const [m, patron, fn] of RUTAS) {
    const r = m === metodo ? patron.exec(camino) : null
    if (!r) continue
    try {
      const resultado = fn(a, r.slice(1), (cuerpo ?? {}) as Cuerpo, new URLSearchParams(consulta))
      guardarAlmacen(a)
      // Un pequeño retraso, para que se note que «se guarda» como en la versión real.
      await new Promise((ok) => setTimeout(ok, 120))
      return JSON.parse(JSON.stringify(resultado ?? null)) as unknown
    } catch (e) {
      if (e instanceof FalloDemo) {
        guardarAlmacen(a)
        throw e
      }
      throw e
    }
  }
  throw fallo(404, 'No existe.')
}

export { FalloDemo }

/**
 * Subida de imágenes en la demo: se guardan reducidas (900 px) como data: URL en el navegador,
 * para que quepan varias en el almacenamiento local.
 */
export async function subirImagenDemo(imagen: Blob) {
  const a = leerAlmacen()
  if (!a.sesion?.segundoFactor) throw new FalloDemo(401, 'Tienes que entrar con tu cuenta.')
  const pequena = await prepararFoto(new File([imagen], 'imagen.jpg', { type: imagen.type || 'image/jpeg' }), 900, 0.8)
  const url = await blobADataUrl(pequena)
  const clave = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 24)
  a.imagenes[clave] = url
  guardarAlmacen(a)
  return { clave, url }
}

/** Fotos y audio en la demo: las fotos se reducen; el audio solo se guarda si es corto (cabe en el navegador). */
export async function aDataUrlDemo(b: Blob, foto: boolean) {
  if (foto) return blobADataUrl(await prepararFoto(new File([b], 'foto.jpg', { type: b.type || 'image/jpeg' }), 900, 0.8))
  return b.size <= 1_500_000 ? blobADataUrl(b) : null
}

/** Formularios con archivos en la demo (modo entrevista). */
export async function formularioDemo(ruta: string, datos: FormData) {
  if (ruta !== '/direccion/historias') throw new FalloDemo(404, 'No existe.')
  const a = leerAlmacen()
  if (!a.sesion?.segundoFactor || a.usuarios.find((u) => u.id === a.sesion!.usuarioId)?.rol !== 'direccion') throw new FalloDemo(401, 'Tienes que entrar con tu cuenta.')
  try {
    return { id: await guardarHistoriaDemo(datos, 'entrevista', aDataUrlDemo) }
  } catch (e) {
    throw new FalloDemo(400, (e as Error).message)
  }
}
