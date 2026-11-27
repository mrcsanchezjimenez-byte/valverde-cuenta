/**
 * Utilidades del navegador para fotos (las usan la app y el panel).
 *
 * Antes de subir una foto se reduce y se vuelve a dibujar en el propio móvil:
 * pesa mucho menos (sube rápido aunque haya poca cobertura) y pierde por el camino los
 * metadatos (ubicación GPS, modelo del móvil…). El servidor los quita otra vez por si acaso.
 */
export async function prepararFoto(archivo: File, ladoMaximo = 1600, calidad = 0.85): Promise<Blob> {
  if (!/^image\//.test(archivo.type)) throw new Error('Elige una imagen (JPG o PNG).')
  let mapa: ImageBitmap
  try {
    mapa = await createImageBitmap(archivo, { imageOrientation: 'from-image' })
  } catch {
    throw new Error('No hemos podido leer esa imagen. Prueba con otra en JPG o PNG.')
  }
  const escala = Math.min(1, ladoMaximo / Math.max(mapa.width, mapa.height))
  const lienzo = document.createElement('canvas')
  lienzo.width = Math.round(mapa.width * escala)
  lienzo.height = Math.round(mapa.height * escala)
  const ctx = lienzo.getContext('2d')!
  // Fondo blanco: los PNG con transparencia no quedan negros al pasarlos a JPG.
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, lienzo.width, lienzo.height)
  ctx.drawImage(mapa, 0, 0, lienzo.width, lienzo.height)
  mapa.close()
  return new Promise((ok, mal) => lienzo.toBlob((b) => (b ? ok(b) : mal(new Error('No se ha podido preparar la imagen.'))), 'image/jpeg', calidad))
}

export const blobADataUrl = (b: Blob) =>
  new Promise<string>((ok, mal) => {
    const r = new FileReader()
    r.onload = () => ok(String(r.result))
    r.onerror = () => mal(new Error('No se ha podido leer la imagen.'))
    r.readAsDataURL(b)
  })
