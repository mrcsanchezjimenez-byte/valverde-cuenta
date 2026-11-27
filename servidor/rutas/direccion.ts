import { Hono } from 'hono'
import { z } from 'zod'
import { LETRAS_GRATIS } from '../../compartido/cif.ts'
import type { DatosEvento, EstadoEntidad, EstadoEvento } from '../../compartido/tipos.ts'
import { ahoraIso, ejecutar, transaccion, uno, varios } from '../bd.ts'
import { fallo, type C, type Entorno } from '../contexto.ts'
import { enlaceGestion, enviarCorreo } from '../correo.ts'
import {
  aGestion, cambiarEstado, comprobarMunicipio, crearEvento, eventoParaDireccion, guardarDatos, listarEventos, type FilaEvento,
} from '../eventos.ts'
import { anotar } from '../registro.ts'
import { exigir } from '../seguridad/sesiones.ts'
import { ajustesDireccion, esquemaEvento, leer, motivo, municipio } from '../validacion.ts'

/** Panel de dirección: revisar, aprobar, rechazar y mantener la agenda. Siempre con doble factor. */
export const direccion = new Hono<Entorno>()

direccion.use(exigir({ rol: 'direccion' }))

const id = (c: C) => {
  const n = Number(c.req.param('id'))
  if (!Number.isInteger(n) || n <= 0) throw fallo(404, 'No existe.')
  return n
}

const correoEntidad = (entidadId: number) =>
  varios<{ email: string; nombre: string }>("SELECT email, nombre FROM usuarios WHERE entidad_id = ? AND activo = 1", entidadId)

async function escribirAEntidad(entidadId: number, asunto: string, texto: string) {
  await Promise.all(correoEntidad(entidadId).map((u) =>
    enviarCorreo({ para: u.email, asunto, texto: `Hola, ${u.nombre}:\n\n${texto}\n\nPanel de vuestra entidad: ${enlaceGestion('/')}` })))
}

interface FilaEntidad {
  id: number
  nombre: string
  tipo: string
  cif: string | null
  municipio: string
  persona_contacto: string
  telefono: string
  web: string
  estado: EstadoEntidad
  motivo: string | null
  nota: string
  interna: number
  creado: string
  revisado: string | null
  email: string | null
  email_verificado: number | null
  eventos: number
}

const SELECT_ENTIDAD = `
  SELECT e.*, m.nombre AS municipio,
         (SELECT email FROM usuarios WHERE entidad_id = e.id ORDER BY id LIMIT 1) AS email,
         (SELECT email_verificado FROM usuarios WHERE entidad_id = e.id ORDER BY id LIMIT 1) AS email_verificado,
         (SELECT COUNT(*) FROM eventos WHERE entidad_id = e.id) AS eventos
    FROM entidades e JOIN municipios m ON m.id = e.municipio_id`

const aEntidad = (f: FilaEntidad) => ({
  id: f.id, nombre: f.nombre, tipo: f.tipo, cif: f.cif, tipoCif: f.cif ? (LETRAS_GRATIS[f.cif[0]] ?? 'No admitido') : null,
  municipio: f.municipio, personaContacto: f.persona_contacto, telefono: f.telefono, web: f.web, estado: f.estado,
  motivo: f.motivo, nota: f.nota, interna: Boolean(f.interna), creado: f.creado, revisado: f.revisado,
  email: f.email, emailVerificado: Boolean(f.email_verificado), eventos: f.eventos,
})

// ——— Resumen y bandeja de pendientes ———

direccion.get('/pendientes', (c) => c.json({
  entidades: varios<FilaEntidad>(`${SELECT_ENTIDAD} WHERE e.estado = 'pendiente' ORDER BY e.creado`).map(aEntidad),
  eventos: listarEventos("ev.estado = 'pendiente'").map(aGestion),
  cambios: listarEventos("ev.estado = 'publicado' AND ev.cambios IS NOT NULL").map(aGestion),
}))

direccion.get('/resumen', (c) => {
  const n = (sql: string) => (uno<{ n: number }>(sql)?.n ?? 0)
  return c.json({
    pendientes: n("SELECT COUNT(*) AS n FROM eventos WHERE estado = 'pendiente'")
      + n("SELECT COUNT(*) AS n FROM eventos WHERE estado = 'publicado' AND cambios IS NOT NULL")
      + n("SELECT COUNT(*) AS n FROM entidades WHERE estado = 'pendiente'"),
  })
})

// ——— Eventos ———

const ESTADOS: EstadoEvento[] = ['borrador', 'pendiente', 'publicado', 'rechazado', 'cancelado', 'retirado']

direccion.get('/eventos', (c) => {
  const estado = c.req.query('estado')
  const lista: FilaEvento[] = estado && ESTADOS.includes(estado as EstadoEvento)
    ? listarEventos('ev.estado = ?', estado)
    : listarEventos("ev.estado <> 'borrador'")
  return c.json(lista.map(aGestion))
})

direccion.get('/eventos/:id', (c) => c.json(aGestion(eventoParaDireccion(id(c)))))

/** Dirección mete un evento directamente (un cartel, un aviso del Ayuntamiento…): sale publicado. */
direccion.post('/eventos', async (c) => {
  const d = await leer(c, z.object({ evento: esquemaEvento, ajustes: ajustesDireccion, entidadId: z.number().int().positive() }).strict())
  comprobarMunicipio(d.evento.municipioId)
  const en = uno<{ interna: number; estado: string }>('SELECT interna, estado FROM entidades WHERE id = ?', d.entidadId)
  if (!en || en.estado !== 'verificada') throw fallo(400, 'Elige una entidad verificada.')
  if (en.interna && !d.ajustes.organizador) throw fallo(400, 'Escribe quién organiza el evento.')
  const nuevo = transaccion(() => {
    const n = crearEvento(d.entidadId, d.evento, 'publicado', { organizador: en.interna ? d.ajustes.organizador : null })
    ejecutar('UPDATE eventos SET escena = ?, enlaza_yincana = ?, revisado = ?, revisado_por = ? WHERE id = ?',
      d.ajustes.escena, d.ajustes.enlazaYincana, ahoraIso(), c.get('usuario').id, n)
    return n
  })
  anotar(c, c.get('usuario').id, 'evento_creado_direccion', `evento:${nuevo}`, d.evento.titulo)
  return c.json({ id: nuevo }, 201)
})

/** Corregir un evento (erratas, lugar, ilustración…) sin cambiar su estado. */
direccion.put('/eventos/:id', async (c) => {
  const f = eventoParaDireccion(id(c))
  const d = await leer(c, z.object({ evento: esquemaEvento, ajustes: ajustesDireccion }).strict())
  comprobarMunicipio(d.evento.municipioId)
  const interna = uno<{ interna: number }>('SELECT interna FROM entidades WHERE id = ?', f.entidad_id)?.interna
  transaccion(() => {
    guardarDatos(f.id, d.evento)
    ejecutar('UPDATE eventos SET escena = ?, enlaza_yincana = ?, organizador = ? WHERE id = ?',
      d.ajustes.escena, d.ajustes.enlazaYincana, interna ? d.ajustes.organizador : null, f.id)
  })
  anotar(c, c.get('usuario').id, 'evento_editado_direccion', `evento:${f.id}`, d.evento.titulo)
  return c.json({ ok: true })
})

direccion.post('/eventos/:id/aprobar', async (c) => {
  const f = eventoParaDireccion(id(c))
  if (f.estado !== 'pendiente') throw fallo(409, 'Este evento no está pendiente de revisión.')
  cambiarEstado(f.id, 'publicado', { revisor: c.get('usuario').id })
  anotar(c, c.get('usuario').id, 'evento_publicado', `evento:${f.id}`, f.titulo)
  await escribirAEntidad(f.entidad_id, 'Evento publicado · Valverde Cuenta', `«${f.titulo}» ya está en la agenda. ¡Gracias!`)
  return c.json({ ok: true })
})

direccion.post('/eventos/:id/rechazar', async (c) => {
  const f = eventoParaDireccion(id(c))
  const { motivo: m } = await leer(c, motivo)
  if (f.estado !== 'pendiente') throw fallo(409, 'Este evento no está pendiente de revisión.')
  cambiarEstado(f.id, 'rechazado', { motivo: m, revisor: c.get('usuario').id })
  anotar(c, c.get('usuario').id, 'evento_rechazado', `evento:${f.id}`, m)
  await escribirAEntidad(f.entidad_id, 'Evento no publicado · Valverde Cuenta',
    `No hemos publicado «${f.titulo}» por este motivo:\n\n${m}\n\nPodéis corregirlo y volver a enviarlo desde el panel.`)
  return c.json({ ok: true })
})

direccion.post('/eventos/:id/aprobar-cambios', async (c) => {
  const f = eventoParaDireccion(id(c))
  if (f.estado !== 'publicado' || !f.cambios) throw fallo(409, 'No hay cambios pendientes en este evento.')
  const cambios = JSON.parse(f.cambios) as DatosEvento
  transaccion(() => {
    guardarDatos(f.id, cambios)
    ejecutar('UPDATE eventos SET cambios = NULL, revisado = ?, revisado_por = ? WHERE id = ?', ahoraIso(), c.get('usuario').id, f.id)
  })
  anotar(c, c.get('usuario').id, 'cambios_aprobados', `evento:${f.id}`, cambios.titulo)
  await escribirAEntidad(f.entidad_id, 'Cambios publicados · Valverde Cuenta', `Los cambios en «${cambios.titulo}» ya se ven en la agenda.`)
  return c.json({ ok: true })
})

direccion.post('/eventos/:id/rechazar-cambios', async (c) => {
  const f = eventoParaDireccion(id(c))
  const { motivo: m } = await leer(c, motivo)
  if (!f.cambios) throw fallo(409, 'No hay cambios pendientes en este evento.')
  ejecutar('UPDATE eventos SET cambios = NULL, motivo = ? WHERE id = ?', m, f.id)
  anotar(c, c.get('usuario').id, 'cambios_rechazados', `evento:${f.id}`, m)
  await escribirAEntidad(f.entidad_id, 'Cambios no publicados · Valverde Cuenta',
    `No hemos aplicado los cambios en «${f.titulo}» por este motivo:\n\n${m}\n\nEl evento sigue publicado como estaba.`)
  return c.json({ ok: true })
})

/** Quitar de la agenda algo ya publicado (incumple las normas, duplicado…). */
direccion.post('/eventos/:id/retirar', async (c) => {
  const f = eventoParaDireccion(id(c))
  const { motivo: m } = await leer(c, motivo)
  if (!['publicado', 'cancelado'].includes(f.estado)) throw fallo(409, 'Solo se retira lo que está en la agenda.')
  cambiarEstado(f.id, 'retirado', { motivo: m, revisor: c.get('usuario').id })
  ejecutar('UPDATE eventos SET cambios = NULL WHERE id = ?', f.id)
  anotar(c, c.get('usuario').id, 'evento_retirado', `evento:${f.id}`, m)
  await escribirAEntidad(f.entidad_id, 'Evento retirado · Valverde Cuenta', `Hemos retirado «${f.titulo}» de la agenda por este motivo:\n\n${m}`)
  return c.json({ ok: true })
})

/** Volver a publicar algo retirado o cancelado por error. */
direccion.post('/eventos/:id/republicar', (c) => {
  const f = eventoParaDireccion(id(c))
  if (!['retirado', 'cancelado', 'rechazado'].includes(f.estado)) throw fallo(409, 'Este evento no se puede volver a publicar.')
  cambiarEstado(f.id, 'publicado', { revisor: c.get('usuario').id })
  anotar(c, c.get('usuario').id, 'evento_republicado', `evento:${f.id}`, f.titulo)
  return c.json({ ok: true })
})

// ——— Entidades ———

direccion.get('/entidades', (c) => c.json(varios<FilaEntidad>(`${SELECT_ENTIDAD} ORDER BY e.interna DESC, e.nombre`).map(aEntidad)))

direccion.get('/entidades/:id', (c) => {
  const f = uno<FilaEntidad>(`${SELECT_ENTIDAD} WHERE e.id = ?`, id(c))
  if (!f) throw fallo(404, 'Esa entidad no existe.')
  return c.json({ ...aEntidad(f), listaEventos: listarEventos("ev.entidad_id = ? AND ev.estado <> 'borrador'", f.id).map(aGestion) })
})

async function cambiarEntidad(c: C, estado: EstadoEntidad, accion: string, desde: EstadoEntidad[], m: string | null) {
  const n = id(c)
  const e = uno<{ nombre: string; estado: EstadoEntidad; interna: number }>('SELECT nombre, estado, interna FROM entidades WHERE id = ?', n)
  if (!e) throw fallo(404, 'Esa entidad no existe.')
  if (e.interna) throw fallo(409, 'La entidad interna de dirección no se puede cambiar.')
  if (!desde.includes(e.estado)) throw fallo(409, 'La entidad no está en un estado que permita esto.')
  ejecutar('UPDATE entidades SET estado = ?, motivo = ?, revisado = ?, revisado_por = ? WHERE id = ?', estado, m, ahoraIso(), c.get('usuario').id, n)
  if (estado === 'suspendida') {
    // Una entidad suspendida no puede seguir con sesiones abiertas.
    ejecutar('DELETE FROM sesiones WHERE usuario_id IN (SELECT id FROM usuarios WHERE entidad_id = ?)', n)
  }
  anotar(c, c.get('usuario').id, accion, `entidad:${n}`, m ?? e.nombre)
  return { ...e, id: n }
}

direccion.post('/entidades/:id/verificar', async (c) => {
  const e = await cambiarEntidad(c, 'verificada', 'entidad_verificada', ['pendiente', 'rechazada'], null)
  await escribirAEntidad(e.id, 'Entidad verificada · Valverde Cuenta', `«${e.nombre}» ya puede publicar en la agenda. Cada evento lo revisaremos antes de que salga.`)
  return c.json({ ok: true })
})

direccion.post('/entidades/:id/rechazar', async (c) => {
  const { motivo: m } = await leer(c, motivo)
  const e = await cambiarEntidad(c, 'rechazada', 'entidad_rechazada', ['pendiente'], m)
  await escribirAEntidad(e.id, 'Alta no aceptada · Valverde Cuenta', `No hemos podido dar de alta «${e.nombre}» por este motivo:\n\n${m}`)
  return c.json({ ok: true })
})

direccion.post('/entidades/:id/suspender', async (c) => {
  const { motivo: m } = await leer(c, motivo)
  const e = await cambiarEntidad(c, 'suspendida', 'entidad_suspendida', ['verificada'], m)
  await escribirAEntidad(e.id, 'Cuenta suspendida · Valverde Cuenta', `Hemos suspendido la cuenta de «${e.nombre}» por este motivo:\n\n${m}`)
  return c.json({ ok: true })
})

direccion.post('/entidades/:id/reactivar', async (c) => {
  await cambiarEntidad(c, 'verificada', 'entidad_reactivada', ['suspendida'], null)
  return c.json({ ok: true })
})

direccion.put('/entidades/:id/nota', async (c) => {
  const { nota } = await leer(c, z.object({ nota: z.string().trim().max(2000) }))
  const r = ejecutar('UPDATE entidades SET nota = ? WHERE id = ?', nota, id(c))
  if (!r.changes) throw fallo(404, 'Esa entidad no existe.')
  return c.json({ ok: true })
})

// ——— Municipios de la agenda ———

direccion.post('/municipios', async (c) => {
  const m = await leer(c, municipio)
  if (uno('SELECT 1 FROM municipios WHERE nombre = ?', m.nombre)) throw fallo(409, 'Ese municipio ya está en la lista.')
  ejecutar('INSERT INTO municipios (nombre, lat, lng, activo) VALUES (?, ?, ?, ?)', m.nombre, m.lat, m.lng, m.activo)
  anotar(c, c.get('usuario').id, 'municipio_creado', '', m.nombre)
  return c.json({ ok: true }, 201)
})

direccion.put('/municipios/:id', async (c) => {
  const m = await leer(c, municipio)
  const n = id(c)
  const actual = uno<{ es_valverde: number }>('SELECT es_valverde FROM municipios WHERE id = ?', n)
  if (!actual) throw fallo(404, 'Ese municipio no existe.')
  if (actual.es_valverde && !m.activo) throw fallo(409, 'Valverde no se puede desactivar.')
  ejecutar('UPDATE municipios SET nombre = ?, lat = ?, lng = ?, activo = ? WHERE id = ?', m.nombre, m.lat, m.lng, m.activo, n)
  anotar(c, c.get('usuario').id, 'municipio_cambiado', `municipio:${n}`, `${m.nombre} ${m.activo ? 'activo' : 'inactivo'}`)
  return c.json({ ok: true })
})

// ——— Actividad y equipo ———

direccion.get('/registro', (c) => {
  const antes = Number(c.req.query('antes') ?? 0) || Number.MAX_SAFE_INTEGER
  return c.json(varios(
    `SELECT r.id, r.fecha, r.accion, r.objeto, r.detalle, r.ip, u.nombre AS quien, u.rol
       FROM registro r LEFT JOIN usuarios u ON u.id = r.usuario_id
      WHERE r.id < ? ORDER BY r.id DESC LIMIT 100`, antes))
})

direccion.get('/equipo', (c) => c.json(varios(
  "SELECT id, nombre, email, totp_activo AS dobleFactor, activo, ultimo_acceso AS ultimoAcceso FROM usuarios WHERE rol = 'direccion' ORDER BY nombre")))
