"""
Datos iniciales (seed) para entornos nuevos / despliegue en la nube.

Cuando la base de datos está vacía (primer despliegue), crea un docente de
demostración, varios estudiantes con sus notas por periodo y un par de eventos
del calendario, para que la plataforma se vea poblada y el docente pueda
iniciar sesión de inmediato.

Es idempotente: si ya existe algún usuario, no hace nada.

Credenciales de demostración:
    Docente   -> usuario: docente      contraseña: Demo2026!
    Estudiante -> documento: 1001 (María Fernanda López)
"""
from datetime import date, timedelta
from . import models, auth

# (nombre, documento, notas por periodo [(saber, hacer, ser), x4])
_STUDENTS = [
    ("María Fernanda López",  "1001", [(4.5, 4.7, 4.8), (4.6, 4.5, 4.9), (4.8, 4.7, 5.0), (4.9, 4.8, 5.0)]),
    ("Juan David Gómez",      "1002", [(3.2, 3.0, 3.5), (3.4, 3.6, 3.8), (3.9, 4.0, 4.1), (4.2, 4.1, 4.3)]),
    ("Valentina Ríos",        "1003", [(4.0, 3.8, 4.2), (4.1, 4.2, 4.0), (4.3, 4.4, 4.5), (4.5, 4.6, 4.7)]),
    ("Santiago Martínez",     "1004", [(2.5, 2.8, 3.0), (2.9, 3.1, 3.0), (3.2, 3.3, 3.5), (3.6, 3.7, 3.8)]),
    ("Isabella Torres",       "1005", [(4.8, 4.9, 5.0), (4.7, 4.8, 4.9), (5.0, 4.9, 5.0), (4.9, 5.0, 5.0)]),
    ("Mateo Castro",          "1006", [(2.0, 2.2, 2.5), (2.4, 2.6, 2.8), (3.0, 2.9, 3.1), (3.3, 3.2, 3.4)]),
    ("Sofía Hernández",       "1007", [(3.8, 4.0, 3.9), (4.0, 4.1, 4.2), (4.2, 4.3, 4.1), (4.4, 4.5, 4.6)]),
    ("Samuel Pérez",          "1008", [(3.0, 2.8, 3.2), (3.3, 3.4, 3.2), (3.6, 3.5, 3.7), (3.8, 3.9, 4.0)]),
]


def _level(score: float) -> str:
    return ("SUPERIOR" if score >= 4.6 else
            "ALTO" if score >= 4.0 else
            "BÁSICO" if score >= 3.0 else "BAJO")


def seed_if_empty(db) -> bool:
    """Crea datos de demostración solo si la base de datos no tiene usuarios."""
    if db.query(models.User).first():
        return False  # ya hay datos: no tocar nada

    # 1) Docente de demostración
    db.add(models.User(
        username="docente",
        hashed_password=auth.hash_password("Demo2026!"),
        full_name="Docente Demo",
    ))

    # 2) Estudiantes + notas de los 4 periodos
    for name, doc, periodos in _STUDENTS:
        st = models.Student(
            full_name=name, document_id=doc,
            email=f"{doc}@demo.knowtify.edu", grade="11", grupo="1",
        )
        db.add(st)
        db.flush()  # para obtener st.id
        for i, (sa, ha, se) in enumerate(periodos, start=1):
            final = round((sa + ha + se) / 3, 2)
            db.add(models.Grade(
                enrollment_id=st.id, assignment_id=st.id, period_id=i,
                score_saber=sa, score_hacer=ha, score_ser=se,
                final_period_score=final, performance_level=_level(final),
            ))

    # 3) Eventos del calendario (próximos)
    hoy = date.today()
    db.add(models.CalendarEvent(
        title="Parcial de Matemáticas", description="Temas: fracciones y ecuaciones.",
        event_date=hoy + timedelta(days=3), event_type="evaluacion", grade="11", grupo="1",
    ))
    db.add(models.CalendarEvent(
        title="Exposición de Biología", description="Trabajo en grupos de 3.",
        event_date=hoy + timedelta(days=7), event_type="actividad", grade="11", grupo="1",
    ))

    db.commit()
    return True
