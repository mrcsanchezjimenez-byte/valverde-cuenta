import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import type { Consentimiento, Lugar } from '../../compartido/tipos.ts'
import { CONSENTIMIENTOS, EPOCAS, LIMITES_ARCHIVOS } from '../../compartido/tipos.ts'
import { duracion, empezarGrabacion, extensionAudio, puedeGrabar, type Grabacion } from '../../navegador/grabador.ts'
import { prepararFoto } from '../../navegador/medios.ts'
import { Icono } from '../componentes/Iconos'
import { cargarLugares, enviarHistoria } from '../datos/repositorio'

/** Grabar con el micrófono o elegir un audio del móvil. */
function Grabador({ audio, alCambiar }: { audio: Blob | null; alCambiar: (b: Blob | null) => void }) {
  const [grabando, setGrabando] = useState(false)
  const [segundos, setSegundos] = useState(0)
  const [error, setError] = useState('')
  const grabacion = useRef<Grabacion | null>(null)
  const archivo = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!grabando) return
    const t = setInterval(() => setSegundos((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [grabando])
  useEffect(() => {
    if (!audio) return setUrl(null)
    const u = URL.createObjectURL(audio)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [audio])
  useEffect(() => () => grabacion.current?.cancelar(), [])

  if (audio && url) {
    return (
      <div className="grabador">
        <audio controls src={url} />
        <button type="button" className="enlace-accion" onClick={() => alCambiar(null)}>Borrar y grabar otra vez</button>
      </div>
    )
  }
  if (grabando) {
    return (
      <div className="grabador grabando">
        <span className="piloto" aria-hidden="true" />
        <b>Grabando · {duracion(segundos)}</b>
        <button type="button" className="boton boton-primario" onClick={async () => {
          const b = await grabacion.current!.parar()
          grabacion.current = null
          setGrabando(false)
          alCambiar(b)
        }}>Parar</button>
      </div>
    )
  }
  return (
    <div className="grabador">
      <div className="fila-botones">
        {puedeGrabar() && (
          <button type="button" className="boton boton-suave" onClick={async () => {
            setError('')
            try {
              grabacion.current = await empezarGrabacion()
              setSegundos(0)
              setGrabando(true)
            } catch (e) {
              setError((e as Error).message)
            }
          }}><Icono n="historias" tam={18} /> Grabar</button>
        )}
        <button type="button" className="boton boton-suave" onClick={() => archivo.current?.click()}>Elegir audio</button>
      </div>
      <input ref={archivo} type="file" accept="audio/*" hidden onChange={(e) => {
        const f = e.target.files?.[0]
        if (f) alCambiar(f)
        e.target.value = ''
      }} />
      {error && <p className="error-formulario">{error}</p>}
    </div>
  )
}

const CONS = Object.entries(CONSENTIMIENTOS) as [Consentimiento, string][]

/** «Cuéntanos una historia»: cualquiera puede mandarla; la revisamos antes de publicarla. */
export function Contar() {
  const navegar = useNavigate()
  const [params] = useSearchParams()
  const [lugares, setLugares] = useState<Lugar[]>([])
  const [f, setF] = useState({
    titulo: '', texto: '', epoca: '', lugar: params.get('lugar') ?? '', lugarTexto: '', firma: 'nombre' as 'nombre' | 'anonimo',
    autor: '', contactoNombre: '', contactoEmail: '', contactoTelefono: '', web: '',
  })
  const [acepta, setAcepta] = useState<Record<Consentimiento, boolean>>({ cesion: false, autoria: false, personas: false, edad: false })
  const [audio, setAudio] = useState<Blob | null>(null)
  const [fotos, setFotos] = useState<{ blob: Blob; url: string }[]>([])
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [hecho, setHecho] = useState(false)
  const archivo = useRef<HTMLInputElement>(null)
  const poner = (c: Partial<typeof f>) => setF({ ...f, ...c })

  useEffect(() => {
    cargarLugares().then(setLugares).catch(() => undefined)
  }, [])

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (f.texto.trim().length < 30 && !audio) return setError('Cuenta la historia por escrito (al menos unas líneas) o grábala.')
    if (CONS.some(([k]) => !acepta[k])) return setError('Para poder publicarla necesitamos que marques las cuatro casillas de permisos.')
    const d = new FormData()
    const valores: Record<string, string> = {
      titulo: f.titulo, texto: f.texto, epoca: f.epoca, lugarSlug: f.lugar, lugarTexto: f.lugar ? '' : f.lugarTexto, firma: f.firma, autor: f.autor,
      contactoNombre: f.contactoNombre, contactoEmail: f.contactoEmail, contactoTelefono: f.contactoTelefono, web: f.web,
    }
    for (const [k, v] of Object.entries(valores)) d.append(k, v)
    for (const [k] of CONS) d.append(`acepta_${k}`, acepta[k] ? 'si' : '')
    fotos.forEach((x, i) => d.append('fotos', x.blob, `foto-${i + 1}.jpg`))
    if (audio) d.append('audio', audio, `historia.${extensionAudio(audio.type)}`)
    setEnviando(true)
    try {
      await enviarHistoria(d)
      setHecho(true)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  if (hecho) {
    return (
      <div className="pantalla fin">
        <div className="fin-medalla"><Icono n="check" tam={42} /></div>
        <h1>¡Gracias!</h1>
        <p className="entradilla">Hemos recibido tu historia. La leeremos con calma antes de publicarla{f.contactoEmail ? ' y te avisaremos por correo' : ''}.</p>
        <Link to="/historias" className="boton boton-primario boton-ancho">Leer otras historias</Link>
        <button className="boton boton-suave boton-ancho" onClick={() => navegar('/')}>Volver al inicio</button>
      </div>
    )
  }

  return (
    <form className="pantalla contar" onSubmit={enviar}>
      <div className="cabecera">
        <button type="button" className="boton-redondo" onClick={() => navegar(-1)} aria-label="Volver"><Icono n="atras" tam={20} /></button>
      </div>
      <header>
        <p className="antetitulo">La memoria del pueblo</p>
        <h1>Cuéntanos una <em>historia</em></h1>
      </header>
      <p className="entradilla">Un recuerdo, un oficio, una fiesta, alguien que había que conocer… Escríbela o grábala hablando, como prefieras.</p>

      <label className="campo"><span>Ponle un título</span>
        <input value={f.titulo} onChange={(e) => poner({ titulo: e.target.value })} required minLength={3} maxLength={120} placeholder="Por ejemplo: La fragua de mi abuelo" />
      </label>

      <div className="campo">
        <span>Grábala con tu voz <small>(opcional)</small></span>
        <Grabador audio={audio} alCambiar={setAudio} />
      </div>

      <label className="campo"><span>O escríbela {audio && <small>(opcional si la has grabado)</small>}</span>
        <textarea rows={7} value={f.texto} maxLength={8000} onChange={(e) => poner({ texto: e.target.value })} placeholder="Cuéntanos qué pasó, quién estaba, cómo era…" />
      </label>

      <div className="campo">
        <span>Fotos <small>(hasta {LIMITES_ARCHIVOS.fotos}; si es una foto de papel, hazle una foto con el móvil)</small></span>
        {!!fotos.length && (
          <div className="fotos-elegidas">
            {fotos.map((x, i) => (
              <span key={x.url}><img src={x.url} alt="" /><button type="button" aria-label="Quitar foto" onClick={() => setFotos(fotos.filter((_, n) => n !== i))}><Icono n="cerrar" tam={14} /></button></span>
            ))}
          </div>
        )}
        <input ref={archivo} type="file" accept="image/*" multiple hidden onChange={async (e) => {
          const lista = [...(e.target.files ?? [])].slice(0, LIMITES_ARCHIVOS.fotos - fotos.length)
          e.target.value = ''
          try {
            const nuevas = await Promise.all(lista.map(async (x) => {
              const blob = await prepararFoto(x)
              return { blob, url: URL.createObjectURL(blob) }
            }))
            setFotos((y) => [...y, ...nuevas])
          } catch (err) {
            setError((err as Error).message)
          }
        }} />
        {fotos.length < LIMITES_ARCHIVOS.fotos && <button type="button" className="boton boton-suave" onClick={() => archivo.current?.click()}>Añadir fotos</button>}
      </div>

      <label className="campo"><span>¿De qué época es?</span>
        <select value={f.epoca} onChange={(e) => poner({ epoca: e.target.value })}>
          <option value="">Elige…</option>
          {EPOCAS.map((ep) => <option key={ep}>{ep}</option>)}
        </select>
      </label>

      <label className="campo"><span>¿Dónde pasó?</span>
        <select value={f.lugar} onChange={(e) => poner({ lugar: e.target.value })}>
          <option value="">Otro sitio (lo escribo)</option>
          {lugares.map((l) => <option key={l.slug} value={l.slug}>{l.nombre}</option>)}
        </select>
      </label>
      {!f.lugar && (
        <label className="campo"><span>Escribe el sitio <small>(opcional)</small></span>
          <input value={f.lugarTexto} maxLength={120} onChange={(e) => poner({ lugarTexto: e.target.value })} placeholder="Calle, barrio, cortijo…" />
        </label>
      )}

      <div className="campo">
        <span>¿Cómo quieres firmarla?</span>
        <div className="segmentado">
          <button type="button" className={f.firma === 'nombre' ? 'activo' : ''} onClick={() => poner({ firma: 'nombre' })}>Con mi nombre</button>
          <button type="button" className={f.firma === 'anonimo' ? 'activo' : ''} onClick={() => poner({ firma: 'anonimo' })}>Como «un vecino»</button>
        </div>
      </div>
      {f.firma === 'nombre' && (
        <label className="campo"><span>Nombre que saldrá publicado</span>
          <input value={f.autor} maxLength={80} required onChange={(e) => poner({ autor: e.target.value })} placeholder="Por ejemplo: Carmen, la del estanco" />
        </label>
      )}

      <fieldset className="bloque-contacto">
        <legend>Para escribirte si tenemos dudas <small>(no se publica)</small></legend>
        <label className="campo"><span>Tu nombre</span><input autoComplete="name" value={f.contactoNombre} maxLength={80} onChange={(e) => poner({ contactoNombre: e.target.value })} /></label>
        <label className="campo"><span>Correo</span><input type="email" autoComplete="email" value={f.contactoEmail} onChange={(e) => poner({ contactoEmail: e.target.value })} /></label>
        <label className="campo"><span>Teléfono</span><input type="tel" autoComplete="tel" value={f.contactoTelefono} onChange={(e) => poner({ contactoTelefono: e.target.value })} /></label>
      </fieldset>
      <input className="trampa" tabIndex={-1} autoComplete="off" aria-hidden="true" value={f.web} onChange={(e) => poner({ web: e.target.value })} />

      <fieldset className="permisos">
        <legend>Permisos para publicarla</legend>
        {CONS.map(([k, texto]) => (
          <label key={k} className="casilla">
            <input type="checkbox" checked={acepta[k]} onChange={(e) => setAcepta({ ...acepta, [k]: e.target.checked })} />
            <span>{texto}</span>
          </label>
        ))}
      </fieldset>

      {error && <p className="error-formulario" role="alert">{error}</p>}
      <button className="boton boton-primario boton-ancho boton-grande" disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar mi historia'}</button>
      <p className="nota-legal">La leeremos antes de publicarla y podremos corregir alguna errata. Si algún día quieres que la quitemos, escríbenos y la retiramos.</p>
    </form>
  )
}
