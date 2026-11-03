import { HashRouter, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { Avisos } from './componentes/Avisos'
import { Icono, type NombreIcono } from './componentes/Iconos'
import { Agenda } from './pantallas/Agenda'
import { FichaEvento } from './pantallas/FichaEvento'
import { FinYincana } from './pantallas/FinYincana'
import { Historias } from './pantallas/Historias'
import { Inicio } from './pantallas/Inicio'
import { Mapa } from './pantallas/Mapa'
import { ParadaYincana } from './pantallas/ParadaYincana'
import { Yincana } from './pantallas/Yincana'

// HashRouter: las rutas funcionan igual en GitHub Pages, desde un QR y dentro de Capacitor.
const PESTANAS: { a: string; texto: string; icono: NombreIcono }[] = [
  { a: '/', texto: 'Inicio', icono: 'inicio' },
  { a: '/agenda', texto: 'Agenda', icono: 'agenda' },
  { a: '/yincana', texto: 'Yincana', icono: 'yincana' },
  { a: '/mapa', texto: 'Mapa', icono: 'mapa' },
  { a: '/historias', texto: 'Historias', icono: 'historias' },
]

function Contenido() {
  const { pathname } = useLocation()
  return (
    <main className="contenido" key={pathname}>
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/agenda" element={<Agenda />} />
        <Route path="/evento/:id" element={<FichaEvento />} />
        <Route path="/mapa" element={<Mapa />} />
        <Route path="/historias" element={<Historias />} />
        <Route path="/yincana" element={<Yincana />} />
        <Route path="/yincana/fin" element={<FinYincana />} />
        <Route path="/yincana/:numero" element={<ParadaYincana />} />
        <Route path="*" element={<Inicio />} />
      </Routes>
    </main>
  )
}

export default function App() {
  return (
    <HashRouter>
      <div className="app">
        <Contenido />
        <Avisos />
        <nav className="barra" aria-label="Secciones">
          {PESTANAS.map((p) => (
            <NavLink key={p.a} to={p.a} end={p.a === '/'} className={p.a === '/yincana' ? 'pestana pestana-yincana' : 'pestana'}>
              <span className="pestana-icono"><Icono n={p.icono} /></span>
              {p.texto}
            </NavLink>
          ))}
        </nav>
      </div>
    </HashRouter>
  )
}
