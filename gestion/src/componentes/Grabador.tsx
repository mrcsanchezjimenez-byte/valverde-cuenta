import { useEffect, useRef, useState } from 'react'
import { duracion, empezarGrabacion, puedeGrabar, type Grabacion } from '../../../navegador/grabador.ts'
import { Icono } from './Iconos.tsx'
import { Fallo } from './piezas.tsx'

/** Grabar o elegir un audio. Devuelve el archivo con `alCambiar` (null si se quita). */
export function GrabadorAudio({ alCambiar }: { alCambiar: (audio: Blob | null) => void }) {
  const [grabando, setGrabando] = useState(false)
  const [segundos, setSegundos] = useState(0)
  const [audio, setAudio] = useState<{ blob: Blob; url: string } | null>(null)
  const [error, setError] = useState('')
  const grabacion = useRef<Grabacion | null>(null)
  const archivo = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!grabando) return
    const t = setInterval(() => setSegundos((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [grabando])
  useEffect(() => () => grabacion.current?.cancelar(), [])

  const poner = (blob: Blob | null) => {
    if (audio) URL.revokeObjectURL(audio.url)
    setAudio(blob ? { blob, url: URL.createObjectURL(blob) } : null)
    alCambiar(blob)
  }

  return (
    <div className="g-grabador">
      {audio ? (
        <>
          <audio controls src={audio.url} />
          <button type="button" className="g-enlace" onClick={() => poner(null)}>Quitar el audio</button>
        </>
      ) : grabando ? (
        <div className="g-grabando">
          <span className="g-piloto" aria-hidden="true" />
          <b>Grabando · {duracion(segundos)}</b>
          <button type="button" className="g-boton g-boton-primario" onClick={async () => {
            const blob = await grabacion.current!.parar()
            grabacion.current = null
            setGrabando(false)
            poner(blob)
          }}><Icono n="parar" /> Parar</button>
        </div>
      ) : (
        <div className="g-fila-botones g-fila-izquierda">
          {puedeGrabar() && (
            <button type="button" className="g-boton g-boton-suave" onClick={async () => {
              setError('')
              try {
                grabacion.current = await empezarGrabacion()
                setSegundos(0)
                setGrabando(true)
              } catch (e) {
                setError((e as Error).message)
              }
            }}><Icono n="microfono" /> Grabar ahora</button>
          )}
          <button type="button" className="g-boton g-boton-suave" onClick={() => archivo.current?.click()}><Icono n="descargar" /> Subir un audio</button>
          <input ref={archivo} type="file" accept="audio/*" hidden onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) poner(f)
            e.target.value = ''
          }} />
        </div>
      )}
      <Fallo>{error}</Fallo>
    </div>
  )
}
