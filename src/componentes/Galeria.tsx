import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icono } from './Iconos'

interface Foto {
  url: string
  pie: string
}

/** Visor a pantalla completa: flechas, deslizar con el dedo y tecla Escape para cerrar. */
function Visor({ fotos, inicial, alCerrar }: { fotos: Foto[]; inicial: number; alCerrar: () => void }) {
  const [i, setI] = useState(inicial)
  const [toque, setToque] = useState<number | null>(null)
  const mover = (n: number) => setI((x) => (x + n + fotos.length) % fotos.length)

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') alCerrar()
      if (e.key === 'ArrowRight') mover(1)
      if (e.key === 'ArrowLeft') mover(-1)
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  })

  return createPortal(
    <div className="visor" role="dialog" aria-label="Fotos del evento"
      onTouchStart={(e) => setToque(e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (toque === null) return
        const d = e.changedTouches[0].clientX - toque
        if (Math.abs(d) > 50) mover(d < 0 ? 1 : -1)
        setToque(null)
      }}>
      <button className="visor-cerrar" onClick={alCerrar} aria-label="Cerrar"><Icono n="cerrar" tam={22} /></button>
      <img src={fotos[i].url} alt={fotos[i].pie || `Foto ${i + 1} de ${fotos.length}`} />
      <div className="visor-pie">
        {fotos.length > 1 && <button onClick={() => mover(-1)} aria-label="Foto anterior"><Icono n="atras" tam={22} /></button>}
        <span>{fotos[i].pie || `${i + 1} de ${fotos.length}`}</span>
        {fotos.length > 1 && <button onClick={() => mover(1)} aria-label="Foto siguiente"><Icono n="adelante" tam={22} /></button>}
      </div>
    </div>,
    document.querySelector('.app') ?? document.body,
  )
}

/** Fotos de cómo fue un evento, en cuadrícula. */
export function Galeria({ fotos, titulo = 'Cómo fue' }: { fotos: Foto[]; titulo?: string }) {
  const [abierta, setAbierta] = useState<number | null>(null)
  return (
    <section className="galeria">
      <h2 className="titulo-galeria"><Icono n="historias" tam={18} /> {titulo} <small>{fotos.length === 1 ? '1 foto' : `${fotos.length} fotos`}</small></h2>
      <div className="galeria-rejilla">
        {fotos.slice(0, 9).map((f, n) => (
          <button key={f.url} onClick={() => setAbierta(n)} aria-label={`Ver foto ${n + 1}`}>
            <img src={f.url} alt="" loading="lazy" />
            {n === 8 && fotos.length > 9 && <span className="galeria-mas">+{fotos.length - 9}</span>}
          </button>
        ))}
      </div>
      {abierta !== null && <Visor fotos={fotos} inicial={abierta} alCerrar={() => setAbierta(null)} />}
    </section>
  )
}
