import { Hono } from 'hono'
import { ejecutar } from '../bd.ts'
import { fallo, type C, type Entorno } from '../contexto.ts'
import { avisarDireccion } from '../correo.ts'
import {
  aGestion, cambiarEstado, comprobarFuturo, comprobarMunicipio, crearEvento, eventoDeEntidad, guardarDatos, listarEventos,
} from '../eventos.ts'
import { anotar } from '../registro.ts'
import { permitir } from '../seguridad/limites.ts'
import { exigir } from '../seguridad/sesiones.ts'
import { envioEvento, leer } from '../validacion.ts'

/** Lo que hace una asociación o institución con sus propios eventos. */
export const entidad = new Hono<Entorno>()

entidad.use(exigir({ rol: 'entidad' }))

const idDe = (c: C) => {
  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id) || id <= 0) throw fallo(404, 'Ese evento no existe.')
  return id
}

/** Solo una entidad verificada puede mandar eventos a revisión. */
function exigirVerificada(c: C) {
  const estado = c.get('usuario').entidadEstado
  if (estado === 'verificada') return
  throw fallo(403, estado === 'pendiente'
    ? 'Estamos revisando los datos de vuestra entidad. Podéis preparar borradores mientras tanto.'
    : 'Vuestra entidad no puede publicar eventos ahora mismo. Escribidnos si creéis que es un error.')
}

function limitarEnvios(c: C) {
  if (!permitir(`envios:${c.get('usuario').id}`, 30, 3600_000)) throw fallo(429, 'Demasiados envíos seguidos. Prueba dentro de un rato.')
}

entidad.get('/eventos', (c) => c.json(listarEventos('ev.entidad_id = ?', c.get('usuario').entidadId!).map(aGestion).reverse()))

entidad.get('/eventos/:id', (c) => c.json(aGestion(eventoDeEntidad(idDe(c), c.get('usuario').entidadId!))))

entidad.post('/eventos', async (c) => {
  const u = c.get('usuario')
  limitarEnvios(c)
  const { evento, enviar, declaracion } = await leer(c, envioEvento)
  if (u.entidadEstado === 'rechazada' || u.entidadEstado === 'suspendida') exigirVerificada(c)
  comprobarMunicipio(evento.municipioId)
  if (enviar) {
    exigirVerificada(c)
    if (!declaracion) throw fallo(400, 'Marca la casilla de la declaración para enviarlo.')
    comprobarFuturo(evento)
  }
  const id = crearEvento(u.entidadId!, evento, enviar ? 'pendiente' : 'borrador')
  anotar(c, u.id, enviar ? 'evento_enviado' : 'evento_borrador', `evento:${id}`, evento.titulo)
  if (enviar) await avisarDireccion('Evento nuevo por revisar', `«${evento.titulo}», de ${u.entidadNombre}.`)
  return c.json({ id }, 201)
})

/**
 * Editar un evento propio:
 * - borrador, rechazado o pendiente: se cambian los datos (y si se envía, vuelve a revisión);
 * - publicado: los cambios se guardan aparte y el evento sigue visible tal cual hasta que dirección los apruebe.
 */
entidad.put('/eventos/:id', async (c) => {
  const u = c.get('usuario')
  limitarEnvios(c)
  const f = eventoDeEntidad(idDe(c), u.entidadId!)
  const { evento, enviar, declaracion } = await leer(c, envioEvento)
  comprobarMunicipio(evento.municipioId)
  if (u.entidadEstado === 'rechazada' || u.entidadEstado === 'suspendida') exigirVerificada(c)

  if (f.estado === 'publicado') {
    exigirVerificada(c)
    if (!declaracion) throw fallo(400, 'Marca la casilla de la declaración para enviar los cambios.')
    comprobarFuturo(evento)
    ejecutar('UPDATE eventos SET cambios = ?, actualizado = ? WHERE id = ?', JSON.stringify(evento), new Date().toISOString(), f.id)
    anotar(c, u.id, 'cambios_enviados', `evento:${f.id}`, evento.titulo)
    await avisarDireccion('Cambios por revisar', `${u.entidadNombre} ha cambiado «${f.titulo}».`)
    return c.json({ id: f.id, estado: f.estado })
  }
  if (!['borrador', 'rechazado', 'pendiente'].includes(f.estado)) throw fallo(409, 'Este evento ya no se puede cambiar.')

  const estado = enviar || f.estado === 'pendiente' ? 'pendiente' : 'borrador'
  if (estado === 'pendiente') {
    exigirVerificada(c)
    if (!declaracion) throw fallo(400, 'Marca la casilla de la declaración para enviarlo.')
    comprobarFuturo(evento)
  }
  guardarDatos(f.id, evento)
  if (estado !== f.estado || estado === 'pendiente') cambiarEstado(f.id, estado, { enviado: estado === 'pendiente' && f.estado !== 'pendiente' })
  anotar(c, u.id, estado === 'pendiente' ? 'evento_enviado' : 'evento_borrador', `evento:${f.id}`, evento.titulo)
  if (estado === 'pendiente' && f.estado !== 'pendiente') {
    await avisarDireccion('Evento nuevo por revisar', `«${evento.titulo}», de ${u.entidadNombre}.`)
  }
  return c.json({ id: f.id, estado })
})

/** Retira los cambios propuestos sobre un evento publicado. */
entidad.delete('/eventos/:id/cambios', (c) => {
  const f = eventoDeEntidad(idDe(c), c.get('usuario').entidadId!)
  ejecutar('UPDATE eventos SET cambios = NULL WHERE id = ?', f.id)
  return c.json({ ok: true })
})

/** Cancelar un evento publicado: sigue en la agenda marcado como cancelado. Sin esperar a dirección. */
entidad.post('/eventos/:id/cancelar', (c) => {
  const u = c.get('usuario')
  const f = eventoDeEntidad(idDe(c), u.entidadId!)
  if (f.estado !== 'publicado') throw fallo(409, 'Solo se puede cancelar un evento publicado.')
  cambiarEstado(f.id, 'cancelado')
  ejecutar('UPDATE eventos SET cambios = NULL WHERE id = ?', f.id)
  anotar(c, u.id, 'evento_cancelado', `evento:${f.id}`, f.titulo)
  return c.json({ ok: true })
})

/** Borrar solo lo que nunca se ha publicado. */
entidad.delete('/eventos/:id', (c) => {
  const u = c.get('usuario')
  const f = eventoDeEntidad(idDe(c), u.entidadId!)
  if (!['borrador', 'rechazado', 'pendiente'].includes(f.estado)) throw fallo(409, 'Un evento publicado no se borra: se cancela.')
  ejecutar('DELETE FROM eventos WHERE id = ?', f.id)
  anotar(c, u.id, 'evento_borrado', `evento:${f.id}`, f.titulo)
  return c.json({ ok: true })
})
