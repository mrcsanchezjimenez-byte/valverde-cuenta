import type { Categoria, Evento } from './tipos'

/**
 * EVENTOS DE EJEMPLO. Fechas, organizadores y precios son inventados para enseñar la app.
 * Los lugares sí son reales (coordenadas de OpenStreetMap).
 */
const TEATRO = { lugar: 'Teatro Municipal Puerta del Andévalo', lat: 37.575099, lng: -6.750136 }
const CONSTITUCION = { lugar: 'Plaza de la Constitución', lat: 37.573977, lng: -6.74894 }
const BIBLIOTECA = { lugar: 'Biblioteca Municipal', lat: 37.58007, lng: -6.750726 }
const MERCADO = { lugar: 'Mercado Municipal', lat: 37.573842, lng: -6.753148 }
const RAMON_Y_CAJAL = { lugar: 'Plaza Ramón y Cajal', lat: 37.57296, lng: -6.754188 }
const VALVERDE = { municipio: 'Valverde del Camino', zona: 'valverde' as const }

export const EVENTOS: Evento[] = [
  {
    id: 'noche-brevescena', ...TEATRO, ...VALVERDE,
    titulo: 'Noche de BrevEscena',
    resumen: 'Piezas cortas de teatro con compañías de la comarca.',
    descripcion: 'Una velada de teatro breve: varias piezas cortas, un descanso para comentar y la oportunidad de conocer a quienes están sobre el escenario.',
    inicio: '2026-11-07T20:30', fin: '2026-11-07T22:30',
    organizador: '27 Vueltas', precio: 5, publico: 'Mayores de 12 años', categoria: 'teatro', escena: 'teatro',
  },
  {
    id: 'ruta-gabrieles',
    lugar: 'Dólmenes de Los Gabrieles (entrada de la ruta)', lat: 37.558759, lng: -6.735601, ...VALVERDE,
    titulo: 'Paseo a los dólmenes de Los Gabrieles',
    resumen: 'Ruta guiada a pie por el conjunto megalítico.',
    descripcion: 'Un paseo tranquilo por el campo para visitar los dólmenes de Los Gabrieles y entender quién los levantó. Lleva calzado cómodo y agua.',
    inicio: '2026-11-08T10:30', fin: '2026-11-08T13:00',
    organizador: 'Colectivo local', precio: null, publico: 'Todos los públicos', categoria: 'patrimonio', paraNinos: true, escena: 'dolmen',
  },
  {
    id: 'banda-zalamea',
    lugar: 'Zalamea la Real', municipio: 'Zalamea la Real', zona: 'alrededores', lat: 37.67937, lng: -6.66057,
    titulo: 'Concierto de otoño de la banda',
    resumen: 'La banda de música repasa su repertorio de otoño.',
    descripcion: 'Concierto al aire libre si el tiempo acompaña. Un buen plan para combinar con una visita a los dólmenes de El Pozuelo.',
    inicio: '2026-11-14T18:00', fin: '2026-11-14T19:30',
    organizador: 'Ayuntamiento de la localidad', precio: null, publico: 'Todos los públicos', categoria: 'musica', escena: 'musica',
  },
  {
    id: 'jornada-minera',
    lugar: 'Minas de Riotinto', municipio: 'Minas de Riotinto', zona: 'alrededores', lat: 37.69346, lng: -6.59578,
    titulo: 'Jornada de patrimonio minero',
    resumen: 'Charlas y visita comentada sobre la historia minera.',
    descripcion: 'Una mañana para conocer el pasado minero de la comarca.',
    inicio: '2026-11-15T10:00', fin: '2026-11-15T14:00',
    organizador: 'Colectivo local', precio: null, publico: 'Todos los públicos', categoria: 'patrimonio', escena: 'casa',
  },
  {
    id: 'muestra-artesania', ...CONSTITUCION, ...VALVERDE,
    titulo: 'Muestra de botos y artesanía',
    resumen: 'Talleres del pueblo enseñan su oficio en la calle.',
    descripcion: 'Artesanos del boto y la madera trabajan a la vista del público. Se puede preguntar, tocar y comprar directamente.',
    inicio: '2026-11-21T11:00', fin: '2026-11-21T19:00',
    organizador: 'Asociación de comerciantes', precio: null, publico: 'Todos los públicos', categoria: 'mercados', escena: 'comercio',
  },
  {
    id: 'cuentacuentos', ...BIBLIOTECA, ...VALVERDE,
    titulo: 'Cuentacuentos: historias del pueblo',
    resumen: 'Tarde de cuentos para peques en la biblioteca.',
    descripcion: 'Cuentos inspirados en calles y personajes de Valverde. Plazas limitadas por orden de llegada.',
    inicio: '2026-11-28T17:30', fin: '2026-11-28T18:30',
    organizador: 'Biblioteca Municipal', precio: null, publico: 'De 4 a 10 años', categoria: 'ninos', paraNinos: true, escena: 'libro',
  },
  {
    id: 'mercado-navidad', ...MERCADO, ...VALVERDE,
    titulo: 'Mercado de Navidad',
    resumen: 'Puestos de dulces, regalos y producto local.',
    descripcion: 'Comercio del pueblo y dulces caseros durante todo el día. Con música por la tarde.',
    inicio: '2026-12-05T11:00', fin: '2026-12-05T21:00',
    organizador: 'Asociación de comerciantes', precio: null, publico: 'Todos los públicos', categoria: 'mercados', paraNinos: true, escena: 'comercio',
  },
  {
    id: 'concierto-navidad', ...TEATRO, ...VALVERDE,
    titulo: 'Concierto de Navidad',
    resumen: 'Música de banda y villancicos en el teatro.',
    descripcion: 'El concierto más navideño del año: repertorio clásico de banda y villancicos para cantar con el público.',
    inicio: '2026-12-12T20:00', fin: '2026-12-12T21:30',
    organizador: 'Ayuntamiento', precio: 3, publico: 'Todos los públicos', categoria: 'musica', escena: 'musica',
  },
  {
    id: 'belen-calanas',
    lugar: 'Calañas', municipio: 'Calañas', zona: 'alrededores', lat: 37.65451, lng: -6.87863,
    titulo: 'Belén viviente',
    resumen: 'Vecinos recrean el belén por las calles del pueblo.',
    descripcion: 'Un recorrido a pie por las escenas del belén, con oficios tradicionales y dulces al final.',
    inicio: '2026-12-13T17:00', fin: '2026-12-13T20:00',
    organizador: 'Colectivo local', precio: null, publico: 'Todos los públicos', categoria: 'fiestas', paraNinos: true, escena: 'fiesta',
  },
  {
    id: 'voces-valverde', ...BIBLIOTECA, ...VALVERDE,
    titulo: 'Presentación de «Las voces de Valverde»',
    resumen: 'Primeros testimonios de Radio 27, en directo.',
    descripcion: 'Escucharemos juntos los primeros testimonios de vecinos y vecinas sobre calles, oficios y tradiciones del pueblo.',
    inicio: '2026-12-18T19:00', fin: '2026-12-18T20:30',
    organizador: '27 Vueltas', precio: null, publico: 'Todos los públicos', categoria: 'patrimonio', escena: 'casa',
  },
  {
    id: 'zambomba', ...CONSTITUCION, ...VALVERDE,
    titulo: 'Gran Zambombá de Navidad',
    resumen: 'Villancicos populares, dulces caseros y música en la calle.',
    descripcion: 'Villancicos populares, dulces caseros y música en la calle. Organizan varios colectivos del pueblo.',
    inicio: '2026-12-19T18:00', fin: '2026-12-19T21:00',
    organizador: 'Ayuntamiento', precio: null, publico: 'Todos los públicos', categoria: 'fiestas', paraNinos: true, escena: 'fiesta',
  },
  {
    id: 'teatro-breve', ...TEATRO, ...VALVERDE,
    titulo: 'Teatro breve: tres piezas',
    resumen: 'Tres historias cortas y un brindis de Navidad.',
    descripcion: 'BrevEscena cierra el año con tres piezas cortas. Al terminar, un brindis con quienes han actuado.',
    inicio: '2026-12-20T20:30', fin: '2026-12-20T22:00',
    organizador: 'BrevEscena', precio: 5, publico: 'Mayores de 12 años', categoria: 'teatro', escena: 'teatro',
  },
  {
    id: 'yincana-guiada', ...RAMON_Y_CAJAL, ...VALVERDE,
    titulo: 'Yincana guiada por el casco urbano',
    resumen: 'Haz la ruta en grupo, con alguien que la conoce.',
    descripcion: 'La yincana se puede hacer por tu cuenta cualquier día, pero esta mañana la recorremos en grupo. Gratis y sin apuntarse.',
    inicio: '2026-12-27T11:00', fin: '2026-12-27T12:30',
    organizador: '27 Vueltas', precio: null, publico: 'Todos los públicos', categoria: 'patrimonio', paraNinos: true, escena: 'calle', enlazaYincana: true,
  },
  {
    id: 'cabalgata', ...RAMON_Y_CAJAL, ...VALVERDE,
    titulo: 'Cabalgata de Reyes',
    resumen: 'Sus Majestades recorren las calles del pueblo.',
    descripcion: 'La tarde más esperada por los peques. Consulta el itinerario antes de elegir sitio.',
    inicio: '2027-01-05T18:00', fin: '2027-01-05T20:30',
    organizador: 'Ayuntamiento', precio: null, publico: 'Todos los públicos', categoria: 'ninos', paraNinos: true, escena: 'fiesta',
  },
  {
    id: 'mercado-beas',
    lugar: 'Beas', municipio: 'Beas', zona: 'alrededores', lat: 37.42545, lng: -6.79161,
    titulo: 'Mercado de productos del campo',
    resumen: 'Productores de la zona venden directamente.',
    descripcion: 'Una mañana de producto de temporada, cerca de Valverde.',
    inicio: '2027-01-17T10:00', fin: '2027-01-17T14:00',
    organizador: 'Ayuntamiento de la localidad', precio: null, publico: 'Todos los públicos', categoria: 'mercados', escena: 'comercio',
  },
  {
    id: 'pasacalles-carnaval', ...CONSTITUCION, ...VALVERDE,
    titulo: 'Pasacalles de Carnaval',
    resumen: 'Agrupaciones y disfraces llenan el centro.',
    descripcion: 'Salida de las agrupaciones y pasacalles por el centro. Ven con disfraz.',
    inicio: '2027-02-06T17:00', fin: '2027-02-06T20:00',
    organizador: 'Colectivo local', precio: null, publico: 'Todos los públicos', categoria: 'fiestas', paraNinos: true, escena: 'fiesta',
  },
]

export const CATEGORIAS: { id: Categoria; nombre: string; emoji: string }[] = [
  { id: 'teatro', nombre: 'Teatro', emoji: '🎭' },
  { id: 'musica', nombre: 'Música', emoji: '🎶' },
  { id: 'fiestas', nombre: 'Fiestas', emoji: '🎉' },
  { id: 'ninos', nombre: 'Niños', emoji: '🧒' },
  { id: 'patrimonio', nombre: 'Patrimonio', emoji: '🏛️' },
  { id: 'mercados', nombre: 'Mercados', emoji: '🧺' },
]
