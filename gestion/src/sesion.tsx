import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { EstadoComercio, EstadoEntidad, Rol } from '../../compartido/tipos.ts'
import { api } from './api.ts'

export interface Usuario {
  id: number
  email: string
  nombre: string
  rol: Rol
  totpActivo: boolean
  entidadId: number | null
  entidadNombre: string | null
  entidadEstado: EstadoEntidad | null
  comercioId: number | null
  comercioNombre: string | null
  comercioEstado: EstadoComercio | null
}

export type Falta = 'codigo' | 'alta2fa' | null

interface Sesion {
  cargando: boolean
  usuario: Usuario | null
  falta: Falta
  recargar: () => Promise<void>
  salir: () => Promise<void>
}

const Contexto = createContext<Sesion | null>(null)

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [cargando, setCargando] = useState(true)
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [falta, setFalta] = useState<Falta>(null)

  const recargar = useCallback(async () => {
    try {
      const r = await api<{ usuario: Usuario; falta: Falta }>('GET', '/cuenta/yo')
      setUsuario(r.usuario)
      setFalta(r.falta)
    } catch {
      setUsuario(null)
      setFalta(null)
    } finally {
      setCargando(false)
    }
  }, [])

  const salir = useCallback(async () => {
    try {
      await api('POST', '/cuenta/salir')
    } finally {
      setUsuario(null)
      setFalta(null)
      location.hash = '#/'
    }
  }, [])

  useEffect(() => {
    void recargar()
    // Si el servidor dice que la sesión ya no vale (caducada, cerrada desde otro sitio), se vuelve a la entrada.
    const perdida = () => {
      setUsuario(null)
      setFalta(null)
    }
    window.addEventListener('vc-sesion-perdida', perdida)
    return () => window.removeEventListener('vc-sesion-perdida', perdida)
  }, [recargar])

  return <Contexto.Provider value={{ cargando, usuario, falta, recargar, salir }}>{children}</Contexto.Provider>
}

export function useSesion() {
  const s = useContext(Contexto)
  if (!s) throw new Error('useSesion fuera del proveedor')
  return s
}
