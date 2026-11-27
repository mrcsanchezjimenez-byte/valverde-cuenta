import type { EstadoInscripcion, Inscripcion, MiInscripcion } from '../compartido/tipos.ts'
import { ahoraIso, ahoraLocal, ejecutar, transaccion, uno, varios } from './bd.ts'
import { fallo } from './contexto.ts'
import { enviarCorreo } from './correo.ts'
import { estadoInscripcion, listarEventos, ocupadas, type FilaEvento } from './eventos.ts'
import { fichaAleatoria, huella } from './seguridad/claves.ts'

/**
 * Inscripciones a eventos, sin cuenta: quien se apunta recibe un código secreto (lo guarda la app
 * en su móvil y va en el correo) con el que puede ver o cancelar su plaza. En la base de datos
 * solo se guarda la huella del código.
 */

interface FilaInscripcion {
  id: number
  evento_id: number
  nombre: string
  email: string
  telefono: string
  personas: number
  estado: EstadoInscripcion
  creado: string
}

const fecha = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
const cuando = (local: string) => fecha.format(new Date(local))

function eventoPorSlug(slug: string) {
  const [f] = listarEventos('ev.slug = ?', slug)
  if (!f || f.estado !== 'publicado' || !f.inscripcion) throw fallo(404, 'Este evento no admite inscripciones.')
  return f
}

const soloDigitos = (t: string) => t.replace(/\D/g, '')

export function inscribir(slug: string, d: { nombre: string; email: string; telefono: string; personas: number }) {
  return transaccion(() => {
    const f = eventoPorSlug(slug)
    const estado = estadoInscripcion(f, ocupadas(f.id).get(f.id) ?? 0)
    if (!estado.abierta) throw fallo(409, 'La inscripción para este evento ya está cerrada.')
    const tel = soloDigitos(d.telefono)
    const repetida = uno(
      `SELECT 1 FROM inscripciones WHERE evento_id = ? AND estado <> 'cancelada'
         AND ((? <> '' AND email = ?) OR (? <> '' AND telefono = ?))`,
      f.id, d.email, d.email, tel, tel)
    if (repetida) throw fallo(409, 'Ya hay una inscripción con ese teléfono o correo para este evento.')
    const plaza: EstadoInscripcion = estado.libres === null || estado.libres >= d.personas ? 'confirmada' : 'espera'
    const codigo = fichaAleatoria()
    ejecutar('INSERT INTO inscripciones (evento_id, codigo_hash, nombre, email, telefono, personas, estado) VALUES (?, ?, ?, ?, ?, ?, ?)',
      f.id, huella(codigo), d.nombre, d.email, tel, d.personas, plaza)
    const posicion = plaza === 'espera'
      ? (uno<{ n: number }>("SELECT COUNT(*) AS n FROM inscripciones WHERE evento_id = ? AND estado = 'espera'", f.id)?.n ?? 1)
      : null
    return { codigo, estado: plaza, posicion, evento: f }
  })
}

export async function avisarInscripcion(email: string, codigo: string, f: FilaEvento, estado: EstadoInscripcion, personas: number) {
  if (!email) return
  const plazas = personas === 1 ? '1 persona' : `${personas} personas`
  await enviarCorreo({
    para: email,
    asunto: estado === 'confirmada' ? `Plaza confirmada: ${f.titulo}` : `Lista de espera: ${f.titulo}`,
    texto: `${estado === 'confirmada' ? 'Tienes plaza' : 'Estás en la lista de espera'} para «${f.titulo}» (${plazas}).\n`
      + `Cuándo: ${cuando(f.inicio)}\nDónde: ${f.lugar}, ${f.municipio}\nOrganiza: ${f.organizador ?? f.entidad_nombre}\n\n`
      + `Si no puedes ir, cancela tu plaza para que la aproveche otra persona: abre el evento en la app y pulsa «Cancelar mi inscripción».\n`
      + `Tu código de inscripción: ${codigo}`,
  })
}

/** Cuando queda sitio, entra la primera de la lista de espera (por orden de llegada) si cabe. */
export async function promoverEspera(eventoId: number) {
  const [f] = listarEventos('ev.id = ?', eventoId)
  if (!f || f.plazas === null) return
  const promovidas: FilaInscripcion[] = []
  transaccion(() => {
    let libres = f.plazas! - (ocupadas(f.id).get(f.id) ?? 0)
    for (const i of varios<FilaInscripcion>("SELECT * FROM inscripciones WHERE evento_id = ? AND estado = 'espera' ORDER BY creado", f.id)) {
      if (i.personas > libres) break
      ejecutar("UPDATE inscripciones SET estado = 'confirmada' WHERE id = ?", i.id)
      libres -= i.personas
      promovidas.push(i)
    }
  })
  await Promise.all(promovidas.filter((i) => i.email).map((i) => enviarCorreo({
    para: i.email, asunto: `¡Tienes plaza! ${f.titulo}`,
    texto: `Se ha quedado sitio libre y ya tienes plaza para «${f.titulo}» (${cuando(f.inicio)}, ${f.lugar}).\nSi al final no puedes ir, cancélala desde la app.`,
  })))
}

function porCodigo(codigo: string) {
  if (!/^[\w-]{20,100}$/.test(codigo)) throw fallo(404, 'No encontramos esa inscripción.')
  const i = uno<FilaInscripcion>('SELECT * FROM inscripciones WHERE codigo_hash = ?', huella(codigo))
  if (!i) throw fallo(404, 'No encontramos esa inscripción.')
  return i
}

export function verMiInscripcion(codigo: string): MiInscripcion {
  const i = porCodigo(codigo)
  const [f] = listarEventos('ev.id = ?', i.evento_id)
  return { codigo, evento: f.slug, titulo: f.titulo, inicio: f.inicio, personas: i.personas, estado: i.estado }
}

export async function cancelarPorCodigo(codigo: string) {
  const i = porCodigo(codigo)
  if (i.estado !== 'cancelada') {
    ejecutar("UPDATE inscripciones SET estado = 'cancelada', cancelado = ? WHERE id = ?", ahoraIso(), i.id)
    await promoverEspera(i.evento_id)
  }
  return verMiInscripcion(codigo)
}

export async function cancelarPorEntidad(id: number, entidadId: number) {
  const i = uno<FilaInscripcion & { entidad_id: number }>(
    'SELECT i.*, e.entidad_id FROM inscripciones i JOIN eventos e ON e.id = i.evento_id WHERE i.id = ?', id)
  if (!i || i.entidad_id !== entidadId) throw fallo(404, 'Esa inscripción no existe.')
  ejecutar("UPDATE inscripciones SET estado = 'cancelada', cancelado = ? WHERE id = ?", ahoraIso(), i.id)
  await promoverEspera(i.evento_id)
}

export function listaInscripciones(eventoId: number) {
  const lista = varios<FilaInscripcion>(
    "SELECT * FROM inscripciones WHERE evento_id = ? ORDER BY CASE estado WHEN 'confirmada' THEN 0 WHEN 'espera' THEN 1 ELSE 2 END, creado", eventoId)
  const suma = (e: EstadoInscripcion) => lista.filter((i) => i.estado === e).reduce((t, i) => t + i.personas, 0)
  return {
    lista: lista.map((i): Inscripcion => ({ id: i.id, nombre: i.nombre, email: i.email, telefono: i.telefono, personas: i.personas, estado: i.estado, creado: i.creado })),
    confirmadas: suma('confirmada'),
    enEspera: suma('espera'),
  }
}

/** Si el evento se cancela, se avisa a quien tenía plaza o estaba esperando. */
export async function avisarCancelacionEvento(f: FilaEvento) {
  const gente = varios<{ email: string }>("SELECT email FROM inscripciones WHERE evento_id = ? AND estado <> 'cancelada' AND email <> ''", f.id)
  await Promise.all(gente.map((g) => enviarCorreo({
    para: g.email, asunto: `Evento cancelado: ${f.titulo}`,
    texto: `La organización ha cancelado «${f.titulo}», previsto para ${cuando(f.inicio)}. Sentimos las molestias.`,
  })))
}

/** Los datos de las personas apuntadas se borran un mes después del evento. */
export function borrarInscripcionesAntiguas() {
  const limite = ahoraLocal(new Date(Date.now() - 30 * 86400_000))
  ejecutar('DELETE FROM inscripciones WHERE evento_id IN (SELECT id FROM eventos WHERE fin < ?)', limite)
}
