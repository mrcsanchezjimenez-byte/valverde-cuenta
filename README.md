# Valverde Cuenta

El sitio donde están todos los eventos de Valverde del Camino y los pueblos de alrededor (unos 20 km).
Proyecto independiente que llevan Pilar y Marcos.

- **Agenda**: asociaciones, hermandades, AMPAs, clubes e instituciones envían sus eventos gratis; dirección los revisa antes de publicarlos.
- **Inscripciones** a los eventos que lo piden, con plazas y lista de espera.
- **Fotos de cómo fue** cada evento, aprobadas por dirección.
- **Historias del pueblo**: la gente las cuenta (escritas o grabadas) y se leen en placas con QR repartidas por el pueblo.
- **Yincana cultural** por el casco urbano.
- **Guía de comercios**: ficha básica gratis; los comercios y empresas que quieran más visibilidad pagan un plan, con publicidad discreta y siempre marcada ([política de cobros](docs/politica-cobros.md)).

### Demostración para enseñar

- App: https://mrcsanchezjimenez-byte.github.io/valverde-cuenta/
- Panel: https://mrcsanchezjimenez-byte.github.io/valverde-cuenta/gestion/ (botones para entrar como dirección, como asociación o como comercio).

Funciona sin servidor: los datos son ficticios y se guardan solo en el navegador de quien la prueba. En local: `npm run dev -- --mode demo` y `npx vite --config vite.gestion.config.ts --mode demo --port 5276`.

Plan por fases: [docs/fases.md](docs/fases.md) · Seguridad: [docs/seguridad.md](docs/seguridad.md) · Manual del panel: [docs/gestion.md](docs/gestion.md)

## Las tres piezas

| Pieza | Carpeta | En local |
|---|---|---|
| **App** que usa la gente (será nativa con Capacitor; hoy también web instalable) | `src/` | http://localhost:5273/valverde-cuenta/ |
| **Panel de gestión**: dirección revisa; las entidades envían eventos y los comercios llevan su ficha | `gestion/` | http://localhost:5274/gestion/ |
| **Servidor**: datos, cuentas y seguridad (Node + SQLite, sin servicios externos) | `servidor/` | http://localhost:8787 |

`compartido/` tiene lo que usan las tres: tipos, categorías y la comprobación del CIF.

## Para trabajar en local

Hace falta Node 24 o superior.

```bash
npm install
npm run dev:servidor     # servidor (la primera vez crea .env con una clave aleatoria)
npm run dev:gestion      # panel de gestión
npm run dev              # app
```

La primera vez:

```bash
npm run sembrar                                              # eventos de ejemplo (solo local)
npm run admin -- crear-direccion correo@ejemplo.es "Nombre"  # cuenta de dirección: da un enlace para poner contraseña
```

En local los correos no se envían: aparecen en la consola del servidor y en `servidor/datos/correos/`.

## Comprobar

```bash
npm test        # pruebas del servidor, incluidas las de seguridad
npm run build   # compila app y panel
npm run lint
```

## Publicación

- Cada cambio en `main` publica en GitHub Pages una **versión de demostración** de la app, con eventos de ejemplo y sin servidor (`VITE_DEMO=1`).
- El servidor y el panel aún no están publicados en ningún sitio: es la fase 5.

## Nunca al repositorio

`.env` (la clave del servidor) y `servidor/datos/` (base de datos, copias y correos) están en `.gitignore`. Si alguna vez se suben por error, hay que cambiar la clave.
