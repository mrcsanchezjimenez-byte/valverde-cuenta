import ruta from './ruta.json'
import type { Parada } from './tipos'

/**
 * PARADAS PROPUESTAS Y RELATOS DE EJEMPLO. Los lugares son reales; los relatos y las voces
 * son inventados hasta tener los testimonios de verdad. No son datos históricos.
 */
export const PARADAS: Parada[] = [
  {
    numero: 1, nombre: 'Ermita de la Trinidad', direccion: 'Calle Trinidad, 50',
    lat: 37.572787, lng: -6.756766, escena: 'ermita', voz: 'Carmen (voz de ejemplo)',
    relato: 'De chica, mi abuela me traía aquí cada domingo con un ramo de geranios de su patio. Decía que quien entraba con las manos vacías salía con la cabeza llena de cuentas pendientes.',
    pregunta: '¿Qué traía la abuela de Carmen a la ermita?',
    opciones: ['Velas de su casa', 'Geranios de su patio', 'Pan recién hecho'], correcta: 1,
    pistaSiguiente: 'Camina hacia el centro hasta la parroquia del Reposo, junto a la plaza Ramón y Cajal.',
    metrosDesdeAnterior: 0,
  },
  {
    numero: 2, nombre: 'Parroquia de Nuestra Señora del Reposo', direccion: 'Calle Real de Arriba',
    lat: 37.572325, lng: -6.753607, escena: 'iglesia', voz: 'Antonio (voz de ejemplo)',
    relato: 'Mi padre decía la hora por las campanas, porque el reloj de casa siempre iba mal. Cuando repicaban a mediodía, soltaba las herramientas y nos íbamos todos a comer.',
    pregunta: 'Según Antonio, ¿cómo sabía su padre la hora?',
    opciones: ['Por las campanas', 'Por el reloj de casa', 'Por la sombra de la calle'], correcta: 0,
    pistaSiguiente: 'Sigue por la calle Real de Arriba hasta el Mercado Municipal.',
    metrosDesdeAnterior: ruta.tramos[0],
  },
  {
    numero: 3, nombre: 'Mercado Municipal', direccion: 'Calle Real de Arriba',
    lat: 37.573842, lng: -6.753148, escena: 'comercio', voz: 'Rosario (voz de ejemplo)',
    relato: 'Mi madre me mandaba a por el pescado los viernes con la cuenta apuntada en un papelito. Yo lo perdía siempre, así que la pescadera ya se sabía de memoria lo que comíamos en casa.',
    pregunta: '¿Qué perdía siempre Rosario?',
    opciones: ['El monedero', 'La cesta', 'El papelito con la cuenta'], correcta: 2,
    pistaSiguiente: 'Continúa unas calles hasta encontrar la plaza de San Pedro.',
    metrosDesdeAnterior: ruta.tramos[1],
  },
  {
    numero: 4, nombre: 'Plaza de San Pedro', direccion: 'Plaza de San Pedro',
    lat: 37.576271, lng: -6.754427, escena: 'calle', voz: 'José María (voz de ejemplo)',
    relato: 'Aquí jugábamos los chiquillos hasta que se encendían las farolas. Esa era la norma en todas las casas: farola encendida, a cenar. Y el que llegaba tarde, se quedaba sin postre.',
    pregunta: '¿Qué marcaba la hora de volver a casa?',
    opciones: ['El toque de campana', 'Las farolas al encenderse', 'El silbato del sereno'], correcta: 1,
    pistaSiguiente: 'Última parada: la Casa Dirección, un museo junto a la carretera de Zalamea.',
    metrosDesdeAnterior: ruta.tramos[2],
  },
  {
    numero: 5, nombre: 'Casa Dirección', direccion: 'Carretera de Zalamea',
    lat: 37.580187, lng: -6.751342, escena: 'casa', voz: 'Dolores (voz de ejemplo)',
    relato: 'Mi abuelo trabajó con los ingleses y aprendió cuatro palabras de su idioma. Con esas cuatro se apañaba para todo, y en casa nos daba los buenos días en inglés, muy serio.',
    pregunta: '¿Cómo daba los buenos días el abuelo de Dolores?',
    opciones: ['Con un silbido', 'En inglés', 'Tocando la puerta'], correcta: 1,
    pistaSiguiente: '',
    metrosDesdeAnterior: ruta.tramos[3],
  },
]

export const RUTA_PUNTOS = ruta.puntos as [number, number][]
export const RUTA_METROS = ruta.distancia
export const RUTA_MINUTOS = 60

export const obtenerParada = (numero: number) => PARADAS.find((p) => p.numero === numero)
