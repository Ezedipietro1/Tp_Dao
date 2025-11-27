-- ============================================================
-- POBLAR BD TP_Canchas
-- ============================================================

PRAGMA foreign_keys = ON;

-- ----------------------------
-- TABLA: tipo_cancha
-- ----------------------------
INSERT INTO tipo_cancha (nombre, precio)
VALUES 
    ('Fútbol 5', 50000),
    ('Fútbol 7', 70000),
    ('Fútbol 11', 110000);

-- ----------------------------
-- TABLA: estado
-- ----------------------------
INSERT INTO estado (nombre)
VALUES 
    ('Pendiente'),
    ('Pagado'),
    ('Cancelado');

-- ----------------------------
-- TABLA: servicio
-- ----------------------------
INSERT INTO servicio (nombre, precio)
VALUES 
    ('Iluminación nocturna', 10000),
    ('Pecheras', 7000),
    ('Arbitraje', 15000);

-- ----------------------------
-- TABLA: cancha
-- ----------------------------
INSERT INTO cancha (tipo_cancha_id, precio_final)
VALUES
    (1, 82000),
    (1, 60000),
    (2, 92000),
    (3, 127000);

-- ----------------------------
-- TABLA: cancha_x_servicio
-- (Relación muchos a muchos)
-- ----------------------------
INSERT INTO cancha_x_servicio (cancha_id, servicio_id)
VALUES
    (1, 1),
    (1, 2),
    (1, 3),
    (2, 1),
    (3, 3),
    (3, 2),
    (4, 2),
    (4, 1);

-- ----------------------------
-- TABLA: horario
-- ----------------------------
INSERT INTO horario (inicio, fin)
VALUES
    ('09:00', '10:00'),
    ('10:00', '11:00'),
    ('11:00', '12:00'),
    ('12:00', '13:00'),
    ('13:00', '14:00'),
    ('14:00', '15:00'),
    ('15:00', '16:00'),
    ('16:00', '17:00'),
    ('17:00', '18:00'),
    ('18:00', '19:00'),
    ('19:00', '20:00'),
    ('20:00', '21:00'),
    ('21:00', '22:00'),
    ('22:00', '23:00'),
    ('23:00', '00:00');

-- ----------------------------
-- TABLA: cliente
-- ----------------------------
INSERT INTO cliente (dni, nombre, telefono)
VALUES
    (12345678, 'Juan Pérez', '1122334455'),
    (23456789, 'María Gómez', '1133445566'),
    (34567890, 'Carlos López', '1144556677'),
    (45678901, 'Lucía Fernández', '1155667788');

-- ----------------------------
-- TABLA: torneo
-- ----------------------------
INSERT INTO torneo (fecha_inicio)
VALUES
    ('2025-01-15'),
    ('2025-02-10');

-- ----------------------------
-- TABLA: reserva
-- ----------------------------
INSERT INTO reserva (cancha_id, cliente_dni, precio_final, fecha, torneo_id)
VALUES
    (1, 12345678, 164000, '2025-11-15', NULL),
    (3, 23456789, 184000, '2025-11-13', 1),
    (4, 34567890, 127000, '2025-11-20', NULL),
    (2, 45678901, 60000, '2025-11-15', 2);

-- ----------------------------
-- TABLA: reserva_x_horario
-- ----------------------------
INSERT INTO reserva_x_horario (reserva_id, horario_id)
VALUES
    (1, 5),
    (1, 6),
    (2, 6),
    (2, 7),
    (3, 3),
    (4, 7);

-- ----------------------------
-- TABLA: metodo_pago
-- ----------------------------
INSERT INTO metodo_pago (nombre)
VALUES
    ('Efectivo'),
    ('Tarjeta de crédito'),
    ('Transferencia'),
    ('Tarjeta de débito');

-- ----------------------------
-- TABLA: pago
-- ----------------------------
INSERT INTO pago (reserva_id, metodo_pago_id, monto, estado_id)
VALUES
    (1, 1, 164000, 2),
    (2, 2, 184000, 2),
    (3, 3, 127000, 2),
    (4, 4, 60000, 1);