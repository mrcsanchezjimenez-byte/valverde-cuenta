import { Escena } from '../componentes/Escena'
import { Icono } from '../componentes/Iconos'

export function Historias() {
  return (
    <div className="pantalla">
      <header>
        <p className="antetitulo">La memoria del pueblo</p>
        <h1>Historias de Valverde</h1>
      </header>
      <p className="entradilla">Estamos preparando esta sección. Aquí podrás escuchar a los vecinos y ver cómo era el pueblo.</p>

      <article className="tarjeta-proximamente">
        <Escena tipo="calle" />
        <div>
          <span className="etiqueta etiqueta-mostaza">Próximamente</span>
          <h2><Icono n="historias" tam={20} /> Radio 27</h2>
          <p className="suave">Testimonios de vecinos sobre calles, oficios y tradiciones, con su transcripción.</p>
        </div>
      </article>

      <article className="tarjeta-proximamente">
        <Escena tipo="fiesta" />
        <div>
          <span className="etiqueta etiqueta-mostaza">Próximamente</span>
          <h2><Icono n="agenda" tam={20} /> Fotos de antes</h2>
          <p className="suave">Fotografías antiguas cedidas por las familias, para buscar por época, fiesta o lugar.</p>
        </div>
      </article>
    </div>
  )
}
