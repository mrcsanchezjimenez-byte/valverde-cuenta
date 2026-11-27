/**
 * Todas las llamadas al servidor pasan por aquí. Siempre JSON y siempre con la cabecera propia
 * X-VC: el servidor rechaza cualquier escritura que no la lleve.
 */
export class ErrorApi extends Error {
  estado: number
  constructor(estado: number, mensaje: string) {
    super(mensaje)
    this.estado = estado
  }
}

/** Demostración sin servidor (GitHub Pages): las llamadas las responde demo.ts en el navegador. */
export const MODO_DEMO = import.meta.env.VITE_DEMO === '1'

export async function api<T = unknown>(metodo: 'GET' | 'POST' | 'PUT' | 'DELETE', ruta: string, cuerpo?: unknown): Promise<T> {
  if (MODO_DEMO) {
    const { apiDemo, FalloDemo } = await import('./demo.ts')
    try {
      return (await apiDemo(metodo, ruta, cuerpo)) as T
    } catch (e) {
      if (e instanceof FalloDemo) {
        if (e.estado === 401) window.dispatchEvent(new Event('vc-sesion-perdida'))
        throw new ErrorApi(e.estado, e.message)
      }
      throw e
    }
  }
  let r: Response
  try {
    r = await fetch(`/api${ruta}`, {
      method: metodo,
      credentials: 'same-origin',
      headers: {
        ...(metodo === 'GET' || metodo === 'DELETE' ? {} : { 'Content-Type': 'application/json' }),
        ...(metodo === 'GET' ? {} : { 'X-VC': '1' }),
      },
      body: metodo === 'GET' || metodo === 'DELETE' ? undefined : JSON.stringify(cuerpo ?? {}),
    })
  } catch {
    throw new ErrorApi(0, 'No hay conexión con el servidor. Comprueba tu conexión e inténtalo otra vez.')
  }
  const texto = await r.text()
  let datos: unknown = null
  try {
    datos = texto ? JSON.parse(texto) : null
  } catch {
    // Respuesta que no es JSON: se trata como error genérico.
  }
  if (!r.ok) {
    const mensaje = (datos as { error?: string } | null)?.error ?? 'Algo ha fallado. Inténtalo otra vez.'
    if (r.status === 401) window.dispatchEvent(new Event('vc-sesion-perdida'))
    throw new ErrorApi(r.status, mensaje)
  }
  return datos as T
}
