/** Iconos del panel: trazos sencillos, del mismo estilo que los de la app. */
const TRAZOS = {
  bandeja: 'M4 13h4l2 3h4l2-3h4M5 5h14l1 8v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-5z',
  calendario: 'M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zM4 11h16M8 3v4M16 3v4',
  personas: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14.5c1.8.8 3 2.7 3 5.5',
  mapa: 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14',
  actividad: 'M4 12h4l3-7 4 14 3-7h2',
  campana: 'M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0',
  buscar: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  mas: 'M12 5v14M5 12h14',
  cerrar: 'M6 6l12 12M18 6L6 18',
  adelante: 'M9 5l7 7-7 7',
  atras: 'M15 5l-7 7 7 7',
  imagen: 'M5 5h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM4 16l5-5 4 4 2-2 5 5M15 9.5a1.5 1.5 0 1 0 0-.01',
  pin: 'M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  reloj: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  aviso: 'M12 3l10 18H2zM12 10v5M12 18v.01',
  salir: 'M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 16l-4-4 4-4M6 12h10',
  lapiz: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
} as const

export type NombreIcono = keyof typeof TRAZOS

export function Icono({ n, tam = 20 }: { n: NombreIcono; tam?: number }) {
  return (
    <svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="g-icono">
      <path d={TRAZOS[n]} />
    </svg>
  )
}
