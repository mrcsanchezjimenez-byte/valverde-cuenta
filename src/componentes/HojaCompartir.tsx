import qrcode from 'qrcode-generator'
import { useEffect, useMemo, useState } from 'react'
import { compartir, enlaceA } from '../nativo'
import { Icono } from './Iconos'

interface EventoInstalacion extends Event {
  prompt: () => Promise<void>
}

/** Enseña un QR de la app para abrirla en otro móvil, y ofrece instalarla si se puede. */
export function HojaCompartir({ alCerrar }: { alCerrar: () => void }) {
  const url = enlaceA('/')
  const [instalador, setInstalador] = useState<EventoInstalacion | null>(null)
  const modulos = useMemo(() => {
    const qr = qrcode(0, 'M')
    qr.addData(url)
    qr.make()
    const n = qr.getModuleCount()
    let d = ''
    for (let f = 0; f < n; f++) for (let c = 0; c < n; c++) if (qr.isDark(f, c)) d += `M${c} ${f}h1v1h-1z`
    return { n, d }
  }, [url])

  useEffect(() => {
    const alOfrecer = (e: Event) => {
      e.preventDefault()
      setInstalador(e as EventoInstalacion)
    }
    window.addEventListener('beforeinstallprompt', alOfrecer)
    return () => window.removeEventListener('beforeinstallprompt', alOfrecer)
  }, [])

  return (
    <div className="velo" onClick={alCerrar}>
      <section className="hoja hoja-centrada" role="dialog" aria-label="Compartir la app" onClick={(e) => e.stopPropagation()}>
        <button className="hoja-cerrar" onClick={alCerrar} aria-label="Cerrar"><Icono n="cerrar" tam={18} /></button>
        <h3 className="titulo-hoja">Abre la app en tu móvil</h3>
        <p className="suave">Escanea este código con la cámara. No hace falta registrarse ni descargar nada.</p>
        <svg className="qr" viewBox={`-2 -2 ${modulos.n + 4} ${modulos.n + 4}`} role="img" aria-label="Código QR de la app">
          <rect x="-2" y="-2" width={modulos.n + 4} height={modulos.n + 4} fill="#fff" />
          <path d={modulos.d} fill="#2A1F1A" />
        </svg>
        <button className="boton boton-primario boton-ancho" onClick={() => compartir('Valverde Cuenta', 'Qué hacer en Valverde del Camino', '/')}>
          <Icono n="compartir" tam={18} /> Compartir enlace
        </button>
        {instalador && (
          <button className="boton boton-suave boton-ancho" onClick={() => instalador.prompt()}>Añadir a la pantalla de inicio</button>
        )}
        <p className="suave nota-instalar">En iPhone: abre en Safari, pulsa Compartir y luego «Añadir a pantalla de inicio».</p>
      </section>
    </div>
  )
}
