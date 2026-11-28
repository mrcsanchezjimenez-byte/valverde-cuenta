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
- Recompensas del «pasaporte» con comercios patrocinadores (ver fase 3).
- Recordatorios y «este finde en Valverde» con notificaciones (fase 4: necesitan la app nativa).
- Que una entidad pueda añadir más datos a su ficha pública (logo, redes).

## Fase 3 · Comercios y anuncios ✅ hecha

Los planes, precios y normas están en la [política de cobros](politica-cobros.md) (borrador).

- **Guía de comercios** en la app: la pestaña «Mapa» pasa a ser «Comercios».
  - Buscador y categorías. La ficha básica es gratis: nombre, categoría, dirección y mapa, teléfono y horario.
  - Con **Escaparate**: descripción, logo, fotos, web, redes, WhatsApp y ofertas.
  - Con **Destacado**: además, la tarjeta «Patrocinado».
- **Publicidad con límite**: como mucho un patrocinado cada 8 eventos en la agenda y uno solo en la portada, siempre marcado y rotando cada día.
- **Campañas** (Navidad, rebajas, Black Friday…): banner en la portada y sección propia con los comercios que la contratan y sus ofertas.
- **Ofertas**: las crea el comercio, las revisa dirección y solo salen entre sus fechas.
- **Cuentas de comercio**, separadas de las de entidades:
  - Alta desde la web con CIF, DNI o NIE, o invitación desde el panel.
  - Su panel: visitas a la ficha en 30 días, su plan, la ficha y las ofertas.
  - Los cambios de una ficha ya publicada esperan a dirección; mientras, sigue la versión anterior.
- **Control de cobros** en el panel de dirección:
  - Plan, fechas, importe, forma de pago y número de factura.
  - Lo cobrado este mes y este año, y lo pendiente.
  - Aviso de los planes que caducan en 15 días.
  - Lo de pago se apaga solo al caducar; la ficha básica sigue.
- El cobro se hace **fuera de la app** (transferencia, Bizum o domiciliación, con factura). Así no hay comisión de Apple ni de Google.

**Pendiente de decidir:**
- Precios definitivos, después de hablar con 3 o 4 comerciantes.
- Con la gestoría: IVA, quién factura cada cosa y el programa de facturación (Verifactu).
- Contrato tipo para anunciantes.

**Ideas para seguir:**
- Recompensas del «pasaporte» de la yincana en comercios patrocinadores.
- «Punto de historia»: un comercio que acoge una placa QR.

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
