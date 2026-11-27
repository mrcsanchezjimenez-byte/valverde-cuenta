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
]
