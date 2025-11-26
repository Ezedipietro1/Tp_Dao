#!/usr/bin/env python3
"""Módulo de generación de reportes en PDF para la aplicación Don Balon.

Contiene funciones para generar varios reportes usando ReportLab y
matplotlib. Cada función recibe la ruta a la base de datos SQLite y la
ruta de salida del PDF.

Ejemplo de uso:
from reportes import reporte_reservas_por_cliente, abrir_pdf
reporte_reservas_por_cliente('db/DonBalon.db', 12345678, 'reservas_cliente.pdf')
abrir_pdf('reservas_cliente.pdf')
"""
from __future__ import annotations

import os
import platform
import sqlite3
import subprocess
import tempfile
from datetime import datetime
from typing import List, Tuple, Optional

import matplotlib.pyplot as plt
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Image as RLImage
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer
from reportlab.platypus.tables import Table, TableStyle


def obtener_conexion(db_path: str) -> sqlite3.Connection:
    """Obtiene una conexión a la base de datos SQLite.

    Args:
        db_path: Ruta al archivo de la base de datos.

    Returns:
        sqlite3.Connection

    Lanza sqlite3.Error si no se puede conectar.
    """
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def abrir_pdf(ruta_pdf: str) -> None:
    """Abre el PDF con el visor por defecto del sistema operativo.

    Args:
        ruta_pdf: Ruta al archivo PDF a abrir.
    """
    if not os.path.exists(ruta_pdf):
        raise FileNotFoundError(f"Archivo no encontrado: {ruta_pdf}")
    system = platform.system()
    try:
        if system == "Windows":
            os.startfile(ruta_pdf)
        elif system == "Darwin":
            subprocess.run(["open", ruta_pdf], check=False)
        else:
            subprocess.run(["xdg-open", ruta_pdf], check=False)
    except Exception:
        # No queremos que falle la generación del PDF solo por abrirlo
        pass


def _estilo_tabla() -> TableStyle:
    """Devuelve un TableStyle estándar usado en los reportes."""
    return TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
        ("BACKGROUND", (0, 1), (-1, -1), colors.beige),
        ("GRID", (0, 0), (-1, -1), 1, colors.black),
    ])


def reporte_reservas_por_cliente(db_path: str, cliente_id: int, ruta_pdf: str) -> None:
    """Genera un PDF con el listado de reservas para un cliente específico.

    Args:
        db_path: Ruta a la base de datos SQLite.
        cliente_id: DNI del cliente (según esquema: cliente.dni).
        ruta_pdf: Ruta de salida del PDF.
    """
    try:
        conn = obtener_conexion(db_path)
    except Exception as e:
        raise RuntimeError(f"No se pudo conectar a la BD: {e}")

    try:
        cur = conn.cursor()
        cur.execute("SELECT dni, nombre, telefono FROM cliente WHERE dni = ?", (cliente_id,))
        cliente = cur.fetchone()
        if not cliente:
            raise ValueError(f"Cliente con DNI {cliente_id} no encontrado")

        # Obtener reservas del cliente
        cur.execute("SELECT id, fecha, cancha_id, precio_final FROM reserva WHERE cliente_dni = ? ORDER BY fecha",
                    (cliente_id,))
        reservas = cur.fetchall()

        # Preparar documento
        doc = SimpleDocTemplate(ruta_pdf, pagesize=letter)
        elements = []
        styles = getSampleStyleSheet()

        elements.append(Paragraph("Listado de reservas por cliente", styles["Title"]))
        cliente_text = f"Cliente: {cliente['nombre']} &nbsp; (DNI: {cliente['dni']})"
        elements.append(Spacer(1, 0.1 * inch))
        elements.append(Paragraph(cliente_text, styles["Normal"]))
        elements.append(Spacer(1, 0.2 * inch))

        if not reservas:
            elements.append(Paragraph("El cliente no tiene reservas registradas.", styles["Normal"]))
            doc.build(elements)
            return

        # Construir tabla: encabezado
        table_data = [["Fecha", "Hora inicio", "Hora fin", "Cancha"]]

        for r in reservas:
            # obtener horarios asociados a la reserva
            cur.execute(
                "SELECT h.inicio AS inicio, h.fin AS fin FROM horario h JOIN reserva_x_horario rx ON h.id = rx.horario_id WHERE rx.reserva_id = ? ORDER BY h.inicio",
                (r["id"],),
            )
            horarios = cur.fetchall()
            cancha_label = f"Cancha {r['cancha_id']}"
            if not horarios:
                table_data.append([r["fecha"], "-", "-", cancha_label])
            else:
                # si hay varios horarios, agregarlos en filas separadas
                first = True
                for h in horarios:
                    if first:
                        table_data.append([r["fecha"], h["inicio"], h["fin"], cancha_label])
                        first = False
                    else:
                        table_data.append(["", h["inicio"], h["fin"], ""])

        table = Table(table_data, colWidths=[1.5 * inch, 1.25 * inch, 1.25 * inch, 2 * inch])
        table.setStyle(_estilo_tabla())
        elements.append(table)
        doc.build(elements)

    finally:
        conn.close()


def reporte_reservas_por_cancha_en_periodo(
    db_path: str,
    cancha_id: int,
    fecha_desde: str,
    fecha_hasta: str,
    ruta_pdf: str,
) -> None:
    """Genera un PDF con las reservas de una cancha en un período de fechas dado.

    Args:
        db_path: Ruta a la BD.
        cancha_id: id de la cancha.
        fecha_desde: 'YYYY-MM-DD'
        fecha_hasta: 'YYYY-MM-DD'
        ruta_pdf: ruta de salida del PDF.
    """
    try:
        conn = obtener_conexion(db_path)
    except Exception as e:
        raise RuntimeError(f"No se pudo conectar a la BD: {e}")

    try:
        cur = conn.cursor()
        # obtener datos de la cancha y su tipo
        cur.execute(
            "SELECT ca.id AS cancha_id, tc.nombre AS tipo_nombre FROM cancha ca LEFT JOIN tipo_cancha tc ON ca.tipo_cancha_id = tc.id WHERE ca.id = ?",
            (cancha_id,),
        )
        cancha = cur.fetchone()
        if not cancha:
            raise ValueError(f"Cancha con id {cancha_id} no encontrada")

        # obtener reservas en el rango
        cur.execute(
            "SELECT r.id, r.fecha, r.cliente_dni, r.precio_final FROM reserva r WHERE r.cancha_id = ? AND r.fecha BETWEEN ? AND ? ORDER BY r.fecha",
            (cancha_id, fecha_desde, fecha_hasta),
        )
        reservas = cur.fetchall()

        doc = SimpleDocTemplate(ruta_pdf, pagesize=letter)
        elements = []
        styles = getSampleStyleSheet()

        elements.append(Paragraph("Reservas por cancha en un período", styles["Title"]))
        elements.append(Spacer(1, 0.1 * inch))
        info = f"Cancha: {cancha['cancha_id']} (Tipo: {cancha['tipo_nombre'] or 'N/D'})"
        elements.append(Paragraph(info, styles["Normal"]))
        rango = f"Período: {fecha_desde} — {fecha_hasta}"
        elements.append(Paragraph(rango, styles["Normal"]))
        elements.append(Spacer(1, 0.2 * inch))

        if not reservas:
            elements.append(Paragraph("No hay reservas para esta cancha en el período indicado.", styles["Normal"]))
            doc.build(elements)
            return

        table_data = [["Fecha", "Hora inicio", "Hora fin", "Cliente"]]
        for r in reservas:
            cur.execute(
                "SELECT h.inicio AS inicio, h.fin AS fin FROM horario h JOIN reserva_x_horario rx ON h.id = rx.horario_id WHERE rx.reserva_id = ? ORDER BY h.inicio",
                (r["id"],),
            )
            horarios = cur.fetchall()
            # obtener nombre de cliente
            cur.execute("SELECT nombre FROM cliente WHERE dni = ?", (r["cliente_dni"],))
            cliente = cur.fetchone()
            cliente_nombre = cliente["nombre"] if cliente else f"DNI {r['cliente_dni']}"

            if not horarios:
                table_data.append([r["fecha"], "-", "-", cliente_nombre])
            else:
                first = True
                for h in horarios:
                    if first:
                        table_data.append([r["fecha"], h["inicio"], h["fin"], cliente_nombre])
                        first = False
                    else:
                        table_data.append(["", h["inicio"], h["fin"], ""])

        table = Table(table_data, colWidths=[1.5 * inch, 1.25 * inch, 1.25 * inch, 2 * inch])
        table.setStyle(_estilo_tabla())
        elements.append(table)
        doc.build(elements)

    finally:
        conn.close()


def reporte_canchas_mas_utilizadas(db_path: str, ruta_pdf: str, limite: int = 10) -> None:
    """Genera un PDF con el ranking de las canchas más utilizadas.

    Args:
        db_path: Ruta a la BD.
        ruta_pdf: Ruta de salida del PDF.
        limite: Cantidad máxima de filas a mostrar.
    """
    try:
        conn = obtener_conexion(db_path)
    except Exception as e:
        raise RuntimeError(f"No se pudo conectar a la BD: {e}")

    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT ca.id AS cancha_id, tc.nombre AS tipo_nombre, COUNT(r.id) AS reservas_count "
            "FROM cancha ca LEFT JOIN tipo_cancha tc ON ca.tipo_cancha_id = tc.id "
            "LEFT JOIN reserva r ON r.cancha_id = ca.id "
            "GROUP BY ca.id ORDER BY reservas_count DESC LIMIT ?",
            (limite,),
        )
        filas = cur.fetchall()

        doc = SimpleDocTemplate(ruta_pdf, pagesize=letter)
        elements = []
        styles = getSampleStyleSheet()
        elements.append(Paragraph("Canchas más utilizadas", styles["Title"]))
        elements.append(Spacer(1, 0.2 * inch))

        if not filas:
            elements.append(Paragraph("No hay datos para generar el ranking.", styles["Normal"]))
            doc.build(elements)
            return

        table_data = [["Ranking", "Cancha", "Tipo", "Cantidad de reservas"]]
        rank = 1
        for f in filas:
            cancha_label = f"Cancha {f['cancha_id']}"
            tipo = f["tipo_nombre"] or "N/D"
            table_data.append([str(rank), cancha_label, tipo, str(f["reservas_count"])])
            rank += 1

        table = Table(table_data, colWidths=[0.8 * inch, 1.5 * inch, 2 * inch, 1.5 * inch])
        table.setStyle(_estilo_tabla())
        elements.append(table)
        doc.build(elements)

    finally:
        conn.close()


def reporte_utilizacion_mensual(db_path: str, anio: int, ruta_pdf: str) -> None:
    """Genera un PDF con la utilización mensual de las canchas en un año dado,
    incluyendo un gráfico de barras generado con matplotlib.

    Args:
        db_path: Ruta a la BD.
        anio: Año (ej. 2025).
        ruta_pdf: Ruta de salida del PDF.
    """
    try:
        conn = obtener_conexion(db_path)
    except Exception as e:
        raise RuntimeError(f"No se pudo conectar a la BD: {e}")

    try:
        cur = conn.cursor()
        # obtener conteo por mes
        cur.execute(
            "SELECT substr(fecha,1,4) as anio, substr(fecha,6,2) as mes, COUNT(*) as cnt "
            "FROM reserva WHERE substr(fecha,1,4) = ? GROUP BY mes ORDER BY mes",
            (str(anio),),
        )
        rows = cur.fetchall()
        # preparar datos para 1..12
        counts = [0] * 12
        for r in rows:
            try:
                m = int(r["mes"])
                if 1 <= m <= 12:
                    counts[m - 1] = r["cnt"]
            except Exception:
                continue

        months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

        # generar gráfico temporalmente
        tmp_img = None
        try:
            fd, tmp_img = tempfile.mkstemp(suffix=".png")
            os.close(fd)
            plt.figure(figsize=(10, 4))
            plt.bar(months, counts, color="#4c72b0")
            plt.title(f"Utilización mensual de canchas - Año {anio}")
            plt.xlabel("Mes")
            plt.ylabel("Cantidad de reservas")
            plt.tight_layout()
            plt.savefig(tmp_img)
            plt.close()

            # construir PDF
            doc = SimpleDocTemplate(ruta_pdf, pagesize=letter)
            elements = []
            styles = getSampleStyleSheet()
            elements.append(Paragraph(f"Utilización mensual de canchas – Año {anio}", styles["Title"]))
            elements.append(Spacer(1, 0.2 * inch))

            # tabla resumida
            table_data = [["Mes", "Cantidad de reservas"]]
            for i, cnt in enumerate(counts, start=1):
                table_data.append([months[i - 1], str(cnt)])

            table = Table(table_data, colWidths=[2 * inch, 2 * inch])
            table.setStyle(_estilo_tabla())
            elements.append(table)
            elements.append(Spacer(1, 0.3 * inch))

            # agregar imagen
            try:
                img = RLImage(tmp_img, width=6 * inch, height=2.5 * inch)
                elements.append(img)
            except Exception:
                # si no se puede insertar la imagen, mostrar mensaje
                elements.append(Paragraph("(No se pudo insertar la imagen del gráfico)", styles["Normal"]))

            doc.build(elements)

        finally:
            if tmp_img and os.path.exists(tmp_img):
                try:
                    os.remove(tmp_img)
                except Exception:
                    pass

    finally:
        conn.close()


if __name__ == '__main__':
    # Pequeño demo si se ejecuta como script
    DB = os.path.join(os.path.dirname(__file__), 'db', 'DonBalon.db')
    out = os.path.join(os.path.dirname(__file__), 'report_demo.pdf')
    try:
        reporte_canchas_mas_utilizadas(DB, out, limite=5)
        print(f"Reporte generado: {out}")
    except Exception as e:
        print("Error generando reporte de demo:", e)
