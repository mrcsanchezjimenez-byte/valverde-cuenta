import { useEffect, type ReactNode } from 'react'
import { HashRouter, Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import type { AvisoEntidad } from '../../compartido/tipos.ts'
import { Avisos } from './componentes/Avisos.tsx'
import { FranjaDemo } from './componentes/Demo.tsx'
import { Icono, type NombreIcono } from './componentes/Iconos.tsx'
import { useCarga } from './componentes/piezas.tsx'
import { ActivarDobleFactor, AltaEntidad, Codigo, Entrar, Olvide, Restablecer, Verificar } from './pantallas/Acceso.tsx'
import { MiCuenta } from './pantallas/Cuenta.tsx'
import {
  Actividad, Entidades, Eventos, FichaEntidad, Municipios, NuevoEventoDireccion, Pendientes, RevisarEvento,
} from './pantallas/Direccion.tsx'
import { AvisosEntidad, EventoEntidad, MisEventos } from './pantallas/Entidad.tsx'
import { EditarLugar, ListaHistorias, Lugares, NuevaHistoria, Placa, RevisarHistoria } from './pantallas/Historias.tsx'
import { ProveedorSesion, useSesion } from './sesion.tsx'

/** Rutas a las que se llega desde un correo: valen con o sin sesión. */
const RUTAS_CORREO = (
  <>
    <Route path="/verificar" element={<Verificar />} />
    <Route path="/restablecer" element={<Restablecer />} />
  </>
)

interface Enlace {
  a: string
  texto: string
  icono: NombreIcono
  globo?: number
  /** En el móvil no cabe en la barra: va dentro de «Más». */
  secundario?: boolean
}

const iniciales = (nombre: string) => nombre.split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase()

/**
 * Cabecera fija con la marca, las secciones y la cuenta. En el móvil las secciones bajan
 * a una barra inferior, como en la app.
 */
function Armazon({ enlaces, children }: { enlaces: Enlace[]; children: ReactNode }) {
  const { usuario } = useSesion()
  const enlace = (e: Enlace) => (
    <NavLink key={e.a} to={e.a} end={e.a === '/'}>
      <span className="g-nav-icono"><Icono n={e.icono} />{e.globo ? <span className="g-globo">{e.globo}</span> : null}</span>
      <span>{e.texto}</span>
    </NavLink>
  )
  const secciones = enlaces.map(enlace)
  const hayMas = enlaces.some((e) => e.secundario)
  const abajo = hayMas
    ? [...enlaces.filter((e) => !e.secundario).map(enlace), enlace({ a: '/mas', texto: 'Más', icono: 'mas2' })]
    : secciones
  return (
    <div className="g-armazon">
      <header className="g-cabecera-app">
        <div className="g-cabecera-dentro">
          <Link to="/" className="g-marca-menu">Valverde <em>Cuenta</em></Link>
          <nav className="g-nav g-nav-arriba" aria-label="Secciones">{secciones}</nav>
          <NavLink to="/cuenta" className="g-yo" aria-label="Mi cuenta">
            <span className="g-yo-nombre">{usuario?.entidadNombre ?? usuario?.nombre}</span>
            <span className="g-avatar g-avatar-peq">{iniciales(usuario?.nombre ?? '?')}</span>
          </NavLink>
        </div>
      </header>
      <main className="g-principal">{children}</main>
      <nav className="g-nav g-nav-abajo" aria-label="Secciones">{abajo}</nav>
    </div>
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
    <Armazon enlaces={[
      { a: '/pendientes', texto: 'Pendientes', icono: 'bandeja', globo: resumen.datos?.pendientes },
      { a: '/eventos', texto: 'Eventos', icono: 'calendario' },
      { a: '/historias', texto: 'Historias', icono: 'libro' },
      { a: '/entidades', texto: 'Entidades', icono: 'personas' },
      { a: '/zona', texto: 'Zona', icono: 'mapa', secundario: true },
      { a: '/actividad', texto: 'Actividad', icono: 'actividad', secundario: true },
    ]}>
      <Routes>
        <Route path="/pendientes" element={<Pendientes />} />
        <Route path="/revisar/:id" element={<RevisarEvento />} />
        <Route path="/eventos" element={<Eventos />} />
        <Route path="/nuevo" element={<NuevoEventoDireccion />} />
        <Route path="/entidades" element={<Entidades />} />
        <Route path="/entidades/:id" element={<FichaEntidad />} />
        <Route path="/zona" element={<Municipios />} />
        <Route path="/actividad" element={<Actividad />} />
        <Route path="/historias" element={<ListaHistorias />} />
        <Route path="/historias/nueva" element={<NuevaHistoria />} />
        <Route path="/historias/:id" element={<RevisarHistoria />} />
        <Route path="/lugares" element={<Lugares />} />
        <Route path="/lugares/:id" element={<EditarLugar />} />
        <Route path="/lugares/:id/placa" element={<Placa />} />
        <Route path="/mas" element={<Mas />} />
        <Route path="/cuenta" element={<MiCuenta />} />
        {RUTAS_CORREO}
        <Route path="*" element={<Navigate to="/pendientes" replace />} />
      </Routes>
    </Armazon>
  )
}

function PanelEntidad() {
  const avisos = useCarga<AvisoEntidad[]>('/entidad/avisos')
  const { pathname } = useLocation()
  const { recargar } = avisos
  useEffect(() => {
    void recargar()
  }, [pathname, recargar])
  const sinLeer = avisos.datos?.filter((a) => !a.leido).length
  return (
    <Armazon enlaces={[
      { a: '/', texto: 'Eventos', icono: 'calendario' },
      { a: '/avisos', texto: 'Avisos', icono: 'campana', globo: sinLeer },
      { a: '/eventos/nuevo', texto: 'Nuevo evento', icono: 'mas' },
    ]}>
      <Routes>
        <Route path="/" element={<MisEventos avisos={avisos.datos ?? []} />} />
        <Route path="/avisos" element={<AvisosEntidad />} />
        <Route path="/eventos/:id" element={<EventoEntidad />} />
        <Route path="/cuenta" element={<MiCuenta />} />
        {RUTAS_CORREO}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Armazon>
  )
}

const MAS = [
  ['/zona', 'Zona de la agenda', 'mapa', 'Qué pueblos entran'],
  ['/actividad', 'Actividad', 'actividad', 'Quién ha hecho qué y cuándo'],
  ['/lugares', 'Lugares y placas QR', 'qr', 'Placas para imprimir y escaneos'],
  ['/cuenta', 'Mi cuenta', 'personas', 'Contraseña y salir'],
] as const

/** En el móvil: lo que no cabe en la barra de abajo. */
function Mas() {
  return (
    <section className="g-pagina">
      <header className="g-cabecera"><div><p className="g-antetitulo">Dirección</p><h1>Más</h1></div></header>
      <div className="g-lista">
        {MAS.map(([a, t, i, s]) => (
          <Link key={a} to={a} className="g-fila">
            <span className="g-icono-redondo"><Icono n={i} /></span>
            <span className="g-fila-cuerpo"><b>{t}</b><small>{s}</small></span>
            <span className="g-fila-final"><Icono n="adelante" tam={18} /></span>
          </Link>
        ))}
      </div>
    </section>
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
        <FranjaDemo />
        <Puerta />
        <Avisos />
      </ProveedorSesion>
    </HashRouter>
  )
}
