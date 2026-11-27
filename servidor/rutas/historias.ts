import { Hono } from 'hono'
import { z } from 'zod'
import type { Consentimiento, EstadoHistoria } from '../../compartido/tipos.ts'
import { CONSENTIMIENTOS, EPOCAS, LIMITES_ARCHIVOS, VERSION_CONSENTIMIENTO } from '../../compartido/tipos.ts'
import { guardarSubida, servirArchivo, type ArchivoPreparado } from '../archivos.ts'
import { ahoraIso, ejecutar, transaccion, uno } from '../bd.ts'
import { fallo, ipDe, type C, type Entorno } from '../contexto.ts'
import { avisarDireccion, enviarCorreo } from '../correo.ts'
import {
  aHistoriaGestion, archivoDireccion, archivoPublico, borrarHistoria, comprobarLugar, contarEscaneo, crearHistoria, historiaParaDireccion,
  historiaPublica, historiasPublicadas, listarHistorias, lugaresGestion, lugarPublico, lugaresPublicos, slugLugar, type DatosHistoria,
} from '../historias.ts'
import { anotar } from '../registro.ts'
import { permitir } from '../seguridad/limites.ts'
import { exigir } from '../seguridad/sesiones.ts'
import { leer, motivo } from '../validacion.ts'

// ——— Validación de los datos de una historia (vienen de un formulario multipart) ———

const texto = (max: number) => z.string().transform((s) => s.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, '').trim()).pipe(z.string().max(max))
const linea = (max: number) => z.string().transform((s) => s.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()).pipe(z.string().max(max))

const esquemaHistoria = z.object({
  titulo: linea(120).pipe(z.string().min(3, 'Ponle un título (al menos 3 letras).')),
  texto: texto(8000),
  epoca: z.enum(['', ...EPOCAS], 'Elige una época de la lista.'),
  lugarId: z.number().int().positive().nullable(),
  lugarTexto: linea(120),
  firma: z.enum(['nombre', 'anonimo']),
  autor: linea(80),
  contactoNombre: linea(80),
  contactoEmail: z.string().trim().toLowerCase().max(254).refine((s) => s === '' || z.email().safeParse(s).success, 'El correo no es válido.'),
  contactoTelefono: z.string().trim().refine((s) => s === '' || /^\+?[\d\s]{9,15}$/.test(s), 'El teléfono no es válido.'),
}).refine((h) => h.firma === 'anonimo' || h.autor.length >= 2, { message: 'Escribe con qué nombre quieres firmar, o elige firmar como «un vecino o vecina».', path: ['autor'] })

type Campos = Record<string, string | File | (string | File)[]>
const uno1 = (v: Campos[string] | undefined) => (Array.isArray(v) ? v[0] : v)
const cadena = (v: Campos[string] | undefined) => (typeof uno1(v) === 'string' ? (uno1(v) as string) : '')
const archivosDe = (v: Campos[string] | undefined) => (Array.isArray(v) ? v : v ? [v] : []).filter((x): x is File => x instanceof File && x.size > 0)

/** Lee el formulario multipart: datos de la historia, consentimientos y archivos. */
async function leerFormulario(c: C) {
  let campos: Campos
  try {
    campos = await c.req.parseBody({ all: true })
  } catch {
    throw fallo(400, 'La petición no es válida.')
  }
  const slug = cadena(campos.lugarSlug)
  const porSlug = slug ? uno<{ id: number }>('SELECT id FROM lugares WHERE slug = ? AND activo = 1', slug)?.id : undefined
  if (slug && !porSlug) throw fallo(400, 'Ese lugar no existe.')
  const lugar = porSlug ? String(porSlug) : cadena(campos.lugarId)
  const r = esquemaHistoria.safeParse({
    titulo: cadena(campos.titulo), texto: cadena(campos.texto), epoca: cadena(campos.epoca), lugarId: lugar ? Number(lugar) : null,
    lugarTexto: cadena(campos.lugarTexto), firma: cadena(campos.firma) || 'anonimo', autor: cadena(campos.autor),
    contactoNombre: cadena(campos.contactoNombre), contactoEmail: cadena(campos.contactoEmail), contactoTelefono: cadena(campos.contactoTelefono),
  })
  if (!r.success) throw fallo(400, r.error.issues[0]?.message ?? 'Hay datos que no son válidos.')
  const aceptados = (Object.keys(CONSENTIMIENTOS) as Consentimiento[]).filter((k) => cadena(campos[`acepta_${k}`]) === 'si')
  const fotos = archivosDe(campos.fotos)
  const audios = archivosDe(campos.audio)
  if (fotos.length > LIMITES_ARCHIVOS.fotos) throw fallo(400, `Como mucho ${LIMITES_ARCHIVOS.fotos} fotos por historia.`)
  if (audios.length > 1) throw fallo(400, 'Solo un audio por historia.')
  if (r.data.texto.length < 30 && !audios.length) throw fallo(400, 'Cuenta la historia por escrito (al menos unas líneas) o grábala en audio.')
  comprobarLugar(r.data.lugarId)
  return { datos: r.data as DatosHistoria, aceptados, fotos, audio: audios[0] ?? null, trampa: cadena(campos.web) }
}

/** Guarda los archivos en disco (comprobados y limpios). Si uno falla, borra los ya guardados. */
async function guardarArchivos(fotos: File[], audio: File | null) {
  const guardados: ArchivoPreparado[] = []
  try {
    for (const f of fotos) guardados.push(await guardarSubida(f, 'foto'))
    if (audio) guardados.push(await guardarSubida(audio, 'audio'))
    return guardados
  } catch (e) {
    const { borrarArchivo } = await import('../archivos.ts')
    guardados.forEach((a) => borrarArchivo(a.clave))
    throw e
  }
}

// ——— Público ———

export const historiasPublico = new Hono<Entorno>()

historiasPublico.get('/historias', (c) => {
  c.header('Cache-Control', 'public, max-age=60')
  return c.json(historiasPublicadas())
})

historiasPublico.get('/historias/:slug', (c) => c.json(historiaPublica(c.req.param('slug'))))

historiasPublico.get('/lugares', (c) => {
  c.header('Cache-Control', 'public, max-age=60')
  return c.json(lugaresPublicos())
})

/** La página a la que lleva el QR de cada placa. Con ?qr=1 cuenta un escaneo (uno por conexión y media hora). */
historiasPublico.get('/lugares/:slug', (c) => {
  const { id, historiasLista, ...lugar } = lugarPublico(c.req.param('slug'))
  if (c.req.query('qr') === '1' && permitir(`qr:${ipDe(c)}:${id}`, 1, 30 * 60_000)) contarEscaneo(id)
  c.header('Cache-Control', 'no-store')
  return c.json({ ...lugar, historias: historiasLista })
})

historiasPublico.get('/archivos/:clave', (c) => servirArchivo(c, archivoPublico(c.req.param('clave')), true))

/** Cualquiera puede contar una historia: queda pendiente hasta que dirección la revisa. */
historiasPublico.post('/historias', async (c) => {
  const ip = ipDe(c)
  if (!permitir(`historia:${ip}`, 5, 3600_000)) throw fallo(429, 'Has enviado varias historias seguidas. Prueba dentro de un rato.')
  const f = await leerFormulario(c)
  if (f.trampa) return c.json({ ok: true }, 201)
  const faltan = (Object.keys(CONSENTIMIENTOS) as Consentimiento[]).filter((k) => !f.aceptados.includes(k))
  if (faltan.length) throw fallo(400, 'Para poder publicarla hay que marcar todas las casillas de permisos.')
  const archivos = await guardarArchivos(f.fotos, f.audio)
  const id = crearHistoria(f.datos, 'web', f.aceptados, VERSION_CONSENTIMIENTO, archivos)
  anotar(c, null, 'historia_recibida', `historia:${id}`, f.datos.titulo)
  await avisarDireccion('Historia nueva por revisar', `Ha llegado «${f.datos.titulo}».`)
  if (f.datos.contactoEmail) {
    await enviarCorreo({
      para: f.datos.contactoEmail, asunto: 'Hemos recibido tu historia · Valverde Cuenta',
      texto: `¡Gracias por compartir «${f.datos.titulo}»!\n\nLa leeremos con calma antes de publicarla y te escribiremos si tenemos alguna duda.\nSi en algún momento quieres que la retiremos, contesta a este correo.`,
    })
  }
  return c.json({ ok: true }, 201)
})

// ——— Dirección ———

export const historiasDireccion = new Hono<Entorno>()
historiasDireccion.use(exigir({ rol: 'direccion' }))

const id = (c: C) => {
  const n = Number(c.req.param('id'))
  if (!Number.isInteger(n) || n <= 0) throw fallo(404, 'No existe.')
  return n
}
const ESTADOS: EstadoHistoria[] = ['pendiente', 'publicada', 'rechazada', 'retirada']

historiasDireccion.get('/historias', (c) => {
  const estado = c.req.query('estado') as EstadoHistoria | undefined
  return c.json(listarHistorias(estado && ESTADOS.includes(estado) ? estado : undefined))
})

historiasDireccion.get('/historias/:id', (c) => c.json(aHistoriaGestion(historiaParaDireccion(id(c)))))

historiasDireccion.get('/archivos/:clave', (c) => servirArchivo(c, archivoDireccion(c.req.param('clave')), false))

/** Modo entrevista: dirección mete una historia que ha grabado o escrito con alguien en persona. */
historiasDireccion.post('/historias', async (c) => {
  const f = await leerFormulario(c)
  const faltan = (Object.keys(CONSENTIMIENTOS) as Consentimiento[]).filter((k) => !f.aceptados.includes(k))
  if (faltan.length) throw fallo(400, 'Marca que la persona entrevistada ha dado todos los permisos.')
  const archivos = await guardarArchivos(f.fotos, f.audio)
  const nuevo = crearHistoria(f.datos, 'entrevista', f.aceptados, VERSION_CONSENTIMIENTO, archivos)
  anotar(c, c.get('usuario').id, 'historia_entrevista', `historia:${nuevo}`, f.datos.titulo)
  return c.json({ id: nuevo }, 201)
})

/** Corregir el texto, el lugar, la firma, y elegir qué fotos y audio se publican. */
historiasDireccion.put('/historias/:id', async (c) => {
  const h = historiaParaDireccion(id(c))
  const d = await leer(c, z.object({
    titulo: linea(120).pipe(z.string().min(3, 'Ponle un título.')),
    texto: texto(8000),
    epoca: z.enum(['', ...EPOCAS]),
    lugarId: z.number().int().positive().nullable(),
    lugarTexto: linea(120),
    firma: z.enum(['nombre', 'anonimo']),
    autor: linea(80),
    nota: texto(2000),
    archivos: z.array(z.object({ id: z.number().int().positive(), publicar: z.boolean(), pie: linea(140), orden: z.number().int().min(0).max(100) }).strict()).max(10),
  }).strict())
  comprobarLugar(d.lugarId)
  transaccion(() => {
    ejecutar(`UPDATE historias SET titulo = ?, texto = ?, epoca = ?, lugar_id = ?, lugar_texto = ?, firma = ?, autor = ?, nota = ?, actualizado = ?
               WHERE id = ?`, d.titulo, d.texto, d.epoca, d.lugarId, d.lugarTexto, d.firma, d.autor, d.nota, ahoraIso(), h.id)
    for (const a of d.archivos) {
      ejecutar('UPDATE archivos SET publicar = ?, pie = ?, orden = ? WHERE id = ? AND historia_id = ?', a.publicar, a.pie, a.orden, a.id, h.id)
    }
  })
  anotar(c, c.get('usuario').id, 'historia_editada', `historia:${h.id}`, d.titulo)
  return c.json({ ok: true })
})

async function cambiarEstado(c: C, desde: EstadoHistoria[], hasta: EstadoHistoria, accion: string, m: string | null) {
  const h = historiaParaDireccion(id(c))
  if (!desde.includes(h.estado)) throw fallo(409, 'La historia no está en un estado que permita esto.')
  ejecutar('UPDATE historias SET estado = ?, motivo = ?, revisado = ?, revisado_por = ?, actualizado = ? WHERE id = ?',
    hasta, m, ahoraIso(), c.get('usuario').id, ahoraIso(), h.id)
  anotar(c, c.get('usuario').id, accion, `historia:${h.id}`, m ?? h.titulo)
  return h
}

historiasDireccion.post('/historias/:id/publicar', async (c) => {
  const h = await cambiarEstado(c, ['pendiente', 'retirada', 'rechazada'], 'publicada', 'historia_publicada', null)
  if (h.contacto_email && h.origen === 'web') {
    await enviarCorreo({ para: h.contacto_email, asunto: 'Tu historia ya está publicada · Valverde Cuenta',
      texto: `«${h.titulo}» ya se puede leer en Valverde Cuenta. ¡Gracias por ayudar a guardar la memoria del pueblo!` })
  }
  return c.json({ ok: true, avisado: h.contacto_email ? h.contacto_nombre || h.contacto_email : undefined })
})

historiasDireccion.post('/historias/:id/rechazar', async (c) => {
  const { motivo: m } = await leer(c, motivo)
  await cambiarEstado(c, ['pendiente'], 'rechazada', 'historia_rechazada', m)
  return c.json({ ok: true })
})

historiasDireccion.post('/historias/:id/retirar', async (c) => {
  const { motivo: m } = await leer(c, motivo)
  await cambiarEstado(c, ['publicada'], 'retirada', 'historia_retirada', m)
  return c.json({ ok: true })
})

/** Borrar para siempre (por ejemplo, si quien la contó pide que se elimine). No se puede deshacer. */
historiasDireccion.delete('/historias/:id', (c) => {
  const h = historiaParaDireccion(id(c))
  if (h.estado === 'publicada') throw fallo(409, 'Primero retírala de la app.')
  borrarHistoria(h.id)
  anotar(c, c.get('usuario').id, 'historia_borrada', `historia:${h.id}`, h.titulo)
  return c.json({ ok: true })
})

// ——— Lugares con placa QR ———

const esquemaLugar = z.object({
  nombre: linea(80).pipe(z.string().min(2, 'Escribe el nombre del lugar.')),
  descripcion: texto(1200),
  direccion: linea(120),
  lat: z.number().min(36.9).max(38.3),
  lng: z.number().min(-7.6).max(-6.0),
  anfitrion: linea(80),
  activo: z.boolean(),
}).strict()

historiasDireccion.get('/lugares', (c) => c.json(lugaresGestion()))

historiasDireccion.post('/lugares', async (c) => {
  const d = await leer(c, esquemaLugar)
  const slug = slugLugar(d.nombre)
  ejecutar('INSERT INTO lugares (slug, nombre, descripcion, direccion, lat, lng, anfitrion, activo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    slug, d.nombre, d.descripcion, d.direccion, d.lat, d.lng, d.anfitrion, d.activo)
  anotar(c, c.get('usuario').id, 'lugar_creado', `lugar:${slug}`, d.nombre)
  return c.json({ slug }, 201)
})

/** El slug no cambia aunque cambie el nombre: está impreso en la placa. */
historiasDireccion.put('/lugares/:id', async (c) => {
  const d = await leer(c, esquemaLugar)
  const r = ejecutar('UPDATE lugares SET nombre = ?, descripcion = ?, direccion = ?, lat = ?, lng = ?, anfitrion = ?, activo = ? WHERE id = ?',
    d.nombre, d.descripcion, d.direccion, d.lat, d.lng, d.anfitrion, d.activo, id(c))
  if (!r.changes) throw fallo(404, 'Ese lugar no existe.')
  anotar(c, c.get('usuario').id, 'lugar_cambiado', `lugar:${id(c)}`, d.nombre)
  return c.json({ ok: true })
})

/** Para la bandeja de pendientes. */
export const historiasPendientes = () => listarHistorias('pendiente')
export const cuantasHistoriasPendientes = () => uno<{ n: number }>("SELECT COUNT(*) AS n FROM historias WHERE estado = 'pendiente'")?.n ?? 0
