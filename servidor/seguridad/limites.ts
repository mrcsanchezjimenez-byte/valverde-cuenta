/**
 * Límite de intentos en memoria: suficiente con un solo proceso de servidor.
 * Si algún día hubiera varios, esto pasaría a la base de datos.
 */
const cubos = new Map<string, { cuenta: number; hasta: number }>()

/** true si aún se permite; false si se ha pasado del máximo en la ventana. */
export function permitir(clave: string, maximo: number, ventanaMs: number, ahora = Date.now()) {
  const cubo = cubos.get(clave)
  if (!cubo || cubo.hasta <= ahora) {
    cubos.set(clave, { cuenta: 1, hasta: ahora + ventanaMs })
    return true
  }
  cubo.cuenta++
  return cubo.cuenta <= maximo
}

export const vaciarLimites = () => cubos.clear()

setInterval(() => {
  const ahora = Date.now()
  for (const [k, v] of cubos) if (v.hasta <= ahora) cubos.delete(k)
}, 60_000).unref()
