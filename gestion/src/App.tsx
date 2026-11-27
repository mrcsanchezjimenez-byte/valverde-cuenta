import { useEffect } from 'react'
import { HashRouter, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useCarga } from './componentes/piezas.tsx'
import { ActivarDobleFactor, AltaEntidad, Codigo, Entrar, Olvide, Restablecer, Verificar } from './pantallas/Acceso.tsx'
import { MiCuenta } from './pantallas/Cuenta.tsx'
import {
  Actividad, Entidades, Eventos, FichaEntidad, Municipios, NuevoEventoDireccion, Pendientes, RevisarEvento,
} from './pantallas/Direccion.tsx'
import { EventoEntidad, MisEventos } from './pantallas/Entidad.tsx'
import { ProveedorSesion, useSesion } from './sesion.tsx'

/** Rutas a las que se llega desde un correo: valen con o sin sesión. */
const RUTAS_CORREO = (
  <>
    <Route path="/verificar" element={<Verificar />} />
    <Route path="/restablecer" element={<Restablecer />} />
  </>
)

function Menu({ enlaces }: { enlaces: [string, string, number?][] }) {
  const { usuario } = useSesion()
  return (
    <nav className="g-menu" aria-label="Secciones">
      <span className="g-marca-menu">Valverde <em>Cuenta</em></span>
      {enlaces.map(([a, texto, n]) => (
        <NavLink key={a} to={a} end={a === '/'}>{texto}{n ? <span className="g-globo">{n}</span> : null}</NavLink>
      ))}
      <NavLink to="/cuenta" className="g-menu-cuenta">{usuario?.nombre}</NavLink>
    </nav>
  )
}

function PanelDireccion() {
  const resumen = useCarga<{ pendientes: number }>('/direccion/resumen')
  const { pathname } = useLocation()
  const { recargar } = resumen
  // El globo de pendientes se actualiza al cambiar de pantalla.
  useEffect(() => {
    void recargar()
  }, [pathname, recargar])
  return (
    <div className="g-armazon">
      <Menu enlaces={[['/pendientes', 'Pendientes', resumen.datos?.pendientes], ['/eventos', 'Eventos'], ['/entidades', 'Entidades'], ['/zona', 'Zona'], ['/actividad', 'Actividad']]} />
      <main className="g-principal">
        <Routes>
          <Route path="/pendientes" element={<Pendientes />} />
          <Route path="/revisar/:id" element={<RevisarEvento />} />
          <Route path="/eventos" element={<Eventos />} />
          <Route path="/nuevo" element={<NuevoEventoDireccion />} />
          <Route path="/entidades" element={<Entidades />} />
          <Route path="/entidades/:id" element={<FichaEntidad />} />
          <Route path="/zona" element={<Municipios />} />
          <Route path="/actividad" element={<Actividad />} />
          <Route path="/cuenta" element={<MiCuenta />} />
          {RUTAS_CORREO}
          <Route path="*" element={<Navigate to="/pendientes" replace />} />
        </Routes>
      </main>
    </div>
  )
}

function PanelEntidad() {
  return (
    <div className="g-armazon">
      <Menu enlaces={[['/', 'Nuestros eventos']]} />
      <main className="g-principal">
        <Routes>
          <Route path="/" element={<MisEventos />} />
          <Route path="/eventos/:id" element={<EventoEntidad />} />
          <Route path="/cuenta" element={<MiCuenta />} />
          {RUTAS_CORREO}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

function Puerta() {
  const { cargando, usuario, falta, recargar } = useSesion()
  if (cargando) return <p className="g-suave g-centro">Cargando…</p>

  if (!usuario) {
    return (
      <Routes>
        <Route path="/alta" element={<AltaEntidad />} />
        <Route path="/olvide" element={<Olvide />} />
        {RUTAS_CORREO}
        <Route path="*" element={<Entrar />} />
      </Routes>
    )
  }
  if (falta === 'codigo') return <Codigo />
  if (falta === 'alta2fa') return <ActivarDobleFactor obligatorio alTerminar={() => void recargar()} />
  return usuario.rol === 'direccion' ? <PanelDireccion /> : <PanelEntidad />
}

export default function App() {
  return (
    <HashRouter>
      <ProveedorSesion>
        <Puerta />
      </ProveedorSesion>
    </HashRouter>
  )
}
