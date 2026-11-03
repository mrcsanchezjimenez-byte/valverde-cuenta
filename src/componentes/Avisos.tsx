import { useEffect, useState } from 'react'

/** Mensaje breve sobre la barra inferior. Se lanza con avisar() desde el puente nativo. */
export function Avisos() {
  const [texto, setTexto] = useState('')
  useEffect(() => {
    let temporizador = 0
    const alRecibir = (e: Event) => {
      setTexto((e as CustomEvent<string>).detail)
      clearTimeout(temporizador)
      temporizador = window.setTimeout(() => setTexto(''), 3500)
    }
    window.addEventListener('vc-aviso', alRecibir)
    return () => {
      window.removeEventListener('vc-aviso', alRecibir)
      clearTimeout(temporizador)
    }
  }, [])
  return texto ? <div className="aviso" role="status">{texto}</div> : null
}

export function AvisoEjemplo({ children }: { children: string }) {
  return <p className="aviso-ejemplo"><strong>Versión de prueba.</strong> {children}</p>
}
