import { useState, type FormEvent, type ReactNode } from 'react'
import { CATEGORIAS, ESCENAS, escenaPorDefecto } from '../../../compartido/categorias.ts'
import type { DatosEvento, Municipio, TipoEscena } from '../../../compartido/tipos.ts'
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
  categoria: 'fiestas', paraNinos: false, enlace: '',
})

function Campo({ etiqueta, ayuda, children, cuenta }: { etiqueta: string; ayuda?: string; children: ReactNode; cuenta?: [number, number] }) {
  return (
    <label className="g-campo">
      <span>{etiqueta}{cuenta && <small className={cuenta[0] > cuenta[1] ? 'g-cuenta pasada' : 'g-cuenta'}>{cuenta[0]}/{cuenta[1]}</small>}</span>
      {children}
      {ayuda && <small className="g-ayuda">{ayuda}</small>}
    </label>
  )
}

/**
 * Formulario de evento. Lo usan las entidades (con «Guardar borrador» y «Enviar a revisión»)
 * y dirección (con ajustes extra: ilustración, enlace con la yincana, organizador).
 */
export function FormEvento({ inicial, municipios, ajustesIniciales, conOrganizador, modo, alGuardar }: {
  inicial: DatosEvento
  municipios: Municipio[]
  /** Solo dirección. */
  ajustesIniciales?: Ajustes
  conOrganizador?: boolean
  modo: 'entidad-nuevo' | 'entidad-borrador' | 'entidad-pendiente' | 'entidad-publicado' | 'direccion'
  alGuardar: (datos: DatosEvento, opciones: { enviar: boolean; declaracion: boolean; ajustes?: Ajustes }) => Promise<unknown>
}) {
  const [d, setD] = useState<DatosEvento>(inicial)
  const [ajustes, setAjustes] = useState<Ajustes | undefined>(ajustesIniciales)
  const [declaracion, setDeclaracion] = useState(false)
  const [gratis, setGratis] = useState(inicial.precio === null)
  const { ocupado, error, setError, hacer } = useAccion()
  const poner = <K extends keyof DatosEvento>(k: K, v: DatosEvento[K]) => setD((x) => ({ ...x, [k]: v }))

  const cambiarMunicipio = (id: number) => {
    const m = municipios.find((x) => x.id === id)
    setD((x) => ({ ...x, municipioId: id, ...(m ? { lat: m.lat, lng: m.lng } : {}) }))
  }

  const guardar = (enviar: boolean) => (e?: FormEvent) => {
    e?.preventDefault()
    if (enviar && modo !== 'direccion' && !declaracion) return setError('Marca la casilla de la declaración para enviarlo.')
    if (!gratis && (d.precio === null || d.precio <= 0)) return setError('Escribe el precio o marca «Gratis».')
    void hacer(() => alGuardar({ ...d, precio: gratis ? null : d.precio }, { enviar, declaracion, ajustes }))
  }

  const textoEnviar = {
    'entidad-nuevo': 'Enviar a revisión', 'entidad-borrador': 'Enviar a revisión', 'entidad-pendiente': 'Guardar cambios',
    'entidad-publicado': 'Enviar los cambios a revisión', direccion: 'Guardar y publicar',
  }[modo]

  return (
    <form className="g-form g-form-evento" onSubmit={guardar(true)}>
      <fieldset>
        <legend>Qué</legend>
        <Campo etiqueta="Título" cuenta={[d.titulo.length, 90]}>
          <input value={d.titulo} onChange={(e) => poner('titulo', e.target.value)} required minLength={3} maxLength={90} />
        </Campo>
        <Campo etiqueta="Resumen en una frase" ayuda="Es lo que se ve en la lista de la agenda." cuenta={[d.resumen.length, 160]}>
          <input value={d.resumen} onChange={(e) => poner('resumen', e.target.value)} required minLength={10} maxLength={160} />
        </Campo>
        <Campo etiqueta="Descripción" cuenta={[d.descripcion.length, 2000]}>
          <textarea rows={6} value={d.descripcion} onChange={(e) => poner('descripcion', e.target.value)} required minLength={20} maxLength={2000} />
        </Campo>
        <div className="g-dos">
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
            <input value={d.publico} onChange={(e) => poner('publico', e.target.value)} required maxLength={60} placeholder="Todos los públicos, mayores de 12…" />
          </Campo>
        </div>
        <label className="g-casilla">
          <input type="checkbox" checked={d.paraNinos} onChange={(e) => poner('paraNinos', e.target.checked)} />
          <span>Pensado también para niños y niñas</span>
        </label>
      </fieldset>

      <fieldset>
        <legend>Cuándo</legend>
        <div className="g-dos">
          <Campo etiqueta="Empieza">
            <input type="datetime-local" value={d.inicio} onChange={(e) => {
              const inicio = e.target.value
              setD((x) => ({ ...x, inicio, fin: !x.fin || x.fin <= inicio ? inicio : x.fin }))
            }} required />
          </Campo>
          <Campo etiqueta="Termina" ayuda="Aproximado vale. Sirve para quitarlo de la agenda cuando acabe.">
            <input type="datetime-local" value={d.fin} min={d.inicio} onChange={(e) => poner('fin', e.target.value)} required />
          </Campo>
        </div>
      </fieldset>

      <fieldset>
        <legend>Dónde</legend>
        <div className="g-dos">
          <Campo etiqueta="Municipio">
            <select value={d.municipioId} onChange={(e) => cambiarMunicipio(Number(e.target.value))} required>
              <option value={0} disabled>Elige…</option>
              {municipios.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Lugar">
            <input value={d.lugar} onChange={(e) => poner('lugar', e.target.value)} required maxLength={120} placeholder="Plaza, calle, edificio…" />
          </Campo>
        </div>
        <p className="g-ayuda">Pulsa en el mapa el sitio exacto (o arrastra la marca).</p>
        <SelectorMapa lat={d.lat} lng={d.lng} alElegir={(p) => setD((x) => ({ ...x, ...p }))} />
      </fieldset>

      <fieldset>
        <legend>Entrada y más información</legend>
        <div className="g-dos">
          <div className="g-campo">
            <span>Precio</span>
            <div className="g-precio">
              <label className="g-casilla"><input type="checkbox" checked={gratis} onChange={(e) => setGratis(e.target.checked)} /><span>Gratis</span></label>
              {!gratis && (
                <label className="g-euros">
                  <input type="number" min={0.5} max={500} step={0.5} value={d.precio ?? ''} aria-label="Precio en euros"
                    onChange={(e) => poner('precio', e.target.value === '' ? null : Number(e.target.value))} required /> €
                </label>
              )}
            </div>
          </div>
          <Campo etiqueta="Enlace (opcional)" ayuda="Web, red social o venta de entradas.">
            <input type="url" value={d.enlace} onChange={(e) => poner('enlace', e.target.value)} placeholder="https://" maxLength={300} />
          </Campo>
        </div>
      </fieldset>

      {ajustes && (
        <fieldset className="g-solo-direccion">
          <legend>Solo dirección</legend>
          {conOrganizador && (
            <Campo etiqueta="Organiza" ayuda="Se ve en la ficha. Para eventos de quien no tiene cuenta.">
              <input value={ajustes.organizador ?? ''} onChange={(e) => setAjustes({ ...ajustes, organizador: e.target.value })} required maxLength={90} />
            </Campo>
          )}
          <div className="g-dos">
            <Campo etiqueta="Ilustración">
              <select value={ajustes.escena} onChange={(e) => setAjustes({ ...ajustes, escena: e.target.value as TipoEscena })}>
                {ESCENAS.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </Campo>
            <label className="g-casilla g-casilla-alineada">
              <input type="checkbox" checked={ajustes.enlazaYincana} onChange={(e) => setAjustes({ ...ajustes, enlazaYincana: e.target.checked })} />
              <span>Enlazar con la yincana</span>
            </label>
          </div>
        </fieldset>
      )}

      {modo !== 'direccion' && (
        <label className="g-casilla g-declaracion">
          <input type="checkbox" checked={declaracion} onChange={(e) => setDeclaracion(e.target.checked)} />
          <span>Declaro que lo organiza nuestra entidad (o colabora en él), que no es propaganda política ni sindical y que no es publicidad de una empresa o comercio.</span>
        </label>
      )}

      {modo === 'entidad-publicado' && (
        <p className="g-aviso">El evento sigue publicado como está ahora. Los cambios se verán cuando los revisemos.</p>
      )}

      <Fallo>{error}</Fallo>
      <div className="g-fila g-fila-final">
        {(modo === 'entidad-nuevo' || modo === 'entidad-borrador') && (
          <button type="button" className="g-boton g-boton-suave" disabled={ocupado} onClick={() => guardar(false)()}>Guardar borrador</button>
        )}
        <button className="g-boton g-boton-primario" disabled={ocupado}>{ocupado ? 'Guardando…' : textoEnviar}</button>
      </div>
    </form>
  )
}
