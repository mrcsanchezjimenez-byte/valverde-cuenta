# Valverde Cuenta

Webapp instalable (PWA) de 27 Vueltas para Valverde del Camino: agenda de eventos del pueblo y alrededores, y yincana cultural de cinco paradas con el recorrido en mapa. Sin registro.

## Para trabajar

```bash
npm install
npm run dev
```

Cada cambio en la rama `main` se publica solo en GitHub Pages.

## Dónde está cada cosa

- `src/datos/eventos.ts`: la agenda. **Hoy son eventos de ejemplo.**
- `src/datos/yincana.ts`: paradas, relatos y preguntas. **Paradas propuestas y relatos de ejemplo.**
- `src/datos/repositorio.ts`: único punto de acceso a los datos. Aquí se conectará la fuente real.
- `src/nativo/index.ts`: todo lo que toca el dispositivo (compartir, calendario, ubicación, almacenamiento).
- `src/pantallas/`: una pantalla por archivo.

## Camino a app nativa

La app está preparada para empaquetarse con Capacitor sin rehacer las pantallas:

- Las rutas usan `HashRouter`, que funciona igual dentro de una app nativa.
- Las funciones del dispositivo están aisladas en `src/nativo/`, y se cambian por plugins nativos.
- Compilar con `VITE_BASE=/` para quitar la ruta de GitHub Pages.

## Datos del mapa

Lugares, ruta a pie y mapa base de OpenStreetMap. Sus servidores públicos sirven para esta fase de prueba. Con tráfico real habrá que pasar a un proveedor de mapas propio, porque su política de uso limita el uso intensivo.
