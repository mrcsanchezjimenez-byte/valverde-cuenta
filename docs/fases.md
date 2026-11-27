# Fases de Valverde Cuenta

Decisiones de partida (27/11/2026):

- Proyecto independiente de 27 Vueltas. Pilar y Marcos lo llevan como autónomos, con un contrato privado entre ellos.
- Zona: unos 20 km alrededor de Valverde. La lista exacta de pueblos se cambia en el panel («Zona»), sin tocar código.
- Publican gratis las asociaciones y entidades sin ánimo de lucro y las instituciones. Comercios, empresas y autónomos pagan por anunciarse.
- No hay propaganda política ni sindical.
- Las historias y los eventos los aprueba solo dirección.
- La publicidad entra poco a poco, de forma discreta y con un límite para que la agenda no pierda credibilidad.
- Se trabaja en local hasta tener nombre y dominio.

---

## Fase 1 · Cimientos y agenda moderada ✅ hecha

- Servidor propio (Node + SQLite) con base de datos versionada y copias con `npm run admin -- copia`.
- Cuentas de **dirección**, con doble factor obligatorio. Se crean solo desde la consola del servidor.
- **Alta de entidades** con comprobación del CIF: la letra G, P, Q, R o S publica gratis; una empresa recibe el aviso de que tiene que anunciarse con los planes de pago. Hay que confirmar el correo, y dirección verifica cada entidad.
- **Envío de eventos** con mapa para marcar el lugar exacto, borradores y declaración de que no es propaganda política ni publicidad.
- **Bandeja de dirección**:
  - Publicar, no publicar (con motivo, que le llega a la entidad) y corregir erratas.
  - Retirar de la agenda y volver a publicar.
  - Meter eventos a mano: carteles o avisos de quien no tiene cuenta.
- Si una entidad cambia un evento ya publicado, sigue visible como estaba hasta que dirección apruebe los cambios.
- Una entidad puede cancelar su evento: sigue en la agenda marcado como **Cancelado**.
- Gestión de la zona (pueblos activos) y **registro de actividad** de todo lo que pasa.
- La **app** lee la agenda del servidor y guarda una copia para funcionar sin cobertura.
- Paleta de Valverde:
  - Verde de la bandera, con su línea ondulada del «camino».
  - Blanco cal.
  - Cuero de los botos.
  - Oro y rojo del escudo.
  - Botones con relieve y letra grande.

## Hecho después de la fase 1 (28/11/2026)

- **Demostración pública** sin servidor, con el panel incluido y cuentas ficticias. Ver README.
- **Aviso de responsabilidad**: la agenda difunde, no organiza. Solo se garantiza la identidad de la entidad.
- **Panel rediseñado**:
  - Menú con iconos, que en el móvil pasa a una barra inferior.
  - Eventos agrupados por mes, con buscador y filtros con contador.
  - Entidades en tarjetas que se pulsan enteras.
  - Formulario por pasos con vista previa de cómo saldrá en la app.
- **Avisos a la entidad** al publicar, no publicar, retirar, aprobar o rechazar cambios y verificar. Les llega por correo y queda en su panel («Avisos»). Dirección ve confirmado a quién se ha avisado.
- **Cartel del evento** (opcional) que sube la entidad y se aprueba con el evento. Si no hay cartel, la app pone una ilustración según la categoría. No se cobra nada a las asociaciones.

- **Inscripciones** ✅
  - La entidad decide si hay que apuntarse, cuántas plazas hay y hasta cuándo.
  - La gente se apunta sin cuenta.
  - Lista de espera automática.
  - La entidad tiene la lista de apuntados, la descarga para Excel y puede escribir a todos.
  - Los datos se borran solos un mes después del evento.
- **Fotos de cómo fue** ✅: las entidades suben fotos de sus eventos y dirección las aprueba una a una. En la app se ven en la ficha y en «Cómo fue» de Inicio.
- **Fidelización, primeros pasos** ✅
  - «Tus planes» en Inicio.
  - Seguir asociaciones, con filtro «De quien sigo».
  - Contador de placas QR descubiertas, primer paso del «pasaporte».

## Fase 2 · Historias del pueblo y QR ✅ hecha

- Formulario «Cuéntanos una historia» en la app:
  - Escrita o **grabada con el móvil**.
  - Hasta 4 fotos, época, lugar y firma con nombre o como «un vecino o vecina».
  - Cuatro permisos obligatorios; queda guardado qué aceptó cada persona y con qué versión del texto.
- **Modo entrevista** en el panel: grabar desde el propio panel o subir audio y fotos.
- Moderación solo de dirección:
  - Corregir el texto y elegir qué fotos y audio se publican.
  - Publicar, no publicar, retirar y borrar para siempre (también los archivos).
- **Un QR por lugar**, con su dirección fija. La página del QR abre sin instalar nada y cuenta los escaneos (solo el número por día).
- **Placa A5 para imprimir** y QR en SVG para la imprenta.
  - Aviso mientras la dirección sea provisional: **no imprimir placas definitivas sin dominio propio**.
- Archivos: tipo comprobado por sus bytes, fotos sin metadatos, guardados fuera de lo público, audio con rangos para iPhone.

**Pendiente de decidir:** placas con el Ayuntamiento o, si no colabora, en comercios. Un comercio con placa sería un «Punto de historia» en la app.

**Ideas para seguir:**
- Recompensas del «pasaporte» con comercios patrocinadores (fase 3).
- Recordatorios y «este finde en Valverde» con notificaciones (fase 4: necesitan la app nativa).
- Que una entidad pueda añadir más datos a su ficha pública (logo, redes).

## Fase 3 · Comercios y anuncios

- **Guía de comercios** con ficha básica gratis: nombre, dirección, horario y teléfono.
- **Planes de pago**. Precios por validar con 3 o 4 comerciantes:

  | Plan | Qué incluye | Precio orientativo |
  |---|---|---|
  | Escaparate | Ficha completa y ofertas | 15 €/mes o 150 €/año |
  | Destacado | Además, tarjeta patrocinada en Inicio y Agenda | 35 €/mes o 350 €/año |
  | Campaña | Navidad, feria, Black Friday, rebajas | 30–60 € |
  | Promoción puntual | Una oferta durante una semana | 10 € |
  | Patrocinio | De la yincana o de una historia | A medida |

  Los 20 primeros, como «comercios fundadores», pagan la mitad el primer año.
- **Límite de anuncios**: como mucho un contenido patrocinado por cada X eventos, siempre marcado como «Patrocinado».
- Cuentas de comercio, separadas de las de entidades.
- Control de cobros desde el panel:
  - Plan, fechas y estado de pago.
  - Aviso antes de que caduque.
  - El anuncio se apaga solo si no se renueva.
- El cobro se hace **fuera de la app**, con factura y transferencia, domiciliación o enlace de pago. Así no hay comisión de Apple ni de Google.
- Documento de **política de cobros** y contrato tipo para anunciantes.
- Hay que aclarar con la gestoría cómo facturar como autónomos (IVA, quién factura cada cosa).

## Fase 4 · App nativa

- Empaquetado con Capacitor para Android e iOS. Las funciones del móvil ya están aisladas en `src/nativo/`.
- **Notificaciones** que cada persona elige recibir, por ejemplo «este finde en Valverde» o por temas. Ninguna de anuncios sin permiso.
- Enlaces universales: un QR o un enlace compartido abre la app si está instalada.
- Cuentas de desarrollador:
  - Google Play: con cuenta personal hay que pasar una prueba cerrada con 12 personas durante 14 días.
  - Apple: como autónomos la cuenta sería individual y en la tienda saldría el nombre de quien la abra. Conviene confirmarlo antes.

## Fase 5 · Puesta en marcha

- Nombre definitivo y **dominio**. Hay que tenerlo antes de imprimir ningún QR.
- Alojamiento en la UE: un servidor pequeño de unos 5 €/mes o un servicio gestionado, con HTTPS.
- Proveedor de correo europeo para los avisos.
- Copias automáticas diarias, cifradas y fuera del servidor. Hay que probar a restaurarlas.
- Proveedor de mapas propio: el de OpenStreetMap no admite mucho tráfico.
- Textos legales:
  - Aviso legal.
  - Privacidad (RGPD) y registro de actividades de tratamiento.
  - Condiciones para entidades y para anunciantes.
  - Cookies (hoy no hay de seguimiento).
- Avisos si el servidor se cae.
