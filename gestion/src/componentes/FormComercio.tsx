import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import type { DatosComercio, Municipio } from '../../../compartido/tipos.ts'
import { CATEGORIAS_COMERCIO, PLANES } from '../../../compartido/tipos.ts'
import { prepararFoto } from '../../../navegador/medios.ts'
import { subirImagen } from '../api.ts'
import { Icono } from './Iconos.tsx'
import { Fallo, useAccion } from './piezas.tsx'
import { SelectorMapa } from './SelectorMapa.tsx'

export const comercioVacio = (m?: Municipio): DatosComercio => ({
  nombre: '', categoria: 'alimentacion', descripcion: '', direccion: '', municipioId: m?.id ?? 0, lat: m?.lat ?? 37.5745, lng: m?.lng ?? -6.753,
  telefono: '', whatsapp: '', emailPublico: '', web: '', instagram: '', facebook: '', horario: '', logo: null, fotos: [],
})

function Campo({ etiqueta, ayuda, ancho, children }: { etiqueta: string; ayuda?: string; ancho?: boolean; children: ReactNode }) {
  return (
    <label className={ancho ? 'g-campo g-campo-ancho' : 'g-campo'}>
      <span className="g-etiqueta">{etiqueta}</span>
      {children}
      {ayuda && <small className="g-ayuda">{ayuda}</small>}
    </label>
  )
}

/**
 * Ficha de un comercio. La parte de «Escaparate» (descripción, logo, fotos, redes) solo se puede
 * rellenar con ese plan; sin él se enseña bloqueada, explicando qué se gana.
 */
export function FormComercio({ inicial, inicialUrls, municipios, escaparate, alGuardar, textoBoton, cabecera, pie }: {
  inicial: DatosComercio
  inicialUrls?: { logo: string | null; fotos: string[] }
  municipios: Municipio[]
  escaparate: boolean
  alGuardar: (d: DatosComercio) => Promise<unknown>
  textoBoton: string
  cabecera?: ReactNode
  pie?: ReactNode
}) {
  const [d, setD] = useState(inicial)
  const [urls, setUrls] = useState<Record<string, string>>(() => {
    const u: Record<string, string> = {}
    if (inicial.logo && inicialUrls?.logo) u[inicial.logo] = inicialUrls.logo
    inicial.fotos.forEach((f, i) => {
      if (inicialUrls?.fotos[i]) u[f] = inicialUrls.fotos[i]
    })
    return u
  })
  const accion = useAccion()
  const subida = useAccion()
  const logo = useRef<HTMLInputElement>(null)
  const fotos = useRef<HTMLInputElement>(null)
  const poner = (c: Partial<DatosComercio>) => setD((x) => ({ ...x, ...c }))

  const subir = async (f: File) => {
    const r = await subirImagen(await prepararFoto(f))
    setUrls((u) => ({ ...u, [r.clave]: r.url }))
    return r.clave
  }

  const guardar = (e: FormEvent) => {
    e.preventDefault()
    void accion.hacer(() => alGuardar(d))
  }

  return (
    <form className="g-editor-campos" onSubmit={guardar}>
      {cabecera}
      <section className="g-seccion">
        <header className="g-seccion-cabeza"><span className="g-paso">1</span><div><h2>Ficha básica</h2><p>Gratis para todos los comercios de la zona.</p></div></header>
        <div className="g-rejilla">
          <Campo etiqueta="Nombre del comercio" ancho><input value={d.nombre} required minLength={2} maxLength={90} onChange={(e) => poner({ nombre: e.target.value })} /></Campo>
          <Campo etiqueta="Categoría">
            <select value={d.categoria} onChange={(e) => poner({ categoria: e.target.value as DatosComercio['categoria'] })}>
              {CATEGORIAS_COMERCIO.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.nombre}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Teléfono"><input type="tel" value={d.telefono} onChange={(e) => poner({ telefono: e.target.value })} /></Campo>
          <Campo etiqueta="Dirección"><input value={d.direccion} required minLength={3} maxLength={120} onChange={(e) => poner({ direccion: e.target.value })} /></Campo>
          <Campo etiqueta="Municipio">
            <select value={d.municipioId} required onChange={(e) => {
              const m = municipios.find((x) => x.id === Number(e.target.value))
              poner({ municipioId: Number(e.target.value), ...(m ? { lat: m.lat, lng: m.lng } : {}) })
            }}>
              <option value={0} disabled>Elige…</option>
              {municipios.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Horario" ayuda="Como se diga en el pueblo: «L a S de 10 a 14 y de 17 a 20»." ancho>
            <textarea rows={2} maxLength={300} value={d.horario} onChange={(e) => poner({ horario: e.target.value })} />
          </Campo>
          <div className="g-campo-ancho"><p className="g-ayuda">Pulsa en el mapa la puerta del comercio.</p><SelectorMapa lat={d.lat} lng={d.lng} alElegir={(p) => poner(p)} /></div>
        </div>
      </section>

      <section className={escaparate ? 'g-seccion' : 'g-seccion g-bloqueada'}>
        <header className="g-seccion-cabeza">
          <span className="g-paso">2</span>
          <div><h2>Escaparate</h2><p>{escaparate ? 'Lo que hace atractiva la ficha: cuenta qué ofreces y enséñalo.' : `Disponible con el plan ${PLANES.escaparate.nombre} (${PLANES.escaparate.precio}).`}</p></div>
        </header>
        {!escaparate && (
          <p className="g-aviso">Con el plan Escaparate tu ficha lleva descripción, logo, hasta 6 fotos, WhatsApp, web y redes, y puedes publicar ofertas. Pregúntanos.</p>
        )}
        <fieldset disabled={!escaparate} className="g-rejilla g-sin-borde">
          <Campo etiqueta="Descripción" ancho><textarea rows={4} maxLength={1200} value={d.descripcion} onChange={(e) => poner({ descripcion: e.target.value })} placeholder="Qué vendes, desde cuándo, qué te hace especial…" /></Campo>
          <div className="g-campo g-campo-ancho">
            <span className="g-etiqueta">Logo y fotos</span>
            <div className="g-galeria">
              <figure className="g-logo">
                {d.logo && urls[d.logo] ? <img src={urls[d.logo]} alt="Logo" /> : <span>Logo</span>}
                <figcaption>
                  <button type="button" className="g-boton-icono" aria-label="Cambiar logo" onClick={() => logo.current?.click()}><Icono n="lapiz" tam={16} /></button>
                  {d.logo && <button type="button" className="g-boton-icono" aria-label="Quitar logo" onClick={() => poner({ logo: null })}><Icono n="cerrar" tam={16} /></button>}
                </figcaption>
              </figure>
              {d.fotos.map((f) => (
                <figure key={f}>
                  {urls[f] ? <img src={urls[f]} alt="" /> : <span />}
                  <figcaption><button type="button" className="g-boton-icono" aria-label="Quitar foto" onClick={() => poner({ fotos: d.fotos.filter((x) => x !== f) })}><Icono n="cerrar" tam={16} /></button></figcaption>
                </figure>
              ))}
            </div>
            <input ref={logo} type="file" accept="image/jpeg,image/png" hidden onChange={(e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (f) void subida.hacer(async () => poner({ logo: await subir(f) }))
            }} />
            <input ref={fotos} type="file" accept="image/jpeg,image/png" multiple hidden onChange={(e) => {
              const lista = [...(e.target.files ?? [])].slice(0, 6 - d.fotos.length)
              e.target.value = ''
              void subida.hacer(async () => {
                const nuevas: string[] = []
                for (const f of lista) nuevas.push(await subir(f))
                setD((x) => ({ ...x, fotos: [...x.fotos, ...nuevas] }))
              })
            }} />
            {d.fotos.length < 6 && <div className="g-fila-botones g-fila-izquierda"><button type="button" className="g-boton g-boton-suave" disabled={subida.ocupado} onClick={() => fotos.current?.click()}><Icono n="imagen" /> {subida.ocupado ? 'Subiendo…' : 'Añadir fotos'}</button></div>}
            <Fallo>{subida.error}</Fallo>
          </div>
          <Campo etiqueta="WhatsApp"><input type="tel" value={d.whatsapp} onChange={(e) => poner({ whatsapp: e.target.value })} /></Campo>
          <Campo etiqueta="Correo para clientes"><input type="email" value={d.emailPublico} onChange={(e) => poner({ emailPublico: e.target.value })} /></Campo>
          <Campo etiqueta="Web"><input type="url" value={d.web} placeholder="https://" onChange={(e) => poner({ web: e.target.value })} /></Campo>
          <Campo etiqueta="Instagram"><input type="url" value={d.instagram} placeholder="https://instagram.com/…" onChange={(e) => poner({ instagram: e.target.value })} /></Campo>
          <Campo etiqueta="Facebook"><input type="url" value={d.facebook} placeholder="https://facebook.com/…" onChange={(e) => poner({ facebook: e.target.value })} /></Campo>
        </fieldset>
      </section>
      {pie}
      <Fallo>{accion.error}</Fallo>
      <div className="g-barra-acciones"><div className="g-barra-botones">
        <button className="g-boton g-boton-primario" disabled={accion.ocupado || subida.ocupado}>{accion.ocupado ? 'Guardando…' : textoBoton}</button>
      </div></div>
    </form>
  )
}
