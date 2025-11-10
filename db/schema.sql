-- Schema para TP_Canchas (SQLite)
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS tipo_cancha (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    descripcion TEXT
);

CREATE TABLE IF NOT EXISTS estado (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS servicio (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    precio REAL NOT NULL,
    descripcion TEXT
);

CREATE TABLE IF NOT EXISTS cancha (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    tipo_cancha_id INTEGER NOT NULL,
    estado_id INTEGER,
    precio_por_hora REAL,
    FOREIGN KEY(tipo_cancha_id) REFERENCES tipo_cancha(id),
    FOREIGN KEY(estado_id) REFERENCES estado(id)
);

CREATE TABLE IF NOT EXISTS cancha_x_servicio (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cancha_id INTEGER NOT NULL,
    servicio_id INTEGER NOT NULL,
    precio REAL,
    FOREIGN KEY(cancha_id) REFERENCES cancha(id),
    FOREIGN KEY(servicio_id) REFERENCES servicio(id)
);

CREATE TABLE IF NOT EXISTS horario (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cancha_id INTEGER NOT NULL,
    dia_semana INTEGER NOT NULL, -- 0=domingo .. 6=sabado
    inicio TEXT NOT NULL, -- 'HH:MM'
    fin TEXT NOT NULL,
    FOREIGN KEY(cancha_id) REFERENCES cancha(id)
);

CREATE TABLE IF NOT EXISTS cliente (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dni TEXT UNIQUE,
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    email TEXT,
    telefono TEXT
);

CREATE TABLE IF NOT EXISTS reserva (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cancha_id INTEGER NOT NULL,
    cliente_id INTEGER NOT NULL,
    inicio TEXT NOT NULL, -- ISO datetime
    fin TEXT NOT NULL,    -- ISO datetime
    precio REAL NOT NULL,
    estado_id INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(cancha_id) REFERENCES cancha(id),
    FOREIGN KEY(cliente_id) REFERENCES cliente(id),
    FOREIGN KEY(estado_id) REFERENCES estado(id)
);

CREATE TABLE IF NOT EXISTS metodo_pago (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pago (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reserva_id INTEGER NOT NULL,
    metodo_pago_id INTEGER NOT NULL,
    monto REAL NOT NULL,
    fecha TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(reserva_id) REFERENCES reserva(id),
    FOREIGN KEY(metodo_pago_id) REFERENCES metodo_pago(id)
);

CREATE TABLE IF NOT EXISTS torneo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    fecha_inicio TEXT,
    fecha_fin TEXT,
    descripcion TEXT
);
