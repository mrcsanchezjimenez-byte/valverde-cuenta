import { useId, type ReactNode } from 'react'
import type { TipoEscena } from '../datos/tipos'

/** Ilustraciones de sustitución, con el estilo del diseño, hasta tener fotos reales. */
const C = { cielo: '#EBD6A9', cielo2: '#F3E5C0', suelo: '#C9A871', fachada: '#F5E8BE', sombra: '#D8BC85', oscuro: '#5B4433', madera: '#8F7354', tejado: '#B98F5A' }

function Personas({ xs, y = 128 }: { xs: number[]; y?: number }) {
  return (
    <g fill={C.oscuro}>
      {xs.map((x) => (
        <g key={x}>
          <circle cx={x} cy={y} r="8" />
          <rect x={x - 8} y={y + 8} width="16" height="30" rx="7" />
        </g>
      ))}
    </g>
  )
}

function Guirnalda() {
  const puntos = [40, 90, 140, 190, 240, 290]
  return (
    <g>
      <path d="M0 26 Q 160 66 320 22" fill="none" stroke={C.oscuro} strokeWidth="1.5" />
      {puntos.map((x, i) => {
        const y = 28 + 14 * Math.sin((x / 320) * Math.PI)
        return <path key={x} d={`M${x - 8} ${y}h16l-8 14z`} fill={i % 2 ? C.madera : '#B4502B'} />
      })}
    </g>
  )
}

function Edificio({ x, y, an, al, ventanas = 2 }: { x: number; y: number; an: number; al: number; ventanas?: number }) {
  const hueco = an / (ventanas + 1)
  return (
    <g>
      <rect x={x} y={y} width={an} height={al} fill={C.fachada} />
      <rect x={x - 3} y={y - 6} width={an + 6} height="7" fill={C.tejado} />
      {Array.from({ length: ventanas }, (_, i) => (
        <rect key={i} x={x + hueco * (i + 1) - 7} y={y + 14} width="14" height="20" fill={C.madera} />
      ))}
    </g>
  )
}

const ESCENAS: Record<TipoEscena, ReactNode> = {
  fiesta: (<><Guirnalda /><Personas xs={[60, 115, 170, 225, 270]} y={112} /></>),
  iglesia: (
    <>
      <Edificio x={50} y={92} an={220} al={78} ventanas={4} />
      <rect x="135" y="30" width="50" height="140" fill={C.fachada} />
      <path d="M130 32 L160 8 L190 32z" fill={C.tejado} />
      <circle cx="160" cy="58" r="9" fill={C.madera} />
      <path d="M146 170v-32a14 14 0 0 1 28 0v32z" fill={C.oscuro} />
    </>
  ),
  ermita: (
    <>
      <rect x="85" y="74" width="150" height="96" fill={C.fachada} />
      <path d="M78 76 L160 40 L242 76z" fill={C.tejado} />
      <rect x="148" y="16" width="24" height="30" fill={C.fachada} />
      <path d="M146 18 L160 6 L174 18z" fill={C.tejado} />
      <path d="M142 170v-40a18 18 0 0 1 36 0v40z" fill={C.oscuro} />
    </>
  ),
  calle: (
    <>
      <path d="M0 20 L110 62 V170 H0z" fill={C.sombra} />
      <path d="M320 20 L210 62 V170 H320z" fill={C.fachada} />
      <rect x="110" y="62" width="100" height="108" fill={C.fachada} />
      <rect x="140" y="88" width="40" height="82" fill={C.madera} />
      <rect x="22" y="72" width="34" height="44" fill={C.madera} />
      <rect x="264" y="72" width="34" height="44" fill={C.madera} />
      <circle cx="160" cy="150" r="5" fill={C.oscuro} />
    </>
  ),
  comercio: (
    <>
      <rect x="30" y="34" width="260" height="136" fill={C.fachada} />
      <rect x="30" y="34" width="260" height="20" fill={C.tejado} />
      <rect x="46" y="66" width="110" height="18" fill="#B4502B" />
      <rect x="46" y="84" width="110" height="86" fill={C.madera} />
      <rect x="190" y="72" width="30" height="36" fill={C.oscuro} />
      <rect x="230" y="72" width="30" height="36" fill={C.oscuro} />
    </>
  ),
  dolmen: (
    <>
      <path d="M70 100h180l10 16H60z" fill={C.oscuro} />
      <rect x="86" y="116" width="26" height="54" fill={C.madera} />
      <rect x="208" y="116" width="26" height="54" fill={C.madera} />
      <circle cx="285" cy="110" r="20" fill="#A9B07A" />
      <rect x="282" y="125" width="6" height="45" fill={C.oscuro} />
    </>
  ),
  teatro: (
    <>
      <rect x="0" y="0" width="320" height="24" fill="#8F3E20" />
      <path d="M0 0h70c0 60-20 110-70 150zM320 0h-70c0 60 20 110 70 150z" fill="#B4502B" />
      <ellipse cx="160" cy="165" rx="130" ry="18" fill={C.oscuro} />
      <Personas xs={[135, 185]} y={102} />
    </>
  ),
  musica: (
    <>
      <path d="M50 150 Q160 60 270 150z" fill={C.fachada} />
      <Personas xs={[90, 135, 185, 230]} y={106} />
      <path d="M268 40v34a9 7 0 1 1-5-6V48l28-7v28a9 7 0 1 1-5-6V34z" fill="#B4502B" />
    </>
  ),
  libro: (
    <>
      <path d="M160 70 C130 50 80 50 50 62v92c30-12 80-12 110 8z" fill={C.fachada} />
      <path d="M160 70 C190 50 240 50 270 62v92c-30-12-80-12-110 8z" fill="#F9F0D2" />
      <path d="M160 70v92" stroke={C.oscuro} strokeWidth="2" />
      <path d="M72 84c20-5 48-5 68 4M72 102c20-5 48-5 68 4M180 88c20-9 48-9 68-4M180 106c20-9 48-9 68-4" stroke={C.madera} strokeWidth="3" fill="none" />
    </>
  ),
  casa: (
    <>
      <Edificio x={60} y={70} an={200} al={100} ventanas={3} />
      <path d="M50 66 L160 28 L270 66z" fill={C.tejado} />
      <rect x="215" y="26" width="16" height="30" fill={C.madera} />
      <rect x="143" y="122" width="34" height="48" fill={C.oscuro} />
    </>
  ),
}

export function Escena({ tipo, clase = '' }: { tipo: TipoEscena; clase?: string }) {
  const id = useId()
  return (
    <svg className={`escena ${clase}`} viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Ilustración de sustitución">
      <defs>
        <pattern id={id} width="6" height="6" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="0.9" fill={C.madera} opacity="0.35" />
        </pattern>
      </defs>
      <rect width="320" height="180" fill={C.cielo} />
      <rect width="320" height="180" fill={`url(#${id})`} />
      <rect y="150" width="320" height="30" fill={C.suelo} />
      {ESCENAS[tipo]}
    </svg>
  )
}
