from sqlalchemy import Column, String, Integer, Numeric, DateTime, Boolean, Text, Date, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
import uuid
from .database import Base

class Grade(Base):
    __tablename__ = "grades"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    enrollment_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    assignment_id = Column(UUID(as_uuid=True), nullable=False)
    period_id = Column(Integer, nullable=False, index=True)

    score_saber = Column(Numeric(3,2), default=1.0)
    score_hacer = Column(Numeric(3,2), default=1.0)
    score_ser = Column(Numeric(3,2), default=1.0)

    final_period_score = Column(Numeric(3,2))
    performance_level = Column(String)
    updated_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        Index("ix_grades_enrollment_period", "enrollment_id", "period_id"),
    )

class Student(Base):
    __tablename__ = "students"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name = Column(String, nullable=False)
    document_id = Column(String, unique=True, index=True)
    email = Column(String, unique=True)
    grade = Column(String, default="11", index=True)
    grupo = Column(String, default="1", index=True)

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)

class Exam(Base):
    __tablename__ = "exams"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String, nullable=False)
    subject = Column(String, nullable=False, default="Matemáticas")
    grade = Column(String, index=True)
    grupo = Column(String, index=True)
    period_id = Column(Integer, index=True)
    answer_key = Column(JSONB)
    total_questions = Column(Integer, default=25)
    created_at = Column(DateTime, server_default=func.now())

class ExamResult(Base):
    __tablename__ = "exam_results"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exam_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    student_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    answers = Column(JSONB)
    score = Column(Numeric(3, 2))
    ai_feedback = Column(Text)
    ai_suggestions = Column(Text)
    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        Index("ix_exam_results_student_exam", "student_id", "exam_id"),
    )

class Message(Base):
    __tablename__ = "messages"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sender_type = Column(String, nullable=False)
    sender_id = Column(String, nullable=False, index=True)
    receiver_type = Column(String, nullable=False)
    receiver_id = Column(String, nullable=False, index=True)
    content = Column(Text)
    media_type = Column(String, default="text")
    media_url = Column(String)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        # Para listar conversación entre dos usuarios ordenando por fecha
        Index("ix_messages_pair_created", "sender_id", "receiver_id", "created_at"),
        # Acelerar el contador de no leídos
        Index("ix_messages_receiver_unread", "receiver_id", "is_read"),
    )

class CalendarEvent(Base):
    __tablename__ = "calendar_events"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    event_date = Column(Date, nullable=False, index=True)
    event_type = Column(String, default="evento")  # evaluacion | actividad | evento | otro
    grade = Column(String, nullable=True, index=True)
    grupo = Column(String, nullable=True, index=True)
    created_at = Column(DateTime, server_default=func.now())