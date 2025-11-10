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

INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (1, 1, '18:00', '22:00');
INSERT INTO horario (cancha_id, dia_semana, inicio, fin) VALUES (2, 1, '09:00', '23:00');

INSERT INTO cliente (dni, nombre, apellido, email, telefono) VALUES ('12345678','Juan', 'Perez', 'juan.perez@example.com', '12345678');

INSERT INTO metodo_pago (nombre) VALUES ('Efectivo');
INSERT INTO metodo_pago (nombre) VALUES ('Tarjeta');

-- Una reserva de ejemplo (inicio/fin en formato ISO)
INSERT INTO reserva (cancha_id, cliente_id, inicio, fin, precio, estado_id) VALUES (1, 1, '2025-11-15T18:00:00', '2025-11-15T19:00:00', 200.0, 1);

-- Pago ejemplo
INSERT INTO pago (reserva_id, metodo_pago_id, monto) VALUES (1, 1, 200.0);

COMMIT;
