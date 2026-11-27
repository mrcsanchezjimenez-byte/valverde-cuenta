import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { FotoEvento } from '../../../compartido/tipos.ts'
import { MAX_FOTOS_EVENTO } from '../../../compartido/tipos.ts'
import { prepararFoto } from '../../../navegador/medios.ts'
import { api, subirImagen } from '../api.ts'
import { avisar } from './Avisos.tsx'
import { Icono } from './Iconos.tsx'
import { Fallo, fechaCorta, useAccion, useCarga } from './piezas.tsx'

const TEXTO = { pendiente: 'En revisión', publicada: 'Publicada', rechazada: 'No publicada' }
const CLASE = { pendiente: 'pendiente', publicada: 'publicado', rechazada: 'retirado' }

/** La entidad sube fotos de cómo fue su evento; cada una espera a que dirección la apruebe. */
export function FotosEntidad({ eventoId }: { eventoId: number }) {
  const { datos, error, recargar } = useCarga<FotoEvento[]>(`/entidad/eventos/${eventoId}/fotos`)
  const [progreso, setProgreso] = useState<string | null>(null)
  const accion = useAccion()
  const archivo = useRef<HTMLInputElement>(null)
  const activas = datos?.filter((f) => f.estado !== 'rechazada').length ?? 0

  const subir = (lista: FileList | null) => {
    if (!lista?.length) return
    const archivos = [...lista].slice(0, MAX_FOTOS_EVENTO - activas)
    void accion.hacer(async () => {
      for (const [i, f] of archivos.entries()) {
        setProgreso(`Subiendo ${i + 1} de ${archivos.length}…`)
        const img = await subirImagen(await prepararFoto(f))
        await api('POST', `/entidad/eventos/${eventoId}/fotos`, { imagen: img.clave, pie: '' })
      }
      setProgreso(null)
      avisar(archivos.length === 1 ? 'Foto enviada. La revisaremos pronto.' : `${archivos.length} fotos enviadas. Las revisaremos pronto.`)
      await recargar()
    }).finally(() => setProgreso(null))
  }

  return (
    <section className="g-bloque">
      <h2 className="g-bloque-titulo"><Icono n="imagen" /> Fotos de cómo fue</h2>
      <p className="g-suave">Subid fotos del evento: salen en su ficha de la app cuando las revisemos. Que no se reconozca a niños sin permiso de sus familias.</p>
      <Fallo>{error || accion.error}</Fallo>
      {!!datos?.length && (
        <div className="g-galeria">
          {datos.map((f) => (
            <figure key={f.id} className={f.estado === 'rechazada' ? 'apagado' : ''}>
              <img src={f.url} alt={f.pie || 'Foto del evento'} loading="lazy" />
              <figcaption>
                <span className={`g-estado g-estado-${CLASE[f.estado]}`}>{TEXTO[f.estado]}</span>
                {f.estado !== 'publicada' && (
                  <button className="g-boton-icono" aria-label="Borrar foto" title="Borrar" onClick={() => void accion.hacer(async () => {
                    await api('DELETE', `/entidad/fotos/${f.id}`)
                    await recargar()
                  })}><Icono n="cerrar" tam={16} /></button>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
      <input ref={archivo} type="file" accept="image/jpeg,image/png" multiple hidden onChange={(e) => {
        subir(e.target.files)
        e.target.value = ''
      }} />
      <div className="g-fila-botones g-fila-izquierda">
        <button className="g-boton g-boton-suave" disabled={accion.ocupado || activas >= MAX_FOTOS_EVENTO} onClick={() => archivo.current?.click()}>
          <Icono n="mas" /> {progreso ?? 'Añadir fotos'}
        </button>
        <span className="g-suave">{activas} de {MAX_FOTOS_EVENTO}</span>
      </div>
    </section>
  )
}

interface GrupoFotos {
  eventoId: number
  titulo: string
  entidadNombre: string
  inicio: string
  fotos: FotoEvento[]
}

/** En «Pendientes»: dirección decide foto a foto y guarda de una vez. */
export function RevisarFotos({ grupo, alTerminar }: { grupo: GrupoFotos; alTerminar: () => void }) {
  const [decision, setDecision] = useState<Record<number, 'si' | 'no'>>({})
  const accion = useAccion()
  const decidir = (id: number, d: 'si' | 'no') => setDecision((x) => ({ ...x, [id]: x[id] === d ? undefined! : d }))
  const guardar = (todas: boolean) => accion.hacer(async () => {
    const aprobar = grupo.fotos.filter((f) => (todas ? decision[f.id] !== 'no' : decision[f.id] === 'si')).map((f) => f.id)
    const rechazar = grupo.fotos.filter((f) => decision[f.id] === 'no').map((f) => f.id)
    const r = await api<{ avisado?: string }>('POST', '/direccion/fotos/revisar', { aprobar, rechazar })
    avisar(`Fotos revisadas.${r.avisado ? ` Hemos avisado a ${r.avisado}.` : ''}`)
    alTerminar()
  })
  const decididas = Object.values(decision).filter(Boolean).length

  return (
    <div className="g-caja">
      <div className="g-cabecera">
        <div>
          <b>{grupo.titulo}</b>
          <p className="g-suave">{grupo.entidadNombre} · {fechaCorta(grupo.inicio)} · {grupo.fotos.length === 1 ? '1 foto' : `${grupo.fotos.length} fotos`}</p>
        </div>
        <Link to={`/revisar/${grupo.eventoId}`} className="g-enlace">Ver el evento</Link>
      </div>
      <div className="g-galeria">
        {grupo.fotos.map((f) => (
          <figure key={f.id} className={decision[f.id] === 'no' ? 'descartada' : decision[f.id] === 'si' ? 'elegida' : ''}>
            <a href={f.url} target="_blank" rel="noopener noreferrer"><img src={f.url} alt="" loading="lazy" /></a>
            <figcaption className="g-decision">
              <button className={decision[f.id] === 'si' ? 'activo si' : 'si'} onClick={() => decidir(f.id, 'si')} aria-label="Publicar esta foto"><Icono n="check" tam={18} /></button>
              <button className={decision[f.id] === 'no' ? 'activo no' : 'no'} onClick={() => decidir(f.id, 'no')} aria-label="No publicar esta foto"><Icono n="cerrar" tam={18} /></button>
            </figcaption>
          </figure>
        ))}
      </div>
      <Fallo>{accion.error}</Fallo>
      <div className="g-fila-botones">
        {decididas > 0 && <button className="g-boton g-boton-suave" disabled={accion.ocupado} onClick={() => void guardar(false)}>Guardar lo marcado</button>}
        <button className="g-boton g-boton-primario" disabled={accion.ocupado} onClick={() => void guardar(true)}>
          <Icono n="check" /> {decididas ? 'Publicar el resto y guardar' : 'Publicar todas'}
        </button>
      </div>
    </div>
  )
}

/** En la ficha de un evento (dirección): fotos ya publicadas, con opción de quitarlas. */
export function GaleriaDireccion({ eventoId }: { eventoId: number }) {
  const { datos, recargar } = useCarga<FotoEvento[]>(`/direccion/eventos/${eventoId}/fotos`)
  const accion = useAccion()
  const publicadas = datos?.filter((f) => f.estado === 'publicada') ?? []
  if (!publicadas.length) return null
  return (
    <section className="g-bloque">
      <h2 className="g-bloque-titulo"><Icono n="imagen" /> Fotos publicadas</h2>
      <div className="g-galeria">
        {publicadas.map((f) => (
          <figure key={f.id}>
            <img src={f.url} alt="" loading="lazy" />
            <figcaption>
              <button className="g-boton-icono" aria-label="Quitar foto" title="Quitar de la app" disabled={accion.ocupado} onClick={() => {
                if (confirm('¿Quitar esta foto de la app?')) void accion.hacer(async () => {
                  await api('POST', `/direccion/fotos/${f.id}/retirar`)
                  await recargar()
                })
              }}><Icono n="cerrar" tam={16} /></button>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}
