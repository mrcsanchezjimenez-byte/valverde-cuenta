/**
 * Cambios de la base de datos, en orden. Nunca se edita una migración ya aplicada:
 * se añade una nueva al final. La versión aplicada se guarda en PRAGMA user_version.
 */
export const MIGRACIONES: string[] = [
  /* 1 · Cuentas, entidades, municipios, eventos y registro de actividad */ `
  CREATE TABLE municipios (
    id INTEGER PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    activo INTEGER NOT NULL DEFAULT 1,
    es_valverde INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE entidades (
    id INTEGER PRIMARY KEY,
    nombre TEXT NOT NULL,
    tipo TEXT NOT NULL,
    -- Vacío solo en la entidad interna de dirección.
    cif TEXT UNIQUE,
    municipio_id INTEGER NOT NULL REFERENCES municipios(id),
    persona_contacto TEXT NOT NULL DEFAULT '',
    telefono TEXT NOT NULL DEFAULT '',
    web TEXT NOT NULL DEFAULT '',
    estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','verificada','rechazada','suspendida')),
    motivo TEXT,
    -- Nota que solo ve dirección.
    nota TEXT NOT NULL DEFAULT '',
    interna INTEGER NOT NULL DEFAULT 0,
    creado TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    revisado TEXT,
    revisado_por INTEGER
  );

  CREATE TABLE usuarios (
    id INTEGER PRIMARY KEY,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    nombre TEXT NOT NULL,
    rol TEXT NOT NULL CHECK (rol IN ('direccion','entidad')),
    entidad_id INTEGER REFERENCES entidades(id),
    hash_clave TEXT,
    email_verificado INTEGER NOT NULL DEFAULT 0,
    totp_secreto TEXT,
    totp_activo INTEGER NOT NULL DEFAULT 0,
    totp_ultimo_paso INTEGER NOT NULL DEFAULT 0,
    activo INTEGER NOT NULL DEFAULT 1,
    fallos INTEGER NOT NULL DEFAULT 0,
    bloqueado_hasta TEXT,
    creado TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    ultimo_acceso TEXT,
    CHECK ((rol = 'entidad') = (entidad_id IS NOT NULL))
  );

  CREATE TABLE sesiones (
    hash TEXT PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    segundo_factor INTEGER NOT NULL DEFAULT 0,
    intentos_codigo INTEGER NOT NULL DEFAULT 0,
    creada TEXT NOT NULL,
    caduca TEXT NOT NULL,
    ultimo_uso TEXT NOT NULL,
    ip TEXT NOT NULL DEFAULT '',
    agente TEXT NOT NULL DEFAULT ''
  );
  CREATE INDEX sesiones_usuario ON sesiones(usuario_id);

  -- Enlaces de un solo uso que van por correo (verificar correo, poner contraseña).
  CREATE TABLE fichas (
    hash TEXT PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('verificar','clave')),
    caduca TEXT NOT NULL
  );

  CREATE TABLE eventos (
    id INTEGER PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    entidad_id INTEGER NOT NULL REFERENCES entidades(id),
    estado TEXT NOT NULL CHECK (estado IN ('borrador','pendiente','publicado','rechazado','cancelado','retirado')),
    titulo TEXT NOT NULL,
    resumen TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    inicio TEXT NOT NULL,
    fin TEXT NOT NULL,
    lugar TEXT NOT NULL,
    municipio_id INTEGER NOT NULL REFERENCES municipios(id),
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    precio_centimos INTEGER,
    publico TEXT NOT NULL,
    categoria TEXT NOT NULL,
    para_ninos INTEGER NOT NULL DEFAULT 0,
    enlace TEXT NOT NULL DEFAULT '',
    escena TEXT NOT NULL,
    enlaza_yincana INTEGER NOT NULL DEFAULT 0,
    organizador TEXT,
    motivo TEXT,
    cambios TEXT,
    creado TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    actualizado TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    enviado TEXT,
    revisado TEXT,
    revisado_por INTEGER
  );
  CREATE INDEX eventos_estado_fin ON eventos(estado, fin);
  CREATE INDEX eventos_entidad ON eventos(entidad_id);

  -- Quién hizo qué y cuándo. Nunca se borra desde la aplicación.
  CREATE TABLE registro (
    id INTEGER PRIMARY KEY,
    fecha TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    usuario_id INTEGER,
    accion TEXT NOT NULL,
    objeto TEXT NOT NULL DEFAULT '',
    detalle TEXT NOT NULL DEFAULT '',
    ip TEXT NOT NULL DEFAULT ''
  );
  CREATE INDEX registro_fecha ON registro(fecha);

  -- Propuesta inicial: pueblos a unos 20 km de Valverde. Dirección los activa o desactiva desde el panel.
  INSERT INTO municipios (nombre, lat, lng, activo, es_valverde) VALUES
    ('Valverde del Camino', 37.5752, -6.7520, 1, 1),
    ('Zalamea la Real', 37.6794, -6.6606, 1, 0),
    ('Calañas', 37.6545, -6.8786, 1, 0),
    ('Beas', 37.4255, -6.7916, 1, 0),
    ('El Campillo', 37.6544, -6.5967, 1, 0),
    ('Minas de Riotinto', 37.6935, -6.5958, 1, 0),
    ('Berrocal', 37.6075, -6.5408, 1, 0),
    ('Nerva', 37.6942, -6.5494, 0, 0),
    ('Trigueros', 37.3858, -6.8267, 0, 0),
    ('Niebla', 37.3611, -6.6778, 0, 0),
    ('Villanueva de las Cruces', 37.6278, -7.0236, 0, 0),
    ('El Cerro de Andévalo', 37.7333, -6.9472, 0, 0);

  -- Entidad interna: los eventos que mete dirección a mano (carteles, avisos del Ayuntamiento...).
  INSERT INTO entidades (nombre, tipo, municipio_id, estado, interna)
    VALUES ('Valverde Cuenta', 'otra', 1, 'verificada', 1);
  `,

  /* 2 · Historias del pueblo, lugares con QR y archivos (fotos y audios) */ `
  -- Un lugar es donde va una placa con QR. El slug no cambia nunca: está impreso en la placa.
  CREATE TABLE lugares (
    id INTEGER PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    descripcion TEXT NOT NULL DEFAULT '',
    direccion TEXT NOT NULL DEFAULT '',
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    -- Quién tiene la placa: Ayuntamiento, un comercio, una parroquia…
    anfitrion TEXT NOT NULL DEFAULT '',
    activo INTEGER NOT NULL DEFAULT 1,
    creado TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
  );

  CREATE TABLE historias (
    id INTEGER PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    estado TEXT NOT NULL CHECK (estado IN ('pendiente','publicada','rechazada','retirada')),
    origen TEXT NOT NULL CHECK (origen IN ('web','entrevista')),
    titulo TEXT NOT NULL,
    texto TEXT NOT NULL DEFAULT '',
    epoca TEXT NOT NULL DEFAULT '',
    lugar_id INTEGER REFERENCES lugares(id),
    -- Si no es uno de los lugares con placa: dónde dice quien la cuenta que pasó.
    lugar_texto TEXT NOT NULL DEFAULT '',
    -- Cómo se firma en público: con nombre o como «un vecino o vecina».
    firma TEXT NOT NULL CHECK (firma IN ('nombre','anonimo')),
    autor TEXT NOT NULL DEFAULT '',
    -- Datos de contacto: solo los ve dirección, nunca se publican.
    contacto_nombre TEXT NOT NULL DEFAULT '',
    contacto_email TEXT NOT NULL DEFAULT '',
    contacto_telefono TEXT NOT NULL DEFAULT '',
    -- Qué aceptó, cuándo y con qué versión del texto legal (JSON).
    consentimiento TEXT NOT NULL,
    motivo TEXT,
    nota TEXT NOT NULL DEFAULT '',
    creado TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    actualizado TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    revisado TEXT,
    revisado_por INTEGER
  );
  CREATE INDEX historias_estado ON historias(estado);
  CREATE INDEX historias_lugar ON historias(lugar_id);

  -- Los archivos están en disco con un nombre aleatorio (clave), fuera de cualquier carpeta pública.
  CREATE TABLE archivos (
    id INTEGER PRIMARY KEY,
    clave TEXT NOT NULL UNIQUE,
    historia_id INTEGER NOT NULL REFERENCES historias(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('foto','audio')),
    mime TEXT NOT NULL,
    bytes INTEGER NOT NULL,
    publicar INTEGER NOT NULL DEFAULT 1,
    pie TEXT NOT NULL DEFAULT '',
    orden INTEGER NOT NULL DEFAULT 0,
    creado TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
  );
  CREATE INDEX archivos_historia ON archivos(historia_id);

  -- Escaneos de cada placa por día. Sin IP ni nada que identifique a quien escanea.
  CREATE TABLE escaneos (
    lugar_id INTEGER NOT NULL REFERENCES lugares(id) ON DELETE CASCADE,
    dia TEXT NOT NULL,
    cuenta INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (lugar_id, dia)
  );
  `,

  /* 3 · Cartel de cada evento y avisos para las entidades dentro de su panel */ `
  -- Imágenes subidas para los eventos (carteles). Quien la sube es su dueño: nadie más puede usarla.
  CREATE TABLE imagenes (
    clave TEXT PRIMARY KEY,
    entidad_id INTEGER REFERENCES entidades(id),
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    mime TEXT NOT NULL,
    bytes INTEGER NOT NULL,
    creado TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
  );
  ALTER TABLE eventos ADD COLUMN imagen TEXT REFERENCES imagenes(clave);

  -- Lo que le pasa a una entidad (publicado, no publicado, verificada…) también le queda en su panel.
  CREATE TABLE avisos (
    id INTEGER PRIMARY KEY,
    entidad_id INTEGER NOT NULL REFERENCES entidades(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('bien','mal','info')),
    titulo TEXT NOT NULL,
    texto TEXT NOT NULL DEFAULT '',
    evento_id INTEGER REFERENCES eventos(id) ON DELETE SET NULL,
    leido INTEGER NOT NULL DEFAULT 0,
    creado TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
  );
  CREATE INDEX avisos_entidad ON avisos(entidad_id, leido);
  `,

  /* 4 · Inscripciones: la entidad decide si hay que apuntarse y cuántas plazas hay */ `
  ALTER TABLE eventos ADD COLUMN inscripcion INTEGER NOT NULL DEFAULT 0;
  -- NULL: sin límite.
  ALTER TABLE eventos ADD COLUMN plazas INTEGER;
  ALTER TABLE eventos ADD COLUMN inscripcion_hasta TEXT;

  -- Datos personales: los ve la entidad que organiza y se borran un mes después del evento.
  CREATE TABLE inscripciones (
    id INTEGER PRIMARY KEY,
    evento_id INTEGER NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
    -- Código secreto de quien se apunta, para consultar o cancelar sin cuenta. Solo se guarda su huella.
    codigo_hash TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    email TEXT NOT NULL DEFAULT '',
    telefono TEXT NOT NULL DEFAULT '',
    personas INTEGER NOT NULL CHECK (personas BETWEEN 1 AND 20),
    estado TEXT NOT NULL CHECK (estado IN ('confirmada','espera','cancelada')),
    creado TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    cancelado TEXT
  );
  CREATE INDEX inscripciones_evento ON inscripciones(evento_id, estado);
  `,

  /* 5 · Fotos de cómo fue cada evento: las sube la entidad y dirección las aprueba una a una */ `
  CREATE TABLE fotos_evento (
    id INTEGER PRIMARY KEY,
    evento_id INTEGER NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
    imagen TEXT NOT NULL UNIQUE REFERENCES imagenes(clave),
    pie TEXT NOT NULL DEFAULT '',
    estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','publicada','rechazada')),
    creado TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    revisado TEXT,
    revisado_por INTEGER
  );
  CREATE INDEX fotos_evento_evento ON fotos_evento(evento_id, estado);
  `,

  /* 6 · Comercios: guía, cuentas propias, planes de pago, campañas, ofertas y visitas */ `
  CREATE TABLE comercios (
    id INTEGER PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    categoria TEXT NOT NULL,
    -- CIF, DNI o NIE. Vacío si lo da de alta dirección sin tenerlo aún.
    nif TEXT UNIQUE,
    descripcion TEXT NOT NULL DEFAULT '',
    direccion TEXT NOT NULL DEFAULT '',
    municipio_id INTEGER NOT NULL REFERENCES municipios(id),
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    telefono TEXT NOT NULL DEFAULT '',
    whatsapp TEXT NOT NULL DEFAULT '',
    email_publico TEXT NOT NULL DEFAULT '',
    web TEXT NOT NULL DEFAULT '',
    instagram TEXT NOT NULL DEFAULT '',
    facebook TEXT NOT NULL DEFAULT '',
    horario TEXT NOT NULL DEFAULT '',
    logo TEXT,
    fotos TEXT NOT NULL DEFAULT '[]',
    -- Contacto privado (para dirección).
    persona_contacto TEXT NOT NULL DEFAULT '',
    telefono_contacto TEXT NOT NULL DEFAULT '',
    estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','verificado','rechazado','suspendido')),
    motivo TEXT,
    nota TEXT NOT NULL DEFAULT '',
    -- Cambios propuestos por el comercio en su ficha, a la espera de revisión (JSON).
    cambios TEXT,
    creado TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    revisado TEXT,
    revisado_por INTEGER
  );

  -- Usuarios: se rehace la tabla para admitir cuentas de comercio.
  CREATE TABLE usuarios_nueva (
    id INTEGER PRIMARY KEY,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    nombre TEXT NOT NULL,
    rol TEXT NOT NULL CHECK (rol IN ('direccion','entidad','comercio')),
    entidad_id INTEGER REFERENCES entidades(id),
    comercio_id INTEGER REFERENCES comercios(id),
    hash_clave TEXT,
    email_verificado INTEGER NOT NULL DEFAULT 0,
    totp_secreto TEXT,
    totp_activo INTEGER NOT NULL DEFAULT 0,
    totp_ultimo_paso INTEGER NOT NULL DEFAULT 0,
    activo INTEGER NOT NULL DEFAULT 1,
    fallos INTEGER NOT NULL DEFAULT 0,
    bloqueado_hasta TEXT,
    creado TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    ultimo_acceso TEXT,
    CHECK ((rol = 'entidad') = (entidad_id IS NOT NULL)),
    CHECK ((rol = 'comercio') = (comercio_id IS NOT NULL))
  );
  INSERT INTO usuarios_nueva (id, email, nombre, rol, entidad_id, hash_clave, email_verificado, totp_secreto, totp_activo,
      totp_ultimo_paso, activo, fallos, bloqueado_hasta, creado, ultimo_acceso)
    SELECT id, email, nombre, rol, entidad_id, hash_clave, email_verificado, totp_secreto, totp_activo,
      totp_ultimo_paso, activo, fallos, bloqueado_hasta, creado, ultimo_acceso FROM usuarios;
  DROP TABLE usuarios;
  ALTER TABLE usuarios_nueva RENAME TO usuarios;

  ALTER TABLE imagenes ADD COLUMN comercio_id INTEGER REFERENCES comercios(id);

  CREATE TABLE campanas (
    id INTEGER PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    descripcion TEXT NOT NULL DEFAULT '',
    desde TEXT NOT NULL,
    hasta TEXT NOT NULL,
    activa INTEGER NOT NULL DEFAULT 1,
    creado TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
  );

  -- Cada periodo contratado por un comercio. Se apunta a mano lo que se cobra fuera de la app.
  CREATE TABLE planes (
    id INTEGER PRIMARY KEY,
    comercio_id INTEGER NOT NULL REFERENCES comercios(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('escaparate','destacado','campana','promocion','patrocinio')),
    campana_id INTEGER REFERENCES campanas(id),
    desde TEXT NOT NULL,
    hasta TEXT NOT NULL,
    importe_centimos INTEGER NOT NULL DEFAULT 0,
    estado_pago TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado_pago IN ('pendiente','pagado','anulado')),
    metodo TEXT NOT NULL DEFAULT '',
    factura TEXT NOT NULL DEFAULT '',
    pagado_el TEXT,
    nota TEXT NOT NULL DEFAULT '',
    creado TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    creado_por INTEGER
  );
  CREATE INDEX planes_comercio ON planes(comercio_id, hasta);

  CREATE TABLE ofertas (
    id INTEGER PRIMARY KEY,
    comercio_id INTEGER NOT NULL REFERENCES comercios(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    texto TEXT NOT NULL DEFAULT '',
    imagen TEXT,
    desde TEXT NOT NULL,
    hasta TEXT NOT NULL,
    campana_id INTEGER REFERENCES campanas(id),
    estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','publicada','rechazada','retirada')),
    motivo TEXT,
    creado TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    revisado TEXT,
    revisado_por INTEGER
  );
  CREATE INDEX ofertas_comercio ON ofertas(comercio_id, estado);

  -- Visitas a la ficha de cada comercio por día, sin nada de quien la visita.
  CREATE TABLE visitas_comercio (
    comercio_id INTEGER NOT NULL REFERENCES comercios(id) ON DELETE CASCADE,
    dia TEXT NOT NULL,
    cuenta INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (comercio_id, dia)
  );

  CREATE TABLE avisos_comercio (
    id INTEGER PRIMARY KEY,
    comercio_id INTEGER NOT NULL REFERENCES comercios(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('bien','mal','info')),
    titulo TEXT NOT NULL,
    texto TEXT NOT NULL DEFAULT '',
    leido INTEGER NOT NULL DEFAULT 0,
    creado TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
  );

  -- Primeras campañas propuestas (se cambian desde el panel).
  INSERT INTO campanas (slug, nombre, descripcion, desde, hasta) VALUES
    ('navidad-2026', 'Navidad y Reyes', 'Regalos, dulces y todo lo de estas fiestas, en los comercios del pueblo.', '2026-12-01', '2027-01-06'),
    ('rebajas-invierno-2027', 'Rebajas de invierno', 'Las rebajas de los comercios de Valverde y alrededores.', '2027-01-07', '2027-02-15');
  `,
]
