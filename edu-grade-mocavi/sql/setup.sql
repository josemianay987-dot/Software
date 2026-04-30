-- Índices recomendados para mejorar el rendimiento de consultas frecuentes.
-- Aplicar como usuario `postgres` (las tablas existen con dicho dueño):
--   sudo -u postgres psql -d mocavi_db -f sql/setup.sql

CREATE INDEX IF NOT EXISTS ix_grades_enrollment_id        ON grades(enrollment_id);
CREATE INDEX IF NOT EXISTS ix_grades_period_id            ON grades(period_id);
CREATE INDEX IF NOT EXISTS ix_grades_enrollment_period    ON grades(enrollment_id, period_id);

CREATE INDEX IF NOT EXISTS ix_students_grade              ON students(grade);
CREATE INDEX IF NOT EXISTS ix_students_grupo              ON students(grupo);

CREATE INDEX IF NOT EXISTS ix_exam_results_exam_id        ON exam_results(exam_id);
CREATE INDEX IF NOT EXISTS ix_exam_results_student_id     ON exam_results(student_id);
CREATE INDEX IF NOT EXISTS ix_exam_results_student_exam   ON exam_results(student_id, exam_id);

CREATE INDEX IF NOT EXISTS ix_exams_grade                 ON exams(grade);
CREATE INDEX IF NOT EXISTS ix_exams_grupo                 ON exams(grupo);
CREATE INDEX IF NOT EXISTS ix_exams_period_id             ON exams(period_id);

CREATE INDEX IF NOT EXISTS ix_messages_sender_id          ON messages(sender_id);
CREATE INDEX IF NOT EXISTS ix_messages_receiver_id        ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS ix_messages_pair_created       ON messages(sender_id, receiver_id, created_at);
CREATE INDEX IF NOT EXISTS ix_messages_receiver_unread    ON messages(receiver_id, is_read);

-- calendar_events ya pertenece a josemi; sus índices se crean automáticamente
-- desde models.py al arrancar el backend.
