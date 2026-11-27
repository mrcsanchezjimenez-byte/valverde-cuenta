import { useEffect, useState } from 'react'
import { Icono } from './Iconos.tsx'

/** Mensaje breve abajo de la pantalla, por ejemplo «Publicado. Hemos avisado a la Peña». */
export function avisar(texto: string, tipo: 'bien' | 'info' = 'bien') {
  window.dispatchEvent(new CustomEvent('vc-aviso', { detail: { texto, tipo } }))
}

export function Avisos() {
  const [aviso, setAviso] = useState<{ texto: string; tipo: 'bien' | 'info' } | null>(null)
  useEffect(() => {
    let t = 0
    const recibir = (e: Event) => {
      setAviso((e as CustomEvent<{ texto: string; tipo: 'bien' | 'info' }>).detail)
      clearTimeout(t)
      t = window.setTimeout(() => setAviso(null), 5000)
    }
    window.addEventListener('vc-aviso', recibir)
    return () => {
      window.removeEventListener('vc-aviso', recibir)
      clearTimeout(t)
    }
  }, [])
  if (!aviso) return null
  return (
    <div className={`g-toast g-toast-${aviso.tipo}`} role="status">
      <Icono n={aviso.tipo === 'bien' ? 'check' : 'campana'} />
      <span>{aviso.texto}</span>
      <button onClick={() => setAviso(null)} aria-label="Cerrar"><Icono n="cerrar" tam={16} /></button>
    </div>
  )
}
