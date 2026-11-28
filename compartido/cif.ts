/**
 * Comprobación del CIF de una entidad.
 *
 * La letra inicial dice qué tipo de entidad es. Publican gratis las que no tienen ánimo de lucro
 * o son públicas; el resto (sociedades, comercios, autónomos) se anuncia pagando.
 * La letra es un primer filtro: dirección revisa cada entidad antes de verificarla.
 */

export const LETRAS_GRATIS: Record<string, string> = {
  G: 'Asociación o fundación',
  P: 'Ayuntamiento o entidad local',
  Q: 'Organismo público',
  R: 'Entidad religiosa (hermandad, parroquia)',
  S: 'Órgano de la Administración',
}

const LETRAS_CONTROL = 'JABCDEFGHI'
/** Estas letras llevan siempre letra de control; las de sociedades, siempre número. */
const CONTROL_LETRA = 'NPQRSW'
const CONTROL_NUMERO = 'ABEH'

export const normalizarCif = (cif: string) => cif.toUpperCase().replace(/[\s.-]/g, '')

export function cifValido(entrada: string): boolean {
  const cif = normalizarCif(entrada)
  if (!/^[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]$/.test(cif)) return false
  const digitos = cif.slice(1, 8)
  let suma = 0
  for (let i = 0; i < 7; i++) {
    const d = Number(digitos[i])
    if (i % 2 === 0) {
      const doble = d * 2
      suma += Math.floor(doble / 10) + (doble % 10)
    } else {
      suma += d
    }
  }
  const control = (10 - (suma % 10)) % 10
  const letra = cif[0]
  const final = cif[8]
  if (CONTROL_LETRA.includes(letra)) return final === LETRAS_CONTROL[control]
  if (CONTROL_NUMERO.includes(letra)) return final === String(control)
  return final === String(control) || final === LETRAS_CONTROL[control]
}

/** null si la entidad puede publicar gratis; si no, el motivo para explicárselo. */
export function motivoCifNoGratis(entrada: string): string | null {
  const cif = normalizarCif(entrada)
  if (!cifValido(cif)) return 'El CIF no es válido. Revisa que esté bien escrito.'
  if (!LETRAS_GRATIS[cif[0]]) {
    return 'Este CIF corresponde a una empresa o sociedad. La agenda es gratuita para asociaciones e instituciones; los comercios y empresas pueden anunciarse con los planes para negocios.'
  }
  return null
}

const LETRAS_DNI = 'TRWAGMYFPDXBNJZSQVHLCKE'

/** DNI (12345678Z) o NIE (X1234567L): los de los autónomos. */
export function nifPersonaValido(entrada: string): boolean {
  const n = normalizarCif(entrada)
  const m = /^([XYZ]?)(\d{7,8})([A-Z])$/.exec(n)
  if (!m) return false
  const numero = Number(`${m[1] ? 'XYZ'.indexOf(m[1]) : ''}${m[2]}`)
  if ((m[1] && m[2].length !== 7) || (!m[1] && m[2].length !== 8)) return false
  return LETRAS_DNI[numero % 23] === m[3]
}

/** Documento de un comercio: CIF de sociedad o DNI/NIE de autónomo. */
export const documentoComercioValido = (entrada: string) => cifValido(entrada) || nifPersonaValido(entrada)
