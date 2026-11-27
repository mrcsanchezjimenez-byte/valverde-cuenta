import { z } from 'zod'
import { IDS_CATEGORIAS, IDS_ESCENAS } from '../compartido/categorias.ts'
import { cifValido, normalizarCif } from '../compartido/cif.ts'
import { CENTRO_VALVERDE, distanciaKm, TIPOS_ENTIDAD } from '../compartido/tipos.ts'
import type { C } from './contexto.ts'
import { fallo } from './contexto.ts'

z.config(z.locales.es())

/** Texto de una línea: sin caracteres de control, espacios recortados. */
const linea = (min: number, max: number, nombre: string) =>
  z.string().transform((s) => s.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim())
    .pipe(z.string().min(min, `${nombre}: escribe al menos ${min} caracteres.`).max(max, `${nombre}: como mucho ${max} caracteres.`))

/** Texto largo: se permiten saltos de línea. */
const parrafos = (min: number, max: number, nombre: string) =>
  z.string().transform((s) => s.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, '').replace(/\n{3,}/g, '\n\n').trim())
    .pipe(z.string().min(min, `${nombre}: escribe al menos ${min} caracteres.`).max(max, `${nombre}: como mucho ${max} caracteres.`))

const fechaHora = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Fecha y hora no válidas.')
  .refine((s) => !Number.isNaN(Date.parse(`${s}:00Z`)), 'Fecha y hora no válidas.')

/** Solo enlaces web normales: nada de javascript: ni otros esquemas raros. */
const enlaceWeb = z.string().trim().max(300, 'El enlace es demasiado largo.')
  .refine((s) => s === '' || (/^https?:\/\//i.test(s) && URL.canParse(s)), 'El enlace debe empezar por https://')

export const email = z.string().trim().toLowerCase().max(254).pipe(z.email('El correo no es válido.'))
export const clave = z.string().min(1, 'Escribe la contraseña.').max(200)
export const codigo2fa = z.string().trim().regex(/^\d{6}$/, 'El código son 6 cifras.')
export const motivo = z.object({ motivo: parrafos(5, 600, 'Motivo') })

export const esquemaEvento = z.object({
  titulo: linea(3, 90, 'Título'),
  resumen: linea(10, 160, 'Resumen'),
  descripcion: parrafos(20, 2000, 'Descripción'),
  inicio: fechaHora,
  fin: fechaHora,
  lugar: linea(2, 120, 'Lugar'),
  municipioId: z.number().int().positive(),
  lat: z.number(),
  lng: z.number(),
  precio: z.number().min(0).max(500, 'El precio parece demasiado alto.').nullable(),
  publico: linea(3, 60, 'Público'),
  categoria: z.enum(IDS_CATEGORIAS, 'Elige una categoría.'),
  paraNinos: z.boolean(),
  enlace: enlaceWeb,
  imagen: z.string().regex(/^[a-z0-9]{24}$/, 'La imagen no es válida.').nullable(),
}).strict()
  .refine((e) => e.fin > e.inicio, { message: 'El final tiene que ser después del inicio.', path: ['fin'] })
  .refine((e) => Date.parse(`${e.fin}:00Z`) - Date.parse(`${e.inicio}:00Z`) <= 31 * 86400_000, {
    message: 'Un evento no puede durar más de un mes.', path: ['fin'],
  })
  .refine((e) => distanciaKm(CENTRO_VALVERDE, e) <= 35, { message: 'El lugar está demasiado lejos de Valverde.', path: ['lat'] })

export const envioEvento = z.object({
  evento: esquemaEvento,
  /** true: se manda a revisión; false: se guarda como borrador. */
  enviar: z.boolean(),
  /** Declaración obligatoria al enviar. */
  declaracion: z.boolean(),
}).strict()

/** Lo que solo toca dirección. */
export const ajustesDireccion = z.object({
  escena: z.enum(IDS_ESCENAS),
  enlazaYincana: z.boolean(),
  organizador: linea(2, 90, 'Organizador').nullable(),
}).strict()

export const altaEntidad = z.object({
  nombre: linea(3, 120, 'Nombre de la entidad'),
  tipo: z.enum(TIPOS_ENTIDAD.map((t) => t.id) as [string, ...string[]], 'Elige el tipo de entidad.'),
  cif: z.string().transform(normalizarCif).refine(cifValido, 'El CIF no es válido. Revisa que esté bien escrito.'),
  municipioId: z.number().int().positive(),
  personaContacto: linea(3, 90, 'Persona de contacto'),
  telefono: z.string().trim().regex(/^\+?[\d\s]{9,15}$/, 'El teléfono no es válido.'),
  web: enlaceWeb,
  email,
  clave: z.string().max(200),
  aceptaCondiciones: z.literal(true, 'Hay que aceptar las condiciones.'),
}).strict()

export const municipio = z.object({
  nombre: linea(2, 60, 'Nombre'),
  lat: z.number().min(36.9).max(38.3),
  lng: z.number().min(-7.6).max(-6.0),
  activo: z.boolean(),
}).strict()

export async function leer<T extends z.ZodType>(c: C, esquema: T): Promise<z.output<T>> {
  let cuerpo: unknown
  try {
    cuerpo = await c.req.json()
  } catch {
    throw fallo(400, 'La petición no es válida.')
  }
  const r = esquema.safeParse(cuerpo)
  if (!r.success) throw fallo(400, r.error.issues[0]?.message ?? 'Hay datos que no son válidos.')
  return r.data
}
