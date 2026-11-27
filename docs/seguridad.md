# Seguridad

Qué protege hoy el sistema y qué queda para la puesta en marcha. Todo lo marcado con (✓ prueba) se comprueba en `npm test`.

## Cuentas y acceso

- **Contraseñas** guardadas con scrypt: cada una con su sal, nunca en claro (✓ prueba).
  - Mínimo 12 caracteres.
  - Se rechazan las muy repetitivas, las que contienen el correo y las obvias.
- **Doble factor** (código de 6 cifras de una app de autenticación):
  - Obligatorio para dirección; no se entra al panel sin él (✓ prueba).
  - Opcional para entidades.
  - El secreto se guarda **cifrado** con la clave del servidor (✓ prueba).
  - Un código no vale dos veces.
- **Intentos fallidos**: con 5 seguidos, la cuenta se bloquea 15 minutos (✓ prueba). Además hay un límite por conexión.
  - Mismo mensaje si el correo no existe o si la contraseña está mal, para no revelar qué correos tienen cuenta (✓ prueba).
  - «He olvidado mi contraseña» responde siempre igual (✓ prueba).
- **Sesiones**:
  - Cookie `HttpOnly`, `SameSite=Strict` y, en producción, `Secure` con prefijo `__Host-` (✓ prueba).
  - En la base de datos solo se guarda la huella de la sesión, no la sesión.
  - Dirección: 12 h como máximo y se cierra tras 2 h sin uso. Entidades: 30 días.
  - Cerrar sesión la invalida en el servidor (✓ prueba).
  - Cambiar la contraseña o activar el doble factor cierra las demás sesiones abiertas.
  - Suspender una entidad la echa al momento (✓ prueba).
- **Enlaces por correo** (confirmar correo, poner contraseña):
  - Son de un solo uso (✓ prueba) y caducan: 48 h para confirmar, 1 h para cambiar la contraseña, 24 h para las cuentas nuevas de dirección.
  - Van en la parte del enlace que no llega a los servidores.
- Las **cuentas de dirección** solo se crean desde la consola del servidor, no desde la web.

## Permisos

- Cada entidad solo ve y toca sus eventos. Si pide uno ajeno, recibe «no existe», sin pistas (✓ prueba).
- Una entidad no entra en el panel de dirección (✓ prueba).
- Solo una entidad verificada puede mandar eventos a revisión (✓ prueba).
- La agenda pública solo muestra lo publicado, sin datos internos como motivos, notas o estados (✓ prueba).

## Ataques desde otras webs

- Toda escritura exige JSON y una cabecera propia que un formulario de otra web no puede poner, y se rechaza si viene de otro origen (✓ prueba).
- Cabeceras de seguridad en todas las respuestas:
  - Política de contenido estricta (CSP), que solo deja cargar lo propio.
  - Prohibido mostrar el panel dentro de otra web.
  - Sin adivinar tipos de archivo.
  - HSTS en producción (✓ prueba).
- La lectura pública de la agenda está abierta a cualquier origen, pero sin cookies (✓ prueba).

## Datos que llegan

- Todo se valida en el servidor:
  - Longitudes máximas y campos permitidos: lo que sobra se rechaza.
  - Fechas coherentes; un evento ya terminado no se manda a revisión.
  - El lugar tiene que estar a menos de 35 km de Valverde.
  - Los enlaces solo pueden ser `http(s)` (✓ prueba).
- Límite de tamaño de las peticiones. Límite de altas y de envíos por hora.
- Consultas a la base de datos siempre con parámetros: no se puede inyectar SQL.
- React escapa todo el texto: lo que escribe una entidad no se puede ejecutar como código.

## Registro de actividad

Cada entrada, intento fallido, alta, aprobación, rechazo y cambio queda apuntado con fecha, persona e IP. Dirección lo ve en el panel («Actividad»), con las alertas resaltadas, y no se puede borrar desde la web.

## Secretos

- `.env` contiene `VC_CLAVE`, la clave que cifra los secretos del doble factor. En local se crea sola. En producción la pone quien despliega y **nunca** se genera sola. Si se pierde, hay que reiniciar el doble factor de todos con `npm run admin -- quitar-2fa`.
- `.env` y `servidor/datos/` están fuera del repositorio.

## Pendiente para producción (fase 5)

- HTTPS obligatorio y servidor detrás de un proxy (`VC_PROXY=1` para leer bien las IP).
- Copias automáticas cifradas fuera del servidor, y probar a restaurarlas.
- Proveedor de correo con SPF/DKIM para que los avisos no caigan en spam.
- Actualizaciones del sistema y de dependencias. `npm audit` hoy solo avisa de dependencias de la compilación de la app (vite-plugin-pwa), no del servidor.
- Avisos si el servidor se cae y revisión periódica del registro.
- Subida de archivos (fase 2): tamaño máximo, volver a codificar las imágenes, quitar la ubicación de las fotos y guardarlas fuera de la carpeta pública.
