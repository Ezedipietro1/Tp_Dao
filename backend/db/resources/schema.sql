-- Schema para TP_Canchas (SQLite)
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS tipo_cancha (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    precio FLOAT NOT NULL
);

CREATE TABLE IF NOT EXISTS estado (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS servicio (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    precio REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS cancha (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo_cancha_id INTEGER NOT NULL,
    precio_final FLOAT,
    FOREIGN KEY(tipo_cancha_id) REFERENCES tipo_cancha(id)
);

CREATE TABLE cancha_x_servicio (
    cancha_id INTEGER,
    servicio_id INTEGER,
    PRIMARY KEY (cancha_id, servicio_id),
    FOREIGN KEY(cancha_id) REFERENCES cancha(id),
    FOREIGN KEY(servicio_id) REFERENCES servicio(id)
);

CREATE TABLE IF NOT EXISTS reserva_x_horario (
    reserva_id INTEGER,
    horario_id INTEGER,
    PRIMARY KEY (reserva_id, horario_id),
    FOREIGN KEY(reserva_id) REFERENCES reserva(id),
    FOREIGN KEY(horario_id) REFERENCES horario(id)
);

CREATE TABLE IF NOT EXISTS horario (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inicio TEXT NOT NULL, -- 'HH:MM'
    fin TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cliente (
    dni INTEGER PRIMARY KEY NOT NULL,
    nombre TEXT NOT NULL,
    telefono TEXT
);

CREATE TABLE IF NOT EXISTS reserva (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cancha_id INTEGER NOT NULL,
    cliente_dni INTEGER NOT NULL,
    precio_final FLOAT NOT NULL,
    torneo_id INTEGER,
    fecha TEXT NOT NULL, -- 'YYYY-MM-DD'
    FOREIGN KEY(cancha_id) REFERENCES cancha(id),
    FOREIGN KEY(cliente_dni) REFERENCES cliente(dni),
    FOREIGN KEY(torneo_id) REFERENCES torneo(id)
);

CREATE TABLE IF NOT EXISTS metodo_pago (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pago (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reserva_id INTEGER NOT NULL,
    metodo_pago_id INTEGER NOT NULL,
    monto FLOAT NOT NULL,
    fecha TEXT DEFAULT (datetime('now')),
    estado_id INTEGER NOT NULL,
    FOREIGN KEY(reserva_id) REFERENCES reserva(id),
    FOREIGN KEY(metodo_pago_id) REFERENCES metodo_pago(id),
    FOREIGN KEY(estado_id) REFERENCES estado(id)
);

CREATE TABLE IF NOT EXISTS torneo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha_inicio TEXT
);
