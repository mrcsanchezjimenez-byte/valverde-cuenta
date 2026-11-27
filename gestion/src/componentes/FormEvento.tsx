import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { CATEGORIAS, ESCENAS, escenaPorDefecto } from '../../../compartido/categorias.ts'
import type { DatosEvento, Municipio, TipoEscena } from '../../../compartido/tipos.ts'
import { prepararFoto } from '../../../navegador/medios.ts'
import { Escena } from '../../../src/componentes/Escena.tsx'
import { subirImagen } from '../api.ts'
import { Icono } from './Iconos.tsx'
import { Fallo, useAccion } from './piezas.tsx'
import { SelectorMapa } from './SelectorMapa.tsx'

export interface Ajustes {
  escena: TipoEscena
  enlazaYincana: boolean
  organizador: string | null
}

export const eventoVacio = (municipio?: Municipio): DatosEvento => ({
  titulo: '', resumen: '', descripcion: '', inicio: '', fin: '', lugar: '', municipioId: municipio?.id ?? 0,
  lat: municipio?.lat ?? 37.5752, lng: municipio?.lng ?? -6.752, precio: null, publico: 'Todos los públicos',
  categoria: 'fiestas', paraNinos: false, enlace: '', imagen: null,
})

function Campo({ etiqueta, ayuda, children, cuenta, ancho }: {
  etiqueta: string
  ayuda?: string
  children: ReactNode
  cuenta?: [number, number]
  ancho?: boolean
}) {
  return (
    <label className={ancho ? 'g-campo g-campo-ancho' : 'g-campo'}>
      <span className="g-etiqueta">
        {etiqueta}
        {cuenta && <small className={cuenta[0] > cuenta[1] ? 'g-cuenta pasada' : 'g-cuenta'}>{cuenta[0]}/{cuenta[1]}</small>}
      </span>
      {children}
      {ayuda && <small className="g-ayuda">{ayuda}</small>}
    </label>
  )
}

function Seccion({ paso, titulo, texto, children }: { paso: number; titulo: string; texto?: string; children: ReactNode }) {
  return (
    <section className="g-seccion">
      <header className="g-seccion-cabeza">
        <span className="g-paso">{paso}</span>
        <div>
          <h2>{titulo}</h2>
          {texto && <p>{texto}</p>}
        </div>
      </header>
      <div className="g-rejilla">{children}</div>
    </section>
  )
}

const fechaPrevia = new Intl.DateTimeFormat('es-ES', { weekday: 'short' })
const horaPrevia = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' })

/** Cómo se verá en la agenda de la app, mientras se rellena. */
function VistaPrevia({ d, imagenUrl, escena, organizador }: { d: DatosEvento; imagenUrl: string | null; escena: TipoEscena; organizador: string }) {
  const fecha = d.inicio ? new Date(d.inicio) : null
  return (
    <aside className="g-previa" aria-label="Vista previa">
      <p className="g-previa-titulo">Así se verá en la app</p>
      <article className="g-previa-tarjeta">
        <div className="g-previa-imagen">
          {imagenUrl ? <img src={imagenUrl} alt="" /> : <Escena tipo={escena} />}
          {fecha && (
            <span className="g-previa-fecha"><small>{fechaPrevia.format(fecha).replace('.', '').toUpperCase()}</small><b>{fecha.getDate()}</b></span>
          )}
          {d.precio === null && <span className="g-previa-gratis">Gratis</span>}
        </div>
        <span className="g-previa-quien">{organizador || 'Vuestra entidad'}</span>
        <h3>{d.titulo || 'Título del evento'}</h3>
        <p>{fecha ? horaPrevia.format(fecha) : '--:--'} · {d.lugar || 'Lugar'}</p>
        <p className="g-previa-resumen">{d.resumen || 'Aquí va el resumen en una frase.'}</p>
      </article>
    </aside>
  )
}

/**
 * Formulario de evento. Lo usan las entidades (con «Guardar borrador» y «Enviar a revisión»)
 * y dirección (con ajustes extra: ilustración, enlace con la yincana, organizador).
 */
export function FormEvento({ inicial, imagenUrlInicial = null, municipios, ajustesIniciales, conOrganizador, organizador = '', modo, alGuardar, cabecera }: {
  inicial: DatosEvento
  imagenUrlInicial?: string | null
  municipios: Municipio[]
  /** Solo dirección. */
  ajustesIniciales?: Ajustes
  conOrganizador?: boolean
  /** Nombre que se enseña en la vista previa. */
  organizador?: string
  modo: 'entidad-nuevo' | 'entidad-borrador' | 'entidad-pendiente' | 'entidad-publicado' | 'direccion'
  alGuardar: (datos: DatosEvento, opciones: { enviar: boolean; declaracion: boolean; ajustes?: Ajustes }) => Promise<unknown>
  /** Algo que va encima de las secciones (por ejemplo, «A nombre de»). */
  cabecera?: ReactNode
}) {
  const [d, setD] = useState<DatosEvento>(inicial)
  const [imagenUrl, setImagenUrl] = useState<string | null>(imagenUrlInicial)
  const [ajustes, setAjustes] = useState<Ajustes | undefined>(ajustesIniciales)
  const [declaracion, setDeclaracion] = useState(false)
  const [gratis, setGratis] = useState(inicial.precio === null)
  const { ocupado, error, setError, hacer } = useAccion()
  const subida = useAccion()
  const archivo = useRef<HTMLInputElement>(null)
  const poner = <K extends keyof DatosEvento>(k: K, v: DatosEvento[K]) => setD((x) => ({ ...x, [k]: v }))

  const cambiarMunicipio = (id: number) => {
    const m = municipios.find((x) => x.id === id)
    setD((x) => ({ ...x, municipioId: id, ...(m ? { lat: m.lat, lng: m.lng } : {}) }))
  }

  const elegirImagen = (f: File | undefined) => {
    if (!f) return
    void subida.hacer(async () => {
      const r = await subirImagen(await prepararFoto(f))
      poner('imagen', r.clave)
      setImagenUrl(r.url)
    })
  }

  const guardar = (enviar: boolean) => (e?: FormEvent) => {
    e?.preventDefault()
    if (enviar && modo !== 'direccion' && !declaracion) return setError('Marca la casilla de la declaración para enviarlo.')
    if (!gratis && (d.precio === null || d.precio <= 0)) return setError('Escribe el precio o marca «Gratis».')
    void hacer(() => alGuardar({ ...d, precio: gratis ? null : d.precio }, { enviar, declaracion, ajustes }))
  }

  const textoEnviar = {
    'entidad-nuevo': 'Enviar a revisión', 'entidad-borrador': 'Enviar a revisión', 'entidad-pendiente': 'Guardar cambios',
    'entidad-publicado': 'Enviar cambios a revisión', direccion: 'Guardar y publicar',
  }[modo]
  const escena = ajustes?.escena ?? escenaPorDefecto(d.categoria)
  const nombreOrganizador = ajustes?.organizador || organizador

  return (
    <form className="g-editor" onSubmit={guardar(true)}>
      <div className="g-editor-campos">
        {cabecera}

        <Seccion paso={1} titulo="Qué" texto="Lo que verá la gente en la agenda.">
          <Campo etiqueta="Título" cuenta={[d.titulo.length, 90]} ancho>
            <input value={d.titulo} onChange={(e) => poner('titulo', e.target.value)} required minLength={3} maxLength={90}
              placeholder="Por ejemplo: Zambombá de Navidad" />
          </Campo>
          <Campo etiqueta="Resumen en una frase" ayuda="Sale en la lista de la agenda, debajo del título." cuenta={[d.resumen.length, 160]} ancho>
            <input value={d.resumen} onChange={(e) => poner('resumen', e.target.value)} required minLength={10} maxLength={160} />
          </Campo>
          <Campo etiqueta="Descripción" cuenta={[d.descripcion.length, 2000]} ancho>
            <textarea rows={6} value={d.descripcion} onChange={(e) => poner('descripcion', e.target.value)} required minLength={20} maxLength={2000}
              placeholder="Qué se va a hacer, qué hay que llevar, si hay que apuntarse…" />
          </Campo>
          <Campo etiqueta="Categoría">
            <select value={d.categoria} onChange={(e) => {
              const categoria = e.target.value as DatosEvento['categoria']
              poner('categoria', categoria)
              if (ajustes) setAjustes({ ...ajustes, escena: escenaPorDefecto(categoria) })
            }}>
              {CATEGORIAS.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.nombre}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Público">
            <input value={d.publico} onChange={(e) => poner('publico', e.target.value)} required maxLength={60} placeholder="Todos los públicos" />
          </Campo>
          <label className="g-interruptor g-campo-ancho">
            <input type="checkbox" checked={d.paraNinos} onChange={(e) => poner('paraNinos', e.target.checked)} />
            <span className="g-interruptor-pista" aria-hidden="true" />
            <span>Pensado también para niños y niñas</span>
          </label>
        </Seccion>

        <Seccion paso={2} titulo="Cuándo">
          <Campo etiqueta="Empieza">
            <input type="datetime-local" value={d.inicio} onChange={(e) => {
              const inicio = e.target.value
              setD((x) => ({ ...x, inicio, fin: !x.fin || x.fin <= inicio ? inicio : x.fin }))
            }} required />
          </Campo>
          <Campo etiqueta="Termina" ayuda="Aproximado vale: sirve para quitarlo de la agenda cuando acabe.">
            <input type="datetime-local" value={d.fin} min={d.inicio} onChange={(e) => poner('fin', e.target.value)} required />
          </Campo>
        </Seccion>

        <Seccion paso={3} titulo="Dónde" texto="Pulsa en el mapa el sitio exacto o arrastra la marca.">
          <Campo etiqueta="Municipio">
            <select value={d.municipioId} onChange={(e) => cambiarMunicipio(Number(e.target.value))} required>
              <option value={0} disabled>Elige…</option>
              {municipios.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Lugar">
            <input value={d.lugar} onChange={(e) => poner('lugar', e.target.value)} required maxLength={120} placeholder="Plaza, calle, edificio…" />
          </Campo>
          <div className="g-campo-ancho">
            <SelectorMapa lat={d.lat} lng={d.lng} alElegir={(p) => setD((x) => ({ ...x, ...p }))} />
          </div>
        </Seccion>

        <Seccion paso={4} titulo="Cartel o foto" texto="Opcional. Si no subís nada, ponemos una ilustración del pueblo según la categoría.">
          <div className="g-cartel g-campo-ancho">
            <div className="g-cartel-muestra">
              {imagenUrl ? <img src={imagenUrl} alt="Cartel del evento" /> : <Escena tipo={escena} />}
            </div>
            <div className="g-cartel-acciones">
              <p className="g-ayuda">{imagenUrl ? 'Este es el cartel que se verá en la ficha del evento.' : 'Ahora mismo se verá esta ilustración.'} Lo revisamos junto con el evento.</p>
              <input ref={archivo} type="file" accept="image/jpeg,image/png" hidden onChange={(e) => {
                elegirImagen(e.target.files?.[0])
                e.target.value = ''
              }} />
              <button type="button" className="g-boton g-boton-suave" disabled={subida.ocupado} onClick={() => archivo.current?.click()}>
                <Icono n="imagen" /> {subida.ocupado ? 'Subiendo…' : imagenUrl ? 'Cambiar imagen' : 'Subir cartel o foto'}
              </button>
              {imagenUrl && (
                <button type="button" className="g-enlace" onClick={() => {
                  poner('imagen', null)
                  setImagenUrl(null)
                }}>Quitar y usar la ilustración</button>
              )}
              <Fallo>{subida.error}</Fallo>
            </div>
          </div>
        </Seccion>

        <Seccion paso={5} titulo="Entrada y más información">
          <div className="g-campo">
            <span className="g-etiqueta">Precio</span>
            <div className="g-segmento" role="radiogroup" aria-label="Precio">
              <button type="button" role="radio" aria-checked={gratis} className={gratis ? 'activo' : ''} onClick={() => setGratis(true)}>Gratis</button>
              <button type="button" role="radio" aria-checked={!gratis} className={!gratis ? 'activo' : ''} onClick={() => setGratis(false)}>De pago</button>
            </div>
            {!gratis && (
              <span className="g-euros">
                <input type="number" min={0.5} max={500} step={0.5} value={d.precio ?? ''} aria-label="Precio en euros"
                  onChange={(e) => poner('precio', e.target.value === '' ? null : Number(e.target.value))} required />
                <span>€</span>
              </span>
            )}
          </div>
          <Campo etiqueta="Enlace (opcional)" ayuda="Web, red social o venta de entradas.">
            <input type="url" value={d.enlace} onChange={(e) => poner('enlace', e.target.value)} placeholder="https://" maxLength={300} />
          </Campo>
        </Seccion>

        {ajustes && (
          <section className="g-seccion g-solo-direccion">
            <header className="g-seccion-cabeza">
              <span className="g-paso"><Icono n="lapiz" tam={16} /></span>
              <div><h2>Solo dirección</h2><p>No lo ve la entidad.</p></div>
            </header>
            <div className="g-rejilla">
              {conOrganizador && (
                <Campo etiqueta="Organiza" ayuda="Se ve en la ficha. Para eventos de quien no tiene cuenta." ancho>
                  <input value={ajustes.organizador ?? ''} onChange={(e) => setAjustes({ ...ajustes, organizador: e.target.value })} required maxLength={90} />
                </Campo>
              )}
              <Campo etiqueta="Ilustración si no hay cartel">
                <select value={ajustes.escena} onChange={(e) => setAjustes({ ...ajustes, escena: e.target.value as TipoEscena })}>
                  {ESCENAS.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </Campo>
              <label className="g-interruptor g-alineado-abajo">
                <input type="checkbox" checked={ajustes.enlazaYincana} onChange={(e) => setAjustes({ ...ajustes, enlazaYincana: e.target.checked })} />
                <span className="g-interruptor-pista" aria-hidden="true" />
                <span>Enlazar con la yincana</span>
              </label>
            </div>
          </section>
        )}

        {modo !== 'direccion' && (
          <label className="g-declaracion">
            <input type="checkbox" checked={declaracion} onChange={(e) => setDeclaracion(e.target.checked)} />
            <span>
              Declaro que lo organiza nuestra entidad (o colabora en él), que no es propaganda política ni sindical y que no es publicidad
              de una empresa o comercio. Somos responsables de su desarrollo: Valverde Cuenta solo lo difunde.
            </span>
          </label>
        )}
        {modo === 'entidad-publicado' && (
          <p className="g-aviso">El evento sigue publicado como está ahora. Los cambios se verán cuando los revisemos.</p>
        )}
      </div>

      <VistaPrevia d={{ ...d, precio: gratis ? null : d.precio }} imagenUrl={imagenUrl} escena={escena} organizador={nombreOrganizador} />

      <div className="g-barra-acciones">
        <Fallo>{error}</Fallo>
        <div className="g-barra-botones">
          {(modo === 'entidad-nuevo' || modo === 'entidad-borrador') && (
            <button type="button" className="g-boton g-boton-suave" disabled={ocupado} onClick={() => guardar(false)()}>Guardar borrador</button>
          )}
          <button className="g-boton g-boton-primario" disabled={ocupado || subida.ocupado}>{ocupado ? 'Guardando…' : textoEnviar}</button>
        </div>
      </div>
    </form>
  )
}
