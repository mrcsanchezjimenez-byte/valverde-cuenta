/**
 * Grabar audio con el micrófono del móvil o del ordenador (lo usan la app y el modo entrevista
 * del panel). El navegador elige el formato que sabe hacer: WebM/Opus en Android y Chrome,
 * MP4/AAC en iPhone. El servidor acepta los dos.
 */
export interface Grabacion {
  /** Para y devuelve el audio grabado. */
  parar: () => Promise<Blob>
  /** Para y descarta lo grabado. */
  cancelar: () => void
}

const FORMATOS = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']

export const puedeGrabar = () => typeof MediaRecorder !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia)

export async function empezarGrabacion(): Promise<Grabacion> {
  if (!puedeGrabar()) throw new Error('Este navegador no permite grabar audio. Puedes subir un archivo de audio grabado con el móvil.')
  let flujo: MediaStream
  try {
    flujo = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
  } catch {
    throw new Error('No tenemos permiso para usar el micrófono. Revisa los permisos del navegador.')
  }
  const formato = FORMATOS.find((f) => MediaRecorder.isTypeSupported(f))
  const grabadora = new MediaRecorder(flujo, formato ? { mimeType: formato, audioBitsPerSecond: 64_000 } : undefined)
  const trozos: Blob[] = []
  grabadora.ondataavailable = (e) => {
    if (e.data.size) trozos.push(e.data)
  }
  grabadora.start(1000)
  const apagar = () => flujo.getTracks().forEach((t) => t.stop())
  return {
    parar: () => new Promise((ok) => {
      grabadora.onstop = () => {
        apagar()
        ok(new Blob(trozos, { type: grabadora.mimeType || 'audio/webm' }))
      }
      grabadora.stop()
    }),
    cancelar: () => {
      grabadora.onstop = apagar
      if (grabadora.state !== 'inactive') grabadora.stop()
      else apagar()
    },
  }
}

export const extensionAudio = (tipo: string) => (tipo.includes('mp4') ? 'm4a' : tipo.includes('ogg') ? 'ogg' : 'webm')

export const duracion = (segundos: number) => `${Math.floor(segundos / 60)}:${String(Math.floor(segundos % 60)).padStart(2, '0')}`
