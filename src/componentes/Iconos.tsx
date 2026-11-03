const TRAZOS = {
  inicio: 'M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z',
  agenda: 'M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zM4 11h16M8 3v4M16 3v4',
  historias: 'M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM6 11a6 6 0 0 0 12 0M12 17v4M9 21h6',
  mapa: 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14',
  yincana: 'M6 21V4M6 4h12l-3 4 3 4H6',
  qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2M14 20h2M18 18h2v2',
  atras: 'M15 5l-7 7 7 7',
  adelante: 'M9 5l7 7-7 7',
  corazon: 'M12 20s-7-4.5-8.5-9A4.5 4.5 0 0 1 12 8a4.5 4.5 0 0 1 8.5 3C19 15.5 12 20 12 20z',
  compartir: 'M12 15V4M8 8l4-4 4 4M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6',
  pin: 'M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.500C5 14.800 12 21 12 21zM12 12a2.500 2.500 0 1 0 0-5 2.500 2.500 0 0 0 0 5z',
  check: 'M5 12.500l4.500 4.500L19 7.500',
  cerrar: 'M6 6l12 12M18 6L6 18',
  mas: 'M12 5v14M5 12h14',
  ubicacion: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v3M12 19v3M2 12h3M19 12h3',
  personas: 'M9 11a3.500 3.500 0 1 0 0-7 3.500 3.500 0 0 0 0 7zM3 20c0-3.300 2.700-6 6-6s6 2.700 6 6M16 4.500a3.500 3.500 0 0 1 0 6.500M18 14.500c1.800.800 3 2.700 3 5.500',
  entrada: 'M4 8h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4zM14 8v10',
}

export type NombreIcono = keyof typeof TRAZOS

export function Icono({ n, tam = 24, relleno = false }: { n: NombreIcono; tam?: number; relleno?: boolean }) {
  return (
    <svg
      width={tam} height={tam} viewBox="0 0 24 24" fill={relleno ? 'currentColor' : 'none'}
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
    >
      <path d={TRAZOS[n]} />
    </svg>
  )
}
