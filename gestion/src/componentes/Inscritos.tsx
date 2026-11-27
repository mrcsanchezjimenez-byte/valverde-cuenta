import type { Inscripcion } from '../../../compartido/tipos.ts'
import { api } from '../api.ts'
import { avisar } from './Avisos.tsx'
import { Icono } from './Iconos.tsx'
import { Fallo, fechaIso, useAccion, useCarga } from './piezas.tsx'

interface Datos {
  lista: Inscripcion[]
  confirmadas: number
  enEspera: number
  plazas: number | null
}

const TEXTO_ESTADO = { confirmada: 'Con plaza', espera: 'En espera', cancelada: 'Cancelada' }

/** Hoja de cálculo (CSV que abre Excel) con la lista de inscritos. */
function descargar(titulo: string, lista: Inscripcion[]) {
  const celda = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
  const filas = [['Nombre', 'Teléfono', 'Correo', 'Personas', 'Estado', 'Apuntado'],
    ...lista.map((i) => [i.nombre, i.telefono, i.email, i.personas, TEXTO_ESTADO[i.estado], fechaIso(i.creado)])]
  const csv = '﻿' + filas.map((f) => f.map(celda).join(';')).join('\r\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  a.download = `inscritos-${titulo.toLowerCase().normalize('NFD').replace(/[^\w]+/g, '-').slice(0, 40)}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

/** Lista de personas apuntadas a un evento. La entidad puede cancelar; dirección solo la ve. */
export function Inscritos({ ruta, titulo, soloLectura = false }: { ruta: string; titulo: string; soloLectura?: boolean }) {
  const { datos, error, recargar } = useCarga<Datos>(ruta)
  const accion = useAccion()
  if (!datos) return <Fallo>{error}</Fallo>
  const activas = datos.lista.filter((i) => i.estado !== 'cancelada')
  const correos = activas.map((i) => i.email).filter(Boolean)

  return (
    <section className="g-bloque">
      <h2 className="g-bloque-titulo"><Icono n="personas" /> Personas apuntadas</h2>
      <div className="g-resumen-inscritos">
        <div><b>{datos.confirmadas}{datos.plazas !== null && <small> / {datos.plazas}</small>}</b><span>con plaza</span></div>
        <div><b>{datos.enEspera}</b><span>en lista de espera</span></div>
        <div><b>{datos.plazas === null ? '∞' : Math.max(0, datos.plazas - datos.confirmadas)}</b><span>plazas libres</span></div>
      </div>
      {!!activas.length && (
        <div className="g-fila-botones g-fila-izquierda">
          <button className="g-boton g-boton-suave" onClick={() => descargar(titulo, datos.lista)}><Icono n="bandeja" /> Descargar lista (Excel)</button>
          {!!correos.length && !soloLectura && (
            <a className="g-boton g-boton-suave" href={`mailto:?bcc=${encodeURIComponent(correos.join(','))}&subject=${encodeURIComponent(titulo)}`}>
              <Icono n="campana" /> Escribir a todos
            </a>
          )}
        </div>
      )}
      <Fallo>{accion.error}</Fallo>
      {!datos.lista.length && <p className="g-suave">Todavía no se ha apuntado nadie.</p>}
      <div className="g-lista">
        {datos.lista.map((i) => (
          <div key={i.id} className={i.estado === 'cancelada' ? 'g-fila apagado' : 'g-fila'}>
            <span className="g-avatar">{i.personas}</span>
            <span className="g-fila-cuerpo">
              <b>{i.nombre}</b>
              <small>
                {i.telefono && <a href={`tel:${i.telefono}`}>{i.telefono}</a>}
                {i.telefono && i.email && ' · '}
                {i.email && <a href={`mailto:${i.email}`}>{i.email}</a>}
                {' · '}{i.personas === 1 ? '1 persona' : `${i.personas} personas`}
              </small>
            </span>
            <span className="g-fila-final">
              <span className={`g-estado g-estado-${i.estado === 'confirmada' ? 'publicado' : i.estado === 'espera' ? 'pendiente' : 'retirado'}`}>{TEXTO_ESTADO[i.estado]}</span>
              {!soloLectura && i.estado !== 'cancelada' && (
                <button className="g-boton-icono" title="Cancelar esta inscripción" aria-label={`Cancelar la inscripción de ${i.nombre}`} disabled={accion.ocupado}
                  onClick={() => {
                    if (!confirm(`¿Cancelar la inscripción de ${i.nombre}? Si hay lista de espera, entrará la siguiente persona.`)) return
                    void accion.hacer(async () => {
                      await api('POST', `/entidad/inscripciones/${i.id}/cancelar`)
                      avisar('Inscripción cancelada.', 'info')
                      await recargar()
                    })
                  }}>
                  <Icono n="cerrar" tam={18} />
                </button>
              )}
            </span>
          </div>
        ))}
      </div>
      <p className="g-suave">Los datos de las personas apuntadas se borran solos un mes después del evento. Usadlos solo para gestionar esta actividad.</p>
    </section>
  )
}
