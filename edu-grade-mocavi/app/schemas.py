from pydantic import BaseModel, Field, EmailStr, field_validator
from uuid import UUID
from typing import Optional, List, Any
from datetime import datetime, date

# ============= AUTENTICACIÓN =============

class TeacherLogin(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8, max_length=100)

class StudentLogin(BaseModel):
    document_id: str = Field(..., min_length=5, max_length=50)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user: dict

# ============= ESTUDIANTES =============

class StudentCreate(BaseModel):
    full_name: str = Field(..., min_length=3, max_length=200)
    document_id: str = Field(..., min_length=5, max_length=50)
    email: Optional[EmailStr] = None
    grade: Optional[str] = Field("11", max_length=20)
    grupo: Optional[str] = Field("1", max_length=20)

    @field_validator('full_name')
    @classmethod
    def full_name_alphanumeric(cls, v):
        if not v.strip():
            raise ValueError('El nombre no puede estar vacío')
        return v.strip()

class StudentResponse(BaseModel):
    id: UUID
    full_name: str
    document_id: Optional[str] = None
    email: Optional[str] = None
    grade: Optional[str] = None
    grupo: Optional[str] = None

    class Config:
        from_attributes = True

# ============= CALIFICACIONES =============

class GradeCreate(BaseModel):
    score_saber: float = Field(..., ge=1.0, le=5.0)
    score_hacer: float = Field(..., ge=1.0, le=5.0)
    score_ser: float = Field(..., ge=1.0, le=5.0)
    enrollment_id: UUID
    assignment_id: UUID
    period_id: int = Field(..., ge=1)

class GradeResponse(BaseModel):
    id: UUID
    score_saber: float
    score_hacer: float
    score_ser: float
    final_period_score: Optional[float] = None
    performance_level: Optional[str] = None
    enrollment_id: UUID
    period_id: Optional[int] = None

    class Config:
        from_attributes = True

# ============= EXÁMENES =============

class ExamCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    subject: str = Field(..., min_length=3, max_length=100)
    grade: Optional[str] = Field(None, max_length=20)
    grupo: Optional[str] = Field(None, max_length=20)
    period_id: Optional[int] = Field(None, ge=1)
    answer_key: Optional[dict] = None
    total_questions: Optional[int] = Field(25, ge=1, le=200)

class ExamResponse(BaseModel):
    id: UUID
    title: str
    subject: str
    grade: Optional[str] = None
    grupo: Optional[str] = None
    period_id: Optional[int] = None
    answer_key: Optional[Any] = None
    total_questions: Optional[int] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# ============= RESULTADOS DE EXÁMENES =============

class ExamResultResponse(BaseModel):
    id: UUID
    exam_id: UUID
    student_id: UUID
    answers: Optional[Any] = None
    score: Optional[float] = None
    ai_feedback: Optional[str] = None
    ai_suggestions: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# ============= MENSAJES =============

class MessageCreate(BaseModel):
    sender_type: str = Field(..., pattern="^(teacher|student)$")
    sender_id: str = Field(..., min_length=1, max_length=100)
    receiver_type: str = Field(..., pattern="^(teacher|student)$")
    receiver_id: str = Field(..., min_length=1, max_length=100)
    content: Optional[str] = Field(None, max_length=5000)
    media_type: Optional[str] = Field("text", pattern="^(text|image|file)$")
    media_url: Optional[str] = None

    @field_validator('content')
    @classmethod
    def content_not_empty_if_text(cls, v, info):
        if info.data.get('media_type') == 'text' and not v:
            raise ValueError('El contenido no puede estar vacío para mensajes de texto')
        return v

class MessageResponse(BaseModel):
    id: UUID
    sender_type: str
    sender_id: str
    receiver_type: str
    receiver_id: str
    content: Optional[str] = None
    media_type: Optional[str] = None
    media_url: Optional[str] = None
    is_read: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# ============= EVENTOS DE CALENDARIO =============

class CalendarEventCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    event_date: date
    event_type: Optional[str] = Field("evento", max_length=50)
    grade: Optional[str] = Field(None, max_length=20)
    grupo: Optional[str] = Field(None, max_length=20)

class CalendarEventResponse(BaseModel):
    id: UUID
    title: str
    description: Optional[str] = None
    event_date: date
    event_type: str
    grade: Optional[str] = None
    grupo: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# ============= CHATBOT =============

class ChatbotRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=5000)
    history: Optional[List[dict]] = []
    subject: Optional[str] = Field(None, max_length=100)

class ChatbotResponse(BaseModel):
    reply: str
