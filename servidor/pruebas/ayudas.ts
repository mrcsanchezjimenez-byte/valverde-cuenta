import { randomBytes } from 'node:crypto'

// Antes de cargar nada del servidor: modo pruebas y una clave de cifrado de usar y tirar.
process.env.VC_PRUEBAS = '1'
process.env.VC_CLAVE ??= randomBytes(32).toString('base64')

const { iniciarBd, ejecutar, uno } = await import('../bd.ts')
const { crearApp } = await import('../app.ts')
const { bandeja } = await import('../correo.ts')
const { vaciarLimites } = await import('../seguridad/limites.ts')
const { cifrarClave } = await import('../seguridad/claves.ts')
const cifrado = await import('../seguridad/cifrado.ts')
const { codigo, nuevoSecreto, pasoActual } = await import('../seguridad/totp.ts')

export { bandeja, codigo, ejecutar, pasoActual, uno }

export type App = ReturnType<typeof crearApp>

/** Base de datos en memoria y límites a cero para cada prueba. */
export function nuevoEntorno() {
  iniciarBd(':memory:')
  vaciarLimites()
  bandeja.length = 0
  return crearApp()
}

/** Un navegador de mentira: guarda la cookie de sesión entre peticiones. */
export class Cliente {
  cookie = ''
  app: App
  constructor(app: App) {
    this.app = app
  }

  async pedir(metodo: string, ruta: string, cuerpo?: unknown, cabeceras: Record<string, string> = {}) {
    const r = await this.app.request(ruta, {
      method: metodo,
      headers: {
        ...(cuerpo !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(metodo !== 'GET' ? { 'x-vc': '1' } : {}),
        ...(this.cookie ? { cookie: this.cookie } : {}),
        ...cabeceras,
      },
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
    })
    const nueva = r.headers.get('set-cookie')
    if (nueva) this.cookie = /Max-Age=0/i.test(nueva) ? '' : nueva.split(';')[0]
    const esJson = (r.headers.get('content-type') ?? '').includes('application/json')
    const texto = esJson ? await r.text() : ''
    return { estado: r.status, datos: texto ? JSON.parse(texto) : null, cabeceras: r.headers }
  }
}

export const CLAVE = 'una clave larga de pruebas'

/** Cuenta de dirección ya con doble factor. Devuelve el secreto para calcular códigos. */
export async function crearDireccion(email = 'pilar@ejemplo.es') {
  const secreto = nuevoSecreto()
  ejecutar(
    "INSERT INTO usuarios (email, nombre, rol, hash_clave, email_verificado, totp_secreto, totp_activo) VALUES (?, 'Pilar', 'direccion', ?, 1, ?, 1)",
    email, await cifrarClave(CLAVE), cifrado.cifrar(secreto),
  )
  return secreto
}

/** Entra con contraseña y código. `desfase` evita reutilizar el mismo código en la misma prueba. */
export async function entrarDireccion(app: App, secreto: string, email = 'pilar@ejemplo.es', desfase = 0) {
  const cli = new Cliente(app)
  await cli.pedir('POST', '/api/cuenta/entrar', { email, clave: CLAVE })
  const r = await cli.pedir('POST', '/api/cuenta/codigo', { codigo: codigo(secreto, pasoActual() + desfase) })
  if (r.estado !== 200) throw new Error(`No entra dirección: ${JSON.stringify(r.datos)}`)
  return cli
}

/** CIF con su dígito o letra de control bien calculados. */
export function cif(letra: string, siete: string) {
  let suma = 0
  for (let i = 0; i < 7; i++) {
    const d = Number(siete[i])
    suma += i % 2 === 0 ? Math.floor((d * 2) / 10) + ((d * 2) % 10) : d
  }
  const control = (10 - (suma % 10)) % 10
  return letra + siete + ('NPQRSW'.includes(letra) ? 'JABCDEFGHI'[control] : String(control))
}

/** Da de alta una asociación, confirma su correo y (si se pide) la verifica dirección. */
export async function crearEntidad(app: App, opciones: { email?: string; cifSiete?: string; verificar?: Cliente } = {}) {
  const email = opciones.email ?? 'pena@ejemplo.es'
  const alta = await new Cliente(app).pedir('POST', '/api/cuenta/alta', {
    nombre: 'Peña Cultural El Boto', tipo: 'pena', cif: cif('G', opciones.cifSiete ?? '2100001'), municipioId: 1,
    personaContacto: 'Juan Pérez', telefono: '600 000 000', web: '', email, clave: CLAVE, aceptaCondiciones: true,
  })
  if (alta.estado !== 200) throw new Error(`Alta fallida: ${JSON.stringify(alta.datos)}`)
  const enlace = bandeja.findLast((c) => c.para === email)!.texto.match(/verificar\?t=([\w-]+)/)![1]
  await new Cliente(app).pedir('POST', '/api/cuenta/verificar', { token: enlace })
  const entidadId = uno<{ entidad_id: number }>('SELECT entidad_id FROM usuarios WHERE email = ?', email)!.entidad_id
  if (opciones.verificar) await opciones.verificar.pedir('POST', `/api/direccion/entidades/${entidadId}/verificar`, {})
  const cli = new Cliente(app)
  const r = await cli.pedir('POST', '/api/cuenta/entrar', { email, clave: CLAVE })
  if (r.estado !== 200) throw new Error(`No entra la entidad: ${JSON.stringify(r.datos)}`)
  return { cli, entidadId, email }
}

/** Un evento válido dentro de unas semanas. */
export function eventoValido(cambios: Record<string, unknown> = {}) {
  const d = new Date(Date.now() + 20 * 86400_000).toISOString().slice(0, 10)
  return {
    titulo: 'Concierto de la banda', resumen: 'La banda toca su repertorio de invierno.',
    descripcion: 'Un concierto al aire libre para toda la familia, con repertorio clásico.',
    inicio: `${d}T19:00`, fin: `${d}T21:00`, lugar: 'Plaza de la Constitución', municipioId: 1,
    lat: 37.574, lng: -6.749, precio: null, publico: 'Todos los públicos', categoria: 'musica', paraNinos: true, enlace: '', imagen: null, inscripcion: null,
    ...cambios,
  }
}
