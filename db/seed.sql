-- Seed mínimo para TP_Canchas
BEGIN TRANSACTION;

INSERT INTO estado (id, nombre) VALUES (1, 'activa');
INSERT INTO estado (id, nombre) VALUES (2, 'cancelada');

INSERT INTO tipo_cancha (nombre, descripcion) VALUES ('Futbol 5', 'Cancha pequeña, césped sintético');
INSERT INTO tipo_cancha (nombre, descripcion) VALUES ('Futbol 11', 'Cancha grande, césped natural');

INSERT INTO servicio (nombre, precio, descripcion) VALUES ('Arbitraje', 100.0, 'Servicio de árbitro por partido');
INSERT INTO servicio (nombre, precio, descripcion) VALUES ('Luz', 50.0, 'Uso de iluminación por hora');

INSERT INTO cancha (nombre, tipo_cancha_id, estado_id, precio_por_hora) VALUES ('Cancha A', 1, 1, 200.0);
INSERT INTO cancha (nombre, tipo_cancha_id, estado_id, precio_por_hora) VALUES ('Cancha B', 2, 1, 400.0);

INSERT INTO cancha_x_servicio (cancha_id, servicio_id, precio) VALUES (1, 1, 120.0);
INSERT INTO cancha_x_servicio (cancha_id, servicio_id, precio) VALUES (1, 2, 60.0);

-- Horarios por hora (turnos de 1 hora) para cada cancha y cada día de la semana
-- Generamos franjas desde 09:00 (9) hasta 23:00 (inclusive) donde cada turno es [H, H+1)
-- cancha_id 1 y 2, dia_semana 0=domingo .. 6=sabado

-- Cancha 1
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 0, '09:00', '10:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 0, '10:00', '11:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 0, '11:00', '12:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 0, '12:00', '13:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 0, '13:00', '14:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 0, '14:00', '15:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 0, '15:00', '16:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 0, '16:00', '17:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 0, '17:00', '18:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 0, '18:00', '19:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 0, '19:00', '20:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 0, '20:00', '21:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 0, '21:00', '22:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 0, '22:00', '23:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 0, '23:00', '00:00');

INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 1, '09:00', '10:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 1, '10:00', '11:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 1, '11:00', '12:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 1, '12:00', '13:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 1, '13:00', '14:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 1, '14:00', '15:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 1, '15:00', '16:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 1, '16:00', '17:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 1, '17:00', '18:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 1, '18:00', '19:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 1, '19:00', '20:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 1, '20:00', '21:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 1, '21:00', '22:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 1, '22:00', '23:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 1, '23:00', '00:00');

INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 2, '09:00', '10:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 2, '10:00', '11:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 2, '11:00', '12:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 2, '12:00', '13:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 2, '13:00', '14:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 2, '14:00', '15:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 2, '15:00', '16:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 2, '16:00', '17:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 2, '17:00', '18:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 2, '18:00', '19:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 2, '19:00', '20:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 2, '20:00', '21:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 2, '21:00', '22:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 2, '22:00', '23:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 2, '23:00', '00:00');

INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 3, '09:00', '10:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 3, '10:00', '11:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 3, '11:00', '12:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 3, '12:00', '13:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 3, '13:00', '14:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 3, '14:00', '15:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 3, '15:00', '16:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 3, '16:00', '17:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 3, '17:00', '18:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 3, '18:00', '19:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 3, '19:00', '20:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 3, '20:00', '21:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 3, '21:00', '22:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 3, '22:00', '23:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 3, '23:00', '00:00');

INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 4, '09:00', '10:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 4, '10:00', '11:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 4, '11:00', '12:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 4, '12:00', '13:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 4, '13:00', '14:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 4, '14:00', '15:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 4, '15:00', '16:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 4, '16:00', '17:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 4, '17:00', '18:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 4, '18:00', '19:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 4, '19:00', '20:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 4, '20:00', '21:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 4, '21:00', '22:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 4, '22:00', '23:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 4, '23:00', '00:00');

INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 5, '09:00', '10:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 5, '10:00', '11:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 5, '11:00', '12:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 5, '12:00', '13:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 5, '13:00', '14:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 5, '14:00', '15:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 5, '15:00', '16:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 5, '16:00', '17:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 5, '17:00', '18:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 5, '18:00', '19:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 5, '19:00', '20:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 5, '20:00', '21:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 5, '21:00', '22:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 5, '22:00', '23:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 5, '23:00', '00:00');

INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 6, '09:00', '10:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 6, '10:00', '11:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 6, '11:00', '12:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 6, '12:00', '13:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 6, '13:00', '14:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 6, '14:00', '15:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 6, '15:00', '16:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 6, '16:00', '17:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 6, '17:00', '18:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 6, '18:00', '19:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 6, '19:00', '20:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 6, '20:00', '21:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 6, '21:00', '22:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 6, '22:00', '23:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 6, '23:00', '00:00');

-- Cancha 2
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 0, '09:00', '10:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 0, '10:00', '11:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 0, '11:00', '12:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 0, '12:00', '13:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 0, '13:00', '14:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 0, '14:00', '15:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 0, '15:00', '16:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 0, '16:00', '17:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 0, '17:00', '18:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 0, '18:00', '19:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 0, '19:00', '20:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 0, '20:00', '21:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 0, '21:00', '22:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 0, '22:00', '23:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 0, '23:00', '00:00');

INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 1, '09:00', '10:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 1, '10:00', '11:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 1, '11:00', '12:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 1, '12:00', '13:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 1, '13:00', '14:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 1, '14:00', '15:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 1, '15:00', '16:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 1, '16:00', '17:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 1, '17:00', '18:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 1, '18:00', '19:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 1, '19:00', '20:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 1, '20:00', '21:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 1, '21:00', '22:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 1, '22:00', '23:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 1, '23:00', '00:00');

INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 2, '09:00', '10:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 2, '10:00', '11:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 2, '11:00', '12:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 2, '12:00', '13:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 2, '13:00', '14:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 2, '14:00', '15:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 2, '15:00', '16:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 2, '16:00', '17:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 2, '17:00', '18:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 2, '18:00', '19:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 2, '19:00', '20:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 2, '20:00', '21:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 2, '21:00', '22:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 2, '22:00', '23:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 2, '23:00', '00:00');

INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 3, '09:00', '10:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 3, '10:00', '11:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 3, '11:00', '12:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 3, '12:00', '13:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 3, '13:00', '14:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 3, '14:00', '15:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 3, '15:00', '16:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 3, '16:00', '17:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 3, '17:00', '18:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 3, '18:00', '19:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 3, '19:00', '20:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 3, '20:00', '21:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 3, '21:00', '22:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 3, '22:00', '23:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 3, '23:00', '00:00');

INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 4, '09:00', '10:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 4, '10:00', '11:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 4, '11:00', '12:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 4, '12:00', '13:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 4, '13:00', '14:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 4, '14:00', '15:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 4, '15:00', '16:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 4, '16:00', '17:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 4, '17:00', '18:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 4, '18:00', '19:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 4, '19:00', '20:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 4, '20:00', '21:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 4, '21:00', '22:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 4, '22:00', '23:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 4, '23:00', '00:00');

INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 5, '09:00', '10:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 5, '10:00', '11:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 5, '11:00', '12:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 5, '12:00', '13:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 5, '13:00', '14:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 5, '14:00', '15:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 5, '15:00', '16:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 5, '16:00', '17:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 5, '17:00', '18:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 5, '18:00', '19:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 5, '19:00', '20:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 5, '20:00', '21:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 5, '21:00', '22:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 5, '22:00', '23:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 5, '23:00', '00:00');

INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 6, '09:00', '10:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 6, '10:00', '11:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 6, '11:00', '12:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 6, '12:00', '13:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 6, '13:00', '14:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 6, '14:00', '15:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 6, '15:00', '16:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 6, '16:00', '17:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 6, '17:00', '18:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 6, '18:00', '19:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 6, '19:00', '20:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 6, '20:00', '21:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 6, '21:00', '22:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 6, '22:00', '23:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 6, '23:00', '00:00');

INSERT INTO cliente (dni, nombre, apellido, email, telefono) VALUES ('12345678','Juan', 'Perez', 'juan.perez@example.com', '12345678');

INSERT INTO metodo_pago (nombre) VALUES ('Efectivo');
INSERT INTO metodo_pago (nombre) VALUES ('Tarjeta');

-- Una reserva de ejemplo (inicio/fin en formato ISO)
INSERT INTO reserva (cancha_id, cliente_id, inicio, fin, precio, estado_id) VALUES (1, 1, '2025-11-15T18:00:00', '2025-11-15T19:00:00', 200.0, 1);

-- Pago ejemplo
INSERT INTO pago (reserva_id, metodo_pago_id, monto) VALUES (1, 1, 200.0);

COMMIT;
