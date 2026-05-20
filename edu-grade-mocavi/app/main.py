from google import genai
from google.genai import types
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, WebSocket, WebSocketDisconnect, status, Request
from fastapi.security import HTTPBearer
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import List, Optional
from . import models, schemas, database, auth, omr
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from slowapi import Limiter
from slowapi.util import get_remote_address
import json
import uuid
import io
import os
import asyncio
import pandas as pd
from dotenv import load_dotenv
from datetime import date, timedelta, datetime
import logging

load_dotenv()

# Configurar logging sin exponer detalles sensibles
logging.basicConfig(level=logging.WARNING)
logger = logging.getLogger(__name__)

app = FastAPI(title="MOCAVI EDU-GRADE API", version="1.0.0")

# --- RATE LIMITING ---
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

# --- CONFIGURACIÓN DE CORS SEGURA ---
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://127.0.0.1:3000").split(",")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

if ENVIRONMENT == "production":
    # En producción, solo permitir el frontend
    ALLOWED_ORIGINS = [origin.strip() for origin in ALLOWED_ORIGINS if origin.strip()]
else:
    # En desarrollo, permitir localhost
    ALLOWED_ORIGINS = ["http://127.0.0.1:3000", "http://localhost:3000", "http://127.0.0.1:8000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# Comprimir respuestas JSON > 1KB. Acelera dashboards con muchos estudiantes/eventos.
app.add_middleware(GZipMiddleware, minimum_size=1024)

# --- CONFIGURACIÓN DE IA DINÁMICA ---
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
GEMINI_TIMEOUT = 30  # segundos

def get_active_model_name() -> str:
    try:
        for m in client.models.list():
            if 'generateContent' in (m.supported_actions or []) and 'flash' in m.name:
                logger.info(f"Modelo Gemini conectado: {m.name}")
                return m.name
        return 'gemini-2.0-flash'
    except Exception as e:
        logger.warning(f"Usando fallback para modelo Gemini: {str(e)}")
        return 'gemini-2.0-flash'

MODEL_NAME = get_active_model_name()

# Crear tablas
models.Base.metadata.create_all(bind=database.engine)

# --- RUTAS DE AUTENTICACIÓN ---

@app.post("/login/teacher", response_model=schemas.TokenResponse)
@limiter.limit("5/minute")
def login_teacher(request: Request, login_data: schemas.TeacherLogin, db: Session = Depends(database.get_db)):
    """
    Login para profesores con JWT
    Rate limit: 5 intentos por minuto
    """
    user = db.query(models.User).filter(models.User.username == login_data.username).first()

    if not user or not auth.verify_password(login_data.password, user.hashed_password):
        # No revelar si el usuario existe o la contraseña es incorrecta
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas"
        )

    # sub = user.id (UUID) para identificar de forma estable al docente.
    # username se incluye aparte por compatibilidad con la UI.
    token = auth.create_access_token(
        data={"sub": str(user.id), "role": "teacher", "username": user.username}
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": "teacher",
        "user": {"username": user.username, "id": str(user.id)}
    }


@app.post("/login/student", response_model=schemas.TokenResponse)
@limiter.limit("10/minute")
def login_student(request: Request, login_data: schemas.StudentLogin, db: Session = Depends(database.get_db)):
    """
    Login para estudiantes sin contraseña (solo document_id)
    """
    student = db.query(models.Student).filter(
        models.Student.document_id == login_data.document_id
    ).first()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Documento no registrado"
        )

    # sub = document_id para que coincida con sender/receiver en mensajería.
    token = auth.create_access_token(
        data={"sub": student.document_id, "role": "student", "student_id": str(student.id)}
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": "student",
        "user": {
            "id": str(student.id),
            "full_name": student.full_name,
            "document_id": student.document_id,
            "email": student.email
        }
    }

@app.get("/student/dashboard")
def student_dashboard(
    current_user: dict = Depends(auth.get_current_student),
    db: Session = Depends(database.get_db)
):
    """
    Dashboard del estudiante - solo puede acceder a sus propios datos
    """
    student_id = current_user.get("student_id")
    student = db.query(models.Student).filter(models.Student.id == student_id).first()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Estudiante no encontrado"
        )

    grades = db.query(models.Grade).filter(
        models.Grade.enrollment_id == student.id
    ).order_by(models.Grade.period_id).all()

    return {
        "student": {
            "id": str(student.id),
            "full_name": student.full_name,
            "document_id": student.document_id,
            "email": student.email,
        },
        "grades": [
            {
                "period_id": g.period_id,
                "score_saber": float(g.score_saber) if g.score_saber else None,
                "score_hacer": float(g.score_hacer) if g.score_hacer else None,
                "score_ser": float(g.score_ser) if g.score_ser else None,
                "final_period_score": float(g.final_period_score) if g.final_period_score else None,
                "performance_level": g.performance_level,
                "updated_at": g.updated_at.isoformat() if g.updated_at else None,
            }
            for g in grades
        ],
    }

@app.get("/students/", response_model=List[schemas.StudentResponse])
def get_students(
    grade: Optional[str] = None,
    grupo: Optional[str] = None,
    current_user: dict = Depends(auth.get_current_teacher),
    db: Session = Depends(database.get_db)
):
    """Obtener lista de estudiantes - solo profesores"""
    query = db.query(models.Student)
    if grade:
        query = query.filter(models.Student.grade == grade)
    if grupo:
        query = query.filter(models.Student.grupo == grupo)
    return query.order_by(models.Student.full_name).all()

@app.post("/students/", response_model=schemas.StudentResponse)
def create_student(
    student: schemas.StudentCreate,
    current_user: dict = Depends(auth.get_current_teacher),
    db: Session = Depends(database.get_db)
):
    """Crear nuevo estudiante - solo profesores"""
    # Verificar que el estudiante no exista ya
    existing = db.query(models.Student).filter(
        models.Student.document_id == student.document_id
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Estudiante con ese documento ya existe"
        )

    new_student = models.Student(**student.dict())
    db.add(new_student)
    try:
        db.commit()
        db.refresh(new_student)
        return new_student
    except Exception as e:
        db.rollback()
        logger.error(f"Error al crear estudiante: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al crear estudiante"
        )

_COLUMN_KEYWORDS = {
    "nombre":    ["nombre"],
    "documento": ["documento", "cedula", "cédula", "identificacion", "identificación", "nro", "número"],
    "correo":    ["correo", "email", "mail"],
}

def _resolve_columns(columns: list[str]) -> dict[str, str | None]:
    """Return a dict {field: actual_column_name | None} using keyword matching."""
    normalized = {col: col.lower().strip() for col in columns}
    result: dict[str, str | None] = {field: None for field in _COLUMN_KEYWORDS}
    for field, keywords in _COLUMN_KEYWORDS.items():
        for col, col_lower in normalized.items():
            if any(kw in col_lower for kw in keywords):
                result[field] = col
                break
    return result

_ALLOWED_BULK_MIMES = {
    "text/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/octet-stream",  # algunos navegadores envían esto
}


@app.post("/students/bulk")
@limiter.limit("10/minute")
async def bulk_import_students(
    request: Request,
    file: UploadFile = File(...),
    grade: str = Form("11"),
    grupo: str = Form("1"),
    current_user: dict = Depends(auth.get_current_teacher),
    db: Session = Depends(database.get_db)
):
    """
    Importar estudiantes desde archivo CSV o Excel
    Solo profesores. Rate limit: 10/min.
    """
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Archivo demasiado grande (máximo 10MB)"
        )

    filename = (file.filename or "").lower()
    content_type = (file.content_type or "").lower()

    is_csv = filename.endswith(".csv")
    is_xlsx = filename.endswith((".xlsx", ".xls"))

    # MIME debe coincidir con la extensión (defensa adicional ante extensiones engañosas)
    if not (is_csv or is_xlsx) or (content_type and content_type not in _ALLOWED_BULK_MIMES):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Solo se permiten archivos CSV o Excel"
        )

    try:
        if is_csv:
            df = pd.read_csv(io.BytesIO(content))
        else:
            df = pd.read_excel(io.BytesIO(content))
    except Exception as e:
        logger.error(f"Error al leer archivo: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No se pudo leer el archivo"
        )

    df.columns = df.columns.str.strip()
    col_map = _resolve_columns(list(df.columns))

    missing = [f for f in ("nombre", "documento") if col_map[f] is None]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Columnas requeridas no encontradas: {', '.join(missing)}"
        )

    col_nombre    = col_map["nombre"]
    col_documento = col_map["documento"]
    col_correo    = col_map["correo"]

    created, skipped = 0, 0
    for _, row in df.iterrows():
        full_name   = str(row[col_nombre]).strip()
        document_id = str(row[col_documento]).strip()
        email_raw   = str(row[col_correo]).strip() if col_correo else ""
        email = email_raw if email_raw and email_raw.lower() != "nan" else None

        if not full_name or full_name.lower() == "nan" or not document_id or document_id.lower() == "nan":
            skipped += 1
            continue

        # Validar que el estudiante no existe ya
        exists = db.query(models.Student).filter(
            models.Student.document_id == document_id
        ).first()
        if exists:
            skipped += 1
            continue

        db.add(models.Student(
            full_name=full_name,
            document_id=document_id,
            email=email,
            grade=grade,
            grupo=grupo
        ))
        created += 1

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Error al guardar estudiantes: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al guardar estudiantes"
        )

    return {"created": created, "skipped": skipped}

@app.delete("/students/{student_id}")
def delete_student(
    student_id: str,
    current_user: dict = Depends(auth.get_current_teacher),
    db: Session = Depends(database.get_db)
):
    """Eliminar estudiante - solo profesores"""
    try:
        db.query(models.Grade).filter(models.Grade.enrollment_id == student_id).delete()
        db.query(models.Student).filter(models.Student.id == student_id).delete()
        db.commit()
        return {"message": "Estudiante eliminado"}
    except Exception as e:
        db.rollback()
        logger.error(f"Error al eliminar estudiante: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al eliminar estudiante"
        )

@app.get("/grades/", response_model=List[schemas.GradeResponse])
def get_grades(
    period_id: Optional[int] = None,
    current_user: dict = Depends(auth.get_current_teacher),
    db: Session = Depends(database.get_db)
):
    """Obtener calificaciones - solo profesores"""
    query = db.query(models.Grade)
    if period_id is not None:
        query = query.filter(models.Grade.period_id == period_id)
    return query.all()

@app.post("/grades/", response_model=schemas.GradeResponse)
def create_or_update_grade(
    grade: schemas.GradeCreate,
    current_user: dict = Depends(auth.get_current_teacher),
    db: Session = Depends(database.get_db)
):
    """Crear o actualizar calificación - solo profesores"""
    final_score = round((grade.score_saber + grade.score_hacer + grade.score_ser) / 3, 2)
    level = "SUPERIOR" if final_score >= 4.6 else "ALTO" if final_score >= 4.0 else "BÁSICO" if final_score >= 3.0 else "BAJO"

    db_grade = db.query(models.Grade).filter(
        models.Grade.enrollment_id == grade.enrollment_id,
        models.Grade.period_id == grade.period_id
    ).first()

    try:
        if db_grade:
            db_grade.score_saber = grade.score_saber
            db_grade.score_hacer = grade.score_hacer
            db_grade.score_ser = grade.score_ser
            db_grade.final_period_score = final_score
            db_grade.performance_level = level
        else:
            db_grade = models.Grade(
                id=uuid.uuid4(),
                score_saber=grade.score_saber,
                score_hacer=grade.score_hacer,
                score_ser=grade.score_ser,
                final_period_score=final_score,
                performance_level=level,
                enrollment_id=grade.enrollment_id,
                assignment_id=grade.assignment_id,
                period_id=grade.period_id
            )
            db.add(db_grade)

        db.commit()
        db.refresh(db_grade)
        return db_grade
    except Exception as e:
        db.rollback()
        logger.error(f"Error al guardar calificación: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al guardar calificación"
        )

_ALLOWED_EXAM_MIMES = {
    "image/png", "image/jpeg", "image/jpg", "image/webp",
    "application/pdf",
}


# --- CALIFICADOR IA — genera análisis por pregunta y guarda en BD ---
@app.post("/upload-exams")
@limiter.limit("12/minute")
async def upload_exams(
    request: Request,
    file: UploadFile = File(...),
    answer_key: str = Form(...),
    subject: str = Form("Matemáticas"),
    grade: Optional[str] = Form(None),
    grupo: Optional[str] = Form(None),
    period_id: Optional[int] = Form(None),
    current_user: dict = Depends(auth.get_current_teacher),
    db: Session = Depends(database.get_db),
):
    """
    Subir examen y procesarlo con IA. Solo profesores.
    Rate limit: 12/min para limitar coste de Gemini.
    """
    try:
        img_content = await file.read()

        if len(img_content) > 20 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Imagen demasiado grande (máximo 20MB)"
            )

        content_type = (file.content_type or "").lower()
        if content_type and content_type not in _ALLOWED_EXAM_MIMES:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Solo se permiten imágenes (PNG/JPG/WEBP) o PDF"
            )

        try:
            answer_key_parsed = json.loads(answer_key)
        except Exception:
            answer_key_parsed = {}

        total_q = len(answer_key_parsed) if answer_key_parsed else 25

        prompt = f"""
Eres un calificador experto en {subject}.
Clave de respuestas correctas (pregunta: respuesta): {json.dumps(answer_key_parsed, ensure_ascii=False)}

Para CADA estudiante que aparezca en el examen:
1. Identifica su NOMBRE COMPLETO.
2. Detecta qué opción marcó en cada pregunta (A, B, C o D).
3. Compara con la clave y determina si es correcto.
4. Calcula la NOTA final en escala 1.0-5.0 (correctas/total * 4 + 1).
5. Genera un feedback personalizado de 2-3 oraciones sobre los temas débiles.
6. Genera una lista de 2-3 sugerencias de estudio concretas.

Responde ÚNICAMENTE con JSON válido:
[
  {{
    "full_name": "Nombre Apellido",
    "score": 3.5,
    "answers": [
      {{"q": 1, "selected": "A", "correct": "D", "is_correct": false, "why_wrong": "Explicación breve de por qué la opción correcta es D"}},
      {{"q": 2, "selected": "C", "correct": "C", "is_correct": true, "why_wrong": null}}
    ],
    "feedback": "El estudiante muestra dificultades en...",
    "suggestions": ["Repasar los conceptos de...", "Practicar ejercicios de..."]
  }}
]
"""

        # --- LLAMADA A GEMINI CON REINTENTOS Y TIMEOUT ---
        response = None
        last_error = None
        for attempt in range(3):
            try:
                response = await asyncio.wait_for(
                    asyncio.to_thread(
                        client.models.generate_content,
                        model=MODEL_NAME,
                        contents=[
                            types.Part.from_bytes(data=img_content, mime_type=file.content_type),
                            prompt,
                        ],
                    ),
                    timeout=GEMINI_TIMEOUT
                )
                break
            except asyncio.TimeoutError:
                last_error = TimeoutError("Tiempo de espera agotado en Gemini")
                if attempt < 2:
                    await asyncio.sleep((attempt + 1) * 2)
                    continue
                raise
            except Exception as e:
                last_error = e
                err_str = str(e)
                is_unavailable = "503" in err_str or "UNAVAILABLE" in err_str or "high demand" in err_str
                if is_unavailable and attempt < 2:
                    await asyncio.sleep((attempt + 1) * 2)
                    continue
                raise

        if response is None:
            raise last_error

        # --- VERIFICACIÓN DE RESPUESTA GEMINI ---
        if not response.candidates or not response.candidates[0].content.parts:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="La IA no pudo procesar la imagen"
            )

        # --- EXTRACCIÓN ROBUSTA DE JSON ---
        raw_text = response.text
        logger.debug(f"Respuesta IA obtenida (primeros 200 chars): {raw_text[:200]}")

        if "```json" in raw_text:
            raw_text = raw_text.split("```json")[1].split("```")[0]
        elif "```" in raw_text:
            raw_text = raw_text.split("```")[1].split("```")[0]

        try:
            resultados = json.loads(raw_text.strip())
        except json.JSONDecodeError:
            logger.error(f"JSON inválido de IA: {raw_text[:300]}")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="La IA no devolvió un formato válido"
            )

        if isinstance(resultados, dict):
            resultados = [resultados]
        if not isinstance(resultados, list):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Formato de respuesta IA inesperado"
            )

        # Crear exam en BD y guardar resultados
        db_exam = models.Exam(
            title=f"Examen {subject} — Grado {grade} Grupo {grupo} P{period_id}",
            subject=subject, grade=grade, grupo=grupo,
            period_id=period_id, answer_key=answer_key_parsed,
            total_questions=total_q,
        )
        db.add(db_exam)
        db.flush()

        for item in resultados:
            score = max(1.0, min(5.0, float(item.get("score", 1.0))))
            item["score"] = score
            item["level"] = (
                "SUPERIOR" if score >= 4.6 else
                "ALTO"     if score >= 4.0 else
                "BÁSICO"   if score >= 3.0 else
                "BAJO"
            )
            item["exam_id"] = str(db_exam.id)

            # Guardar por estudiante si existe en BD
            # Usar solo el primer nombre para búsqueda más específica
            full_name = item.get('full_name', '').strip()
            if full_name:
                # Buscar por coincidencia exacta de nombre completo primero
                student = db.query(models.Student).filter(
                    models.Student.full_name == full_name
                ).first()

                # Si no encuentra, buscar por primer nombre (más flexible)
                if not student:
                    first_name = full_name.split()[0] if full_name.split() else ""
                    if first_name:
                        # Usar bound parameters para evitar SQL injection
                        student = db.query(models.Student).filter(
                            models.Student.full_name.ilike(f"%{first_name}%")
                        ).first()

                if student:
                    existing = db.query(models.ExamResult).filter(
                        models.ExamResult.exam_id == db_exam.id,
                        models.ExamResult.student_id == student.id,
                    ).first()

                    result_data = dict(
                        exam_id=db_exam.id,
                        student_id=student.id,
                        answers=item.get("answers", []),
                        score=score,
                        ai_feedback=item.get("feedback", ""),
                        ai_suggestions=json.dumps(item.get("suggestions", []), ensure_ascii=False),
                    )

                    if existing:
                        for k, v in result_data.items():
                            setattr(existing, k, v)
                    else:
                        db.add(models.ExamResult(**result_data))

        try:
            db.commit()
        except Exception as e:
            db.rollback()
            logger.error(f"Error al guardar resultados: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error al guardar resultados"
            )

        return {"exam_id": str(db_exam.id), "analisis": resultados}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en upload-exams: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al procesar examen"
        )


# ====================================================================
# CALIFICADOR OMR (lectura local de burbujas con OpenCV)
# - Velocidad ~30 ms/hoja, sin IA, sin coste, offline.
# - El feedback IA es opcional y se puede pedir aparte.
# ====================================================================

@app.get("/answer-sheet")
def answer_sheet(
    questions: int = 25,
    options: int = 4,
    current_user: dict = Depends(auth.get_current_teacher),
):
    """
    Genera la hoja de respuestas estándar (PDF) para imprimir.
    Las burbujas quedan exactamente donde el lector OMR las espera.
    """
    questions = max(1, min(questions, 30))   # 2 columnas × 15
    options = max(2, min(options, 5))
    pdf_bytes = omr.render_answer_sheet(num_q=questions, num_opts=options)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="hoja-respuestas-{questions}.pdf"'},
    )


def _level_for(score: float) -> str:
    return (
        "SUPERIOR" if score >= 4.6 else
        "ALTO"     if score >= 4.0 else
        "BÁSICO"   if score >= 3.0 else
        "BAJO"
    )


@app.post("/upload-exams-omr")
@limiter.limit("30/minute")
async def upload_exams_omr(
    request: Request,
    file: UploadFile = File(...),
    answer_key: str = Form(...),
    subject: str = Form("Matemáticas"),
    grade: Optional[str] = Form(None),
    grupo: Optional[str] = Form(None),
    period_id: Optional[int] = Form(None),
    current_user: dict = Depends(auth.get_current_teacher),
    db: Session = Depends(database.get_db),
):
    """
    Califica hojas de respuesta OMR (opción múltiple) leyendo las burbujas
    localmente con OpenCV. Una página = un estudiante. Devuelve una nota por
    página al instante. NO usa IA (rápido y gratis).

    answer_key: JSON {"1":"A","2":"D",...}
    """
    content = await file.read()
    if len(content) > 20 * 1024 * 1024:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "Archivo demasiado grande (máx 20MB)")

    ct = (file.content_type or "").lower()
    if ct and ct not in {"image/png", "image/jpeg", "image/jpg", "image/webp", "application/pdf"}:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Solo imágenes (PNG/JPG/WEBP) o PDF")

    try:
        key = json.loads(answer_key)
    except Exception:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "answer_key no es JSON válido")
    if not key:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "answer_key vacío")

    # Normalizar clave: {int: "A"}
    key_norm = {int(k): str(v).strip().upper() for k, v in key.items()}
    num_q = max(key_norm.keys())

    # Leer marcas (puede tardar ~30 ms/página, lo hacemos en hilo)
    try:
        pages = await asyncio.to_thread(omr.read_marks, content, ct, num_q, 4)
    except Exception as e:
        logger.error(f"OMR error: {e}")
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "No se pudo leer la hoja. Verifica que sea la hoja estándar y la foto esté completa.")

    db_exam = models.Exam(
        title=f"OMR {subject} — Grado {grade} Grupo {grupo} P{period_id}",
        subject=subject, grade=grade, grupo=grupo,
        period_id=period_id, answer_key=key_norm, total_questions=num_q,
    )
    db.add(db_exam)
    db.flush()

    resultados = []
    for pg in pages:
        marks = pg["answers"]            # {q: "A"|None}
        answers_detail = []
        correct = 0
        for q in range(1, num_q + 1):
            sel = marks.get(q)
            corr = key_norm.get(q)
            is_ok = sel is not None and sel == corr
            if is_ok:
                correct += 1
            answers_detail.append({
                "q": q, "selected": sel, "correct": corr, "is_correct": is_ok,
            })
        score = round(correct / num_q * 4 + 1, 2) if num_q else 1.0  # escala 1.0–5.0
        resultados.append({
            "page": pg["page"],
            "aligned": pg["aligned"],
            "score": score,
            "level": _level_for(score),
            "correct": correct,
            "total": num_q,
            "answers": answers_detail,
            "full_name": None,   # OMR no lee el nombre; se asigna después
        })

    db.commit()
    return {
        "exam_id": str(db_exam.id),
        "engine": "omr",
        "pages": len(resultados),
        "analisis": resultados,
    }


# --- EXÁMENES: listar y estadísticas ---
@app.get("/exams/", response_model=List[schemas.ExamResponse])
def list_exams(
    grade: Optional[str] = None,
    grupo: Optional[str] = None,
    period_id: Optional[int] = None,
    current_user: dict = Depends(auth.get_current_teacher),
    db: Session = Depends(database.get_db)
):
    """Listar exámenes - solo profesores"""
    q = db.query(models.Exam)
    if grade:
        q = q.filter(models.Exam.grade == grade)
    if grupo:
        q = q.filter(models.Exam.grupo == grupo)
    if period_id:
        q = q.filter(models.Exam.period_id == period_id)
    return q.order_by(models.Exam.created_at.desc()).all()

@app.get("/exams/{exam_id}/stats")
def exam_stats(
    exam_id: str,
    current_user: dict = Depends(auth.get_current_teacher),
    db: Session = Depends(database.get_db)
):
    """Ver estadísticas de examen - solo profesores"""
    results = db.query(models.ExamResult).filter(models.ExamResult.exam_id == exam_id).all()
    if not results:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sin resultados para este examen"
        )

    exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
    total_q = exam.total_questions if exam else 25

    errors_per_q: dict = {i: 0 for i in range(1, total_q + 1)}
    total_students = len(results)

    for r in results:
        if isinstance(r.answers, list):
            for ans in r.answers:
                if not ans.get("is_correct", True):
                    q_num = ans.get("q", 0)
                    if q_num in errors_per_q:
                        errors_per_q[q_num] += 1

    stats = [
        {"question": k, "errors": v, "error_rate": round(v / total_students * 100, 1)}
        for k, v in errors_per_q.items()
    ]
    stats.sort(key=lambda x: x["errors"], reverse=True)
    hardest = [s for s in stats if s["errors"] > 0][:5]

    return {
        "exam_id": exam_id,
        "subject": exam.subject if exam else "",
        "total_students": total_students,
        "stats": stats,
        "hardest_questions": hardest,
    }

@app.get("/students/{student_id}/exam-results", response_model=List[schemas.ExamResultResponse])
def student_exam_results(
    student_id: str,
    period_id: Optional[int] = None,
    current_user: dict = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Ver resultados de examen por estudiante.
    - Profesores: pueden ver los resultados de cualquier estudiante.
    - Estudiantes: solo pueden ver sus propios resultados.
    """
    if current_user.get("role") == "student" and current_user.get("student_id") != student_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No autorizado"
        )

    q = db.query(models.ExamResult).filter(models.ExamResult.student_id == student_id)
    if period_id:
        exams_in_period = db.query(models.Exam.id).filter(models.Exam.period_id == period_id).subquery()
        q = q.filter(models.ExamResult.exam_id.in_(exams_in_period))
    return q.order_by(models.ExamResult.created_at.desc()).all()


@app.get("/teachers/default")
def get_default_teacher(
    current_user: dict = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Devuelve el docente por defecto (primero registrado).
    Lo usa el portal del estudiante para saber a quién enviar mensajes.
    """
    teacher = db.query(models.User).order_by(models.User.username.asc()).first()
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No hay docentes registrados"
        )
    return {"id": str(teacher.id), "username": teacher.username, "full_name": teacher.full_name}


# --- CHATBOT IA PARA ESTUDIANTES ---
@app.post("/chatbot", response_model=schemas.ChatbotResponse)
@limiter.limit("20/minute")
async def chatbot(
    request: Request,
    payload: schemas.ChatbotRequest,
    current_user: dict = Depends(auth.get_current_student),
    db: Session = Depends(database.get_db)
):
    """Chatbot IA tutor - solo estudiantes. Rate limit 20/min para acotar coste IA."""
    question = payload.message.strip()

    context = (
        "Eres un tutor académico amigable y experto. "
        f"{'Especialidad actual: ' + payload.subject + '. ' if payload.subject else ''}"
        "Responde en español de forma clara y concisa, con ejemplos cuando sea útil."
    )

    messages = [context]
    # Limitar historial a últimos 6 mensajes
    for h in payload.history[-6:]:
        messages.append(f"Estudiante: {h.get('user','')}")
        messages.append(f"Tutor: {h.get('bot','')}")
    messages.append(f"Estudiante: {question}")
    prompt = "\n".join(messages)

    try:
        for attempt in range(3):
            try:
                resp = await asyncio.wait_for(
                    asyncio.to_thread(
                        client.models.generate_content,
                        model=MODEL_NAME,
                        contents=prompt
                    ),
                    timeout=GEMINI_TIMEOUT
                )
                break
            except asyncio.TimeoutError:
                if attempt < 2:
                    await asyncio.sleep((attempt + 1) * 2)
                    continue
                raise HTTPException(
                    status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                    detail="Tiempo de espera agotado"
                )
            except Exception as e:
                if ("503" in str(e) or "UNAVAILABLE" in str(e)) and attempt < 2:
                    await asyncio.sleep((attempt + 1) * 2)
                    continue
                raise

        return schemas.ChatbotResponse(reply=resp.text.strip())

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en chatbot: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error en el chatbot"
        )


# --- MENSAJERÍA ---
@app.post("/messages/", response_model=schemas.MessageResponse)
async def send_message(
    msg: schemas.MessageCreate,
    current_user: dict = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """Enviar mensaje - requiere autenticación JWT"""
    # Verificar que el usuario que envía el mensaje es quien dice ser
    current_user_id = current_user.get("sub")
    if msg.sender_id != current_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No puedes enviar mensajes como otro usuario"
        )

    db_msg = models.Message(**msg.dict())
    db.add(db_msg)

    try:
        db.commit()
        db.refresh(db_msg)
        # Notificar via WebSocket si hay conexión activa
        receiver = msg.receiver_id
        if receiver in ws_connections:
            asyncio.create_task(_ws_notify(receiver, db_msg))
        return db_msg
    except Exception as e:
        db.rollback()
        logger.error(f"Error al guardar mensaje: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al enviar mensaje"
        )


@app.get("/messages/", response_model=List[schemas.MessageResponse])
def get_messages(
    user_id: str,
    other_id: str,
    current_user: dict = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
    skip: int = 0,
    limit: int = 50,
):
    """Obtener mensajes entre dos usuarios - requiere autenticación JWT"""
    # Verificar que el usuario solo puede ver sus propios mensajes
    if current_user.get("sub") != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No puedes ver mensajes de otro usuario"
        )

    msgs = db.query(models.Message).filter(
        ((models.Message.sender_id == user_id) & (models.Message.receiver_id == other_id)) |
        ((models.Message.sender_id == other_id) & (models.Message.receiver_id == user_id))
    ).order_by(models.Message.created_at.asc()).offset(skip).limit(limit).all()

    # Marcar como leídos los del otro
    try:
        db.query(models.Message).filter(
            models.Message.sender_id == other_id,
            models.Message.receiver_id == user_id,
            models.Message.is_read == False,
        ).update({"is_read": True})
        db.commit()
    except Exception as e:
        logger.error(f"Error al marcar mensajes como leídos: {str(e)}")

    return msgs


@app.get("/messages/unread-count")
def unread_count(
    user_id: str,
    current_user: dict = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """Obtener conteo de mensajes no leídos"""
    # Verificar que el usuario solo puede ver sus propios conteos
    if current_user.get("sub") != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No autorizado"
        )

    count = db.query(models.Message).filter(
        models.Message.receiver_id == user_id,
        models.Message.is_read == False,
    ).count()
    return {"count": count}


@app.get("/messages/conversations")
def get_conversations(
    teacher_id: Optional[str] = None,
    student_id: Optional[str] = None,
    current_user: dict = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Lista de conversaciones del usuario actual.
    Implementación bulk para evitar N+1: 1 consulta por mensajes + 1 por unreads
    + 1 por estudiantes + 1 por docentes (si aplica).
    """
    user_id = teacher_id or student_id
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Se requiere user_id"
        )

    if current_user.get("sub") != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No autorizado"
        )

    msgs = db.query(models.Message).filter(
        (models.Message.sender_id == user_id) | (models.Message.receiver_id == user_id)
    ).order_by(models.Message.created_at.desc()).all()

    # Reducir a la última conversación por contraparte
    last_msg_by_other: dict = {}
    for m in msgs:
        other = m.receiver_id if m.sender_id == user_id else m.sender_id
        if other not in last_msg_by_other:
            last_msg_by_other[other] = m

    if not last_msg_by_other:
        return []

    others = list(last_msg_by_other.keys())

    # Conteo de no-leídos en una sola query agrupada
    from sqlalchemy import func as sa_func
    unread_rows = db.query(
        models.Message.sender_id,
        sa_func.count(models.Message.id).label("n"),
    ).filter(
        models.Message.receiver_id == user_id,
        models.Message.is_read == False,
        models.Message.sender_id.in_(others),
    ).group_by(models.Message.sender_id).all()
    unread_map = {row.sender_id: row.n for row in unread_rows}

    # Display names en bulk
    students_map = {
        s.document_id: s.full_name
        for s in db.query(models.Student.document_id, models.Student.full_name)
                   .filter(models.Student.document_id.in_(others)).all()
    }

    # User.id es UUID — solo intentar resolver los "others" con forma UUID
    uuid_others = []
    for o in others:
        try:
            uuid.UUID(o)
            uuid_others.append(o)
        except (ValueError, AttributeError):
            pass
    teachers_map = {}
    if uuid_others:
        teachers_map = {
            str(t.id): t.username
            for t in db.query(models.User.id, models.User.username)
                       .filter(models.User.id.in_(uuid_others)).all()
        }

    conversations = []
    for other in others:
        m = last_msg_by_other[other]
        display_name = students_map.get(other) or teachers_map.get(other) or other
        conversations.append({
            "other_id": other,
            "display_name": display_name,
            "last_message": m.content,
            "unread": unread_map.get(other, 0),
            "created_at": m.created_at,
        })
    return conversations


# --- WEBSOCKET PARA MENSAJERÍA EN TIEMPO REAL ---
ws_connections: dict = {}


async def _ws_notify(receiver_id: str, msg):
    """Enviar notificación a través de WebSocket"""
    ws = ws_connections.get(receiver_id)
    if ws:
        try:
            await ws.send_json({
                "id": str(msg.id),
                "sender_id": msg.sender_id,
                "sender_type": msg.sender_type,
                "content": msg.content,
                "media_type": msg.media_type,
                "created_at": msg.created_at.isoformat(),
            })
        except Exception as e:
            logger.error(f"Error al enviar notificación WebSocket: {str(e)}")
            ws_connections.pop(receiver_id, None)


@app.websocket("/ws/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str):
    """
    WebSocket con autenticación JWT
    El token se envía en la URL
    """
    try:
        # Verificar token antes de aceptar la conexión
        payload = auth.verify_token(token)
        user_id = payload.get("sub")

        if not user_id:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Token inválido")
            return

        await websocket.accept()
        ws_connections[user_id] = websocket
        logger.info(f"WebSocket conectado: {user_id}")

        try:
            while True:
                # Mantener la conexión abierta, ignorar mensajes recibidos
                await websocket.receive_text()
        except WebSocketDisconnect:
            ws_connections.pop(user_id, None)
            logger.info(f"WebSocket desconectado: {user_id}")
        except Exception as e:
            logger.error(f"Error en WebSocket: {str(e)}")
            ws_connections.pop(user_id, None)

    except Exception as e:
        logger.error(f"Error al conectar WebSocket: {str(e)}")
        try:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Autenticación fallida")
        except Exception:
            pass


# --- CALENDARIO DE EVENTOS ---
@app.get("/events/", response_model=List[schemas.CalendarEventResponse])
def list_events(
    grade: Optional[str] = None,
    grupo: Optional[str] = None,
    month: Optional[int] = None,
    year: Optional[int] = None,
    current_user: dict = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """Listar eventos de calendario"""
    q = db.query(models.CalendarEvent)
    if grade:
        q = q.filter(models.CalendarEvent.grade == grade)
    if grupo:
        q = q.filter(models.CalendarEvent.grupo == grupo)
    if month and year:
        from sqlalchemy import extract
        q = q.filter(
            extract('month', models.CalendarEvent.event_date) == month,
            extract('year',  models.CalendarEvent.event_date) == year,
        )
    return q.order_by(models.CalendarEvent.event_date.asc()).all()


@app.get("/events/upcoming", response_model=List[schemas.CalendarEventResponse])
def upcoming_events(
    days: int = 7,
    grade: Optional[str] = None,
    grupo: Optional[str] = None,
    current_user: dict = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """Obtener próximos eventos"""
    today = date.today()
    limit = today + timedelta(days=days)
    q = db.query(models.CalendarEvent).filter(
        models.CalendarEvent.event_date >= today,
        models.CalendarEvent.event_date <= limit,
    )
    if grade:
        q = q.filter(models.CalendarEvent.grade == grade)
    if grupo:
        q = q.filter(models.CalendarEvent.grupo == grupo)
    return q.order_by(models.CalendarEvent.event_date.asc()).all()


@app.post("/events/", response_model=schemas.CalendarEventResponse)
def create_event(
    event: schemas.CalendarEventCreate,
    current_user: dict = Depends(auth.get_current_teacher),
    db: Session = Depends(database.get_db),
):
    """Crear evento - solo profesores"""
    db_event = models.CalendarEvent(**event.dict())
    db.add(db_event)
    try:
        db.commit()
        db.refresh(db_event)
        return db_event
    except Exception as e:
        db.rollback()
        logger.error(f"Error al crear evento: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al crear evento"
        )


@app.put("/events/{event_id}", response_model=schemas.CalendarEventResponse)
def update_event(
    event_id: str,
    event: schemas.CalendarEventCreate,
    current_user: dict = Depends(auth.get_current_teacher),
    db: Session = Depends(database.get_db),
):
    """Actualizar evento - solo profesores"""
    db_event = db.query(models.CalendarEvent).filter(models.CalendarEvent.id == event_id).first()
    if not db_event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evento no encontrado"
        )

    try:
        for k, v in event.dict().items():
            setattr(db_event, k, v)
        db.commit()
        db.refresh(db_event)
        return db_event
    except Exception as e:
        db.rollback()
        logger.error(f"Error al actualizar evento: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al actualizar evento"
        )


@app.delete("/events/{event_id}")
def delete_event(
    event_id: str,
    current_user: dict = Depends(auth.get_current_teacher),
    db: Session = Depends(database.get_db),
):
    """Eliminar evento - solo profesores"""
    db_event = db.query(models.CalendarEvent).filter(models.CalendarEvent.id == event_id).first()
    if not db_event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evento no encontrado"
        )

    try:
        db.delete(db_event)
        db.commit()
        return {"message": "Evento eliminado"}
    except Exception as e:
        db.rollback()
        logger.error(f"Error al eliminar evento: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al eliminar evento"
        )