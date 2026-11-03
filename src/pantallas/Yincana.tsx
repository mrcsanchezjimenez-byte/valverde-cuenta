import { Link } from 'react-router-dom'
import { AvisoEjemplo } from '../componentes/Avisos'
import { Icono } from '../componentes/Iconos'
import { MapaBase, marcaParada, type Marca } from '../componentes/MapaBase'
import { PARADAS, RUTA_METROS, RUTA_MINUTOS } from '../datos/yincana'
import { useCompletadas } from '../estado/almacen'
import { textoDistancia } from '../nativo'

export function Yincana() {
  const completadas = useCompletadas()
  const siguiente = PARADAS.find((p) => !completadas.includes(p.numero))
  const empezada = completadas.length > 0

  const marcas: Marca[] = PARADAS.map((p) => ({
    id: String(p.numero), lat: p.lat, lng: p.lng, ancho: 34, alto: 34,
    etiqueta: `Parada ${p.numero}: ${p.nombre}`,
    html: marcaParada(p.numero, completadas.includes(p.numero) ? 'hecha' : p.numero === siguiente?.numero ? 'siguiente' : 'pendiente'),
  }))

  return (
    <div className="pantalla pantalla-yincana">
      <header>
        <p className="antetitulo">Yincana cultural</p>
        <h1>Recorre el casco urbano</h1>
      </header>

      <div className="mapa-yincana">
        <MapaBase marcas={marcas} conRuta ajustar={PARADAS.map((p) => [p.lat, p.lng])} />
      </div>

      <ul className="datos-ruta">
        <li><b>{PARADAS.length}</b> paradas</li>
        <li><b>{textoDistancia(RUTA_METROS)}</b> a pie</li>
        <li><b>{RUTA_MINUTOS} min</b> aprox.</li>
        <li><b>Gratis</b> sin registro</li>
      </ul>

      <Link className="boton boton-primario boton-ancho boton-grande" to={siguiente ? `/yincana/${siguiente.numero}` : '/yincana/fin'}>
        {!siguiente ? 'Ver recorrido completado' : empezada ? `Continuar por la parada ${siguiente.numero}` : 'Empezar la yincana'}
        <Icono n="adelante" tam={18} />
      </Link>

      <p className="entradilla">En cada parada lees un relato de un vecino y respondes una pregunta. Si aciertas, te damos la pista para llegar a la siguiente.</p>

      <AvisoEjemplo>Paradas propuestas, relatos y voces de ejemplo.</AvisoEjemplo>

      <ol className="lista-paradas">
        {PARADAS.map((p) => {
          const hecha = completadas.includes(p.numero)
          return (
            <li key={p.numero}>
              <Link to={`/yincana/${p.numero}`} className="fila-parada">
                <span className={hecha ? 'numero-parada hecha' : p.numero === siguiente?.numero ? 'numero-parada siguiente' : 'numero-parada'}>
                  {hecha ? <Icono n="check" tam={16} /> : p.numero}
                </span>
                <span>
                  <b>{p.nombre}</b>
                  <small>{p.direccion}{p.metrosDesdeAnterior > 0 ? ` · ${textoDistancia(p.metrosDesdeAnterior)} desde la anterior` : ' · Salida'}</small>
                </span>
                <Icono n="adelante" tam={18} />
              </Link>
            </li>
          )
        })}
      </ol>

      <p className="nota-seguridad">Camina con cuidado: guarda el móvil al cruzar y respeta el tráfico. Puedes parar y seguir otro día; tu progreso se guarda en este móvil.</p>
    </div>
  )
}
