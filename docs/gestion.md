# Manual del panel de gestión

Para Pilar y Marcos. El panel está en `/gestion/`; en local, en http://localhost:5274/gestion/.

## Primera vez

1. Quien tenga acceso al servidor crea la cuenta:
   `npm run admin -- crear-direccion correo@ejemplo.es "Nombre Apellido"`
2. Sale un enlace (vale 24 h). Se abre y se pone la contraseña. Lo más fácil: tres o cuatro palabras que no tengan que ver entre sí.
3. Al entrar, el panel pide activar la **verificación en dos pasos**:
   - Instala en el móvil Google Authenticator o Microsoft Authenticator.
   - Escanea el código QR.
   - Escribe el código de 6 cifras.
4. A partir de ahí, cada entrada pide contraseña y código del móvil.

## El día a día: «Pendientes»

El número junto a «Pendientes» dice cuánto hay por revisar. Además, a dirección le llega un correo con cada cosa nueva.

**Eventos nuevos.** Pulsa «Revisar →».
- **Publicar**: sale en la agenda y la entidad recibe un correo.
- **No publicar…**: escribe el motivo, que le llega a la entidad. Ella lo puede corregir y volver a enviar.
- **Corregir algo**: para arreglar una errata, el lugar o la ilustración sin molestar a nadie.

**Cambios en eventos publicados.** Una tabla muestra lo que hay publicado y lo que proponen.
- Mientras no se aprueban, la agenda sigue enseñando la versión anterior.
- **Aprobar cambios** o **No aplicarlos…** (con motivo).

**Entidades que piden alta.** Antes de verificar, comprueba que la entidad existe y no tiene ánimo de lucro:
- Registro de Asociaciones de Andalucía.
- Su web o redes sociales.
- O una llamada a la persona de contacto.

La letra del CIF ya da una pista (G asociación, P ayuntamiento, R hermandad…), pero no basta. Si el correo está «sin confirmar», hay que esperar.

**Ofertas de comercios.** «Publicar» o «No» (con motivo). El comercio recibe un aviso.

**Comercios por revisar.** Altas nuevas y cambios en fichas ya publicadas. Comprobad que el negocio existe y está en la zona.

**Planes que caducan pronto.** Los que terminan en los próximos 15 días: es el momento de llamar para renovar.

## Historias del pueblo

- **Historias**: llegan desde la app («Cuéntanos una historia») y salen en «Pendientes».
  - Al abrir una puedes corregir el texto y la firma, y elegir qué fotos y audio se publican (cada uno con su interruptor y pie de foto).
  - A la derecha ves quién la manda (nunca se publica) y qué permisos aceptó.
  - Si alguien pide quitar su historia: «Retirar» y después «Borrar para siempre», que elimina también fotos y audio.
- **Nueva entrevista**: para las historias que recogéis en persona.
  - Se graba con el móvil desde el propio panel; mejor en un sitio sin ruido.
  - Antes, la persona tiene que aceptar los permisos.
- **Lugares y placas**: cada lugar tiene su placa con QR.
  - «Placa» enseña la hoja A5 para imprimir y el QR en SVG para la imprenta.
  - La lista muestra cuántas veces se ha escaneado cada placa en los últimos 30 días.
  - **No imprimáis placas definitivas hasta tener dominio**: el panel avisa mientras la dirección sea provisional.

## Fotos de cómo fue

Las entidades suben fotos de sus eventos ya publicados. En «Pendientes», marca ✓ o ✕ en cada foto y guarda. «Publicar todas» publica las que no hayas marcado con ✕. La entidad recibe un aviso con el resultado. Desde la ficha del evento puedes quitar una foto ya publicada.

## Inscripciones

Si un evento pide inscripción, en su ficha ves la lista de apuntados en solo lectura. La gestiona la entidad: descargar la lista, escribir a todos, cancelar a alguien. Los datos se borran solos un mes después del evento.

## Comercios y anuncios

En «Comercios» hay tres pestañas: **Comercios**, **Campañas** y **Cobros**. Las normas y precios están en la [política de cobros](politica-cobros.md).

- **Comercios**: la guía entera, con filtros (por revisar, con plan, solo ficha básica, suspendidos).
  - «Dar de alta» mete un comercio a mano. Después, «Crearle una cuenta» le manda una invitación para que lleve su ficha.
  - En la ficha de cada uno: sus planes, sus ofertas, la ficha, el contacto privado y una nota interna.
  - **Verificar** lo publica en la guía. **Quitar de la guía…** lo suspende y pierde el acceso.
- **Planes y cobros**: «Añadir plan o renovación» con plan, fechas, importe, si está pagado y número de factura.
  - Un plan cuenta solo entre sus fechas. Al caducar, lo de pago se apaga solo; la ficha básica sigue.
  - «Anulado» lo apaga al momento.
  - La factura se hace con el programa de facturación o la gestoría; aquí solo se apunta su número.
- **Campañas**: nombre, fechas y descripción. Durante esas fechas, la app enseña el banner y la sección con los comercios que la han contratado.
- **Cobros**: lo cobrado este mes y este año, lo pendiente y los planes que caducan.

El comercio entra en el mismo panel con su cuenta y ve solo lo suyo: visitas a su ficha, su plan, la ficha y sus ofertas.

## Otras pantallas

- **Eventos**: todos, con filtros y buscador. «+ Meter un evento» publica directamente lo que llega por otros sitios (un cartel, un aviso del Ayuntamiento). A nombre de una entidad con cuenta, o de «Valverde Cuenta» escribiendo quién organiza.
- **Retirar de la agenda…**: para algo publicado que incumple las normas. Lleva motivo. Se puede deshacer con «Volver a publicar».
- **Entidades**: ficha de cada una, con una nota interna que solo ve dirección. Desde ahí se **suspende** a una entidad: pierde el acceso al instante.
- **Zona**: qué pueblos entran en la agenda. Se activan o desactivan con una casilla, y se pueden añadir pedanías.
- **Actividad**: quién ha hecho qué y cuándo. Los intentos fallidos salen resaltados. Si ves algo que no reconoces, cambia tu contraseña y avisa.
- **Mi cuenta** (tu nombre, arriba a la derecha): cambiar la contraseña y salir.

## Normas para decidir

Gratis:
- Asociaciones, hermandades, AMPAs, peñas, clubes y fundaciones.
- Ayuntamientos, colegios y bibliotecas.
- Un evento abierto de un autónomo (por ejemplo, una clase de baile gratis), revisando que no sea publicidad encubierta.

No se publica:
- Propaganda política o sindical.
- Publicidad de empresas o comercios, que va por los planes de pago (fase 3).

Lo que cuenta es **quién organiza**, no dónde se hace: un concierto de una asociación en un bar es gratis; uno que organiza el bar, no.

## Si algo va mal

- **He perdido el móvil del doble factor**: quien tenga acceso al servidor ejecuta `npm run admin -- quitar-2fa tu@correo.es`. Al entrar se vuelve a activar.
- **He olvidado la contraseña**: «He olvidado mi contraseña» en la pantalla de entrada, o `npm run admin -- enlace-clave tu@correo.es`.
- **Una cuenta de dirección comprometida**: `npm run admin -- desactivar correo` y revisa «Actividad».
- **Copia de seguridad a mano**: `npm run admin -- copia` (se guarda en `servidor/datos/copias/`).
