# KNOWTIFY — Documentación Técnica Detallada

> **Versión:** 2.1 · **Equipo:** Jose · Selenis · Marinelly Dev Studio © 2026
> **Última actualización:** Abril 2026 (refactor de seguridad, rendimiento y fluidez)

---

## Tabla de Contenidos

1. [Arquitectura General](#1-arquitectura-general)
2. [Stack Tecnológico](#2-stack-tecnológico)
3. [Estructura de Archivos](#3-estructura-de-archivos)
4. [Backend — API REST y WebSocket](#4-backend--api-rest-y-websocket)
   - 4.1 [Configuración y puesta en marcha](#41-configuración-y-puesta-en-marcha)
   - 4.2 [Modelos de base de datos](#42-modelos-de-base-de-datos)
   - 4.3 [Schemas Pydantic](#43-schemas-pydantic)
   - 4.4 [Endpoints documentados](#44-endpoints-documentados)
   - 4.5 [WebSocket de mensajería en tiempo real](#45-websocket-de-mensajería-en-tiempo-real)
   - 4.6 [Integración con Gemini AI](#46-integración-con-gemini-ai)
   - 4.7 [Rate limiting](#47-rate-limiting)
5. [Frontend — Next.js](#5-frontend--nextjs)
   - 5.1 [Configuración del proyecto](#51-configuración-del-proyecto)
   - 5.2 [Árbol de rutas (App Router)](#52-árbol-de-rutas-app-router)
   - 5.3 [Cliente API central (`lib/api.js`)](#53-cliente-api-central-libapijs)
   - 5.4 [Páginas y componentes](#54-páginas-y-componentes)
   - 5.5 [Estado y flujos de datos](#55-estado-y-flujos-de-datos)
   - 5.6 [Sistema de temas (Dark/Light)](#56-sistema-de-temas-darklight)
6. [Guía de Estilos y Animaciones](#6-guía-de-estilos-y-animaciones)
7. [Autenticación y Sesiones (JWT)](#7-autenticación-y-sesiones-jwt)
8. [Flujos de Negocio Principales](#8-flujos-de-negocio-principales)
9. [Instalación y Despliegue](#9-instalación-y-despliegue)
10. [Variables de Entorno](#10-variables-de-entorno)
11. [Decisiones de Diseño y Notas Técnicas](#11-decisiones-de-diseño-y-notas-técnicas)
12. [Historial de Cambios (v2.0 → v2.1)](#12-historial-de-cambios-v20--v21)

---

## 1. Arquitectura General

KNOWTIFY es una plataforma educativa de gestión de notas con calificación asistida por Inteligencia Artificial. Sigue una arquitectura cliente-servidor desacoplada con autenticación basada en JWT y comunicación en tiempo real por WebSocket.

```
┌────────────────────────────────────────────────────┐
│                   NAVEGADOR                        │
│   Next.js 16 (React 19) — localhost:3000           │
│   ┌─────────────┐  ┌─────────────┐  ┌──────────┐  │
│   │  Portal     │  │  Portal     │  │  Tutor   │  │
│   │  Docente    │  │ Estudiante  │  │    IA    │  │
│   └──────┬──────┘  └──────┬──────┘  └────┬─────┘  │
│          └─────── lib/api.js ─────────────┘        │
└──────────┼────────────────┼──────────────┼─────────┘
           │  HTTP REST (Bearer JWT) / WebSocket(JWT) │
           ▼                               ▼
┌────────────────────────────────────────────────────┐
│              FastAPI — localhost:8000              │
│  ┌──────────┐ ┌──────────┐ ┌────────┐ ┌────────┐   │
│  │ Auth+JWT │ │Students/ │ │ Exams/ │ │  WS    │   │
│  │ /login   │ │ Grades   │ │  IA    │ │ /ws/{t}│   │
│  └──────────┘ └──────────┘ └───┬────┘ └────────┘   │
│  GZip · CORS · slowapi rate-limit · bcrypt         │
│                                │                   │
│                         Google Gemini API          │
└────────────────┬───────────────────────────────────┘
                 │ SQLAlchemy ORM (índices BD optimizados)
                 ▼
┌────────────────────────────────────────────────────┐
│           PostgreSQL — mocavi_db                   │
│  students │ users │ grades │ exams │ exam_results  │
│  messages │ calendar_events                        │
└────────────────────────────────────────────────────┘
```

### Principios arquitectónicos

- **Autenticación basada en JWT (HS256).** El backend emite un token al iniciar sesión; todas las rutas protegidas exigen `Authorization: Bearer <token>`. La autorización por rol (`teacher` / `student`) se valida en dependencias FastAPI: `get_current_teacher`, `get_current_student`, `get_current_user`.
- **Contraseñas con bcrypt (12 rounds).** El campo `hashed_password` ya no es texto plano; `auth.verify_password` valida con `bcrypt.checkpw`.
- **Estudiantes sin contraseña** (decisión de producto): inician sesión con su `document_id`. El backend igual emite JWT firmado.
- **Rate limiting** con `slowapi` en endpoints sensibles: login, importación masiva, calificador IA y chatbot.
- **GZip automático** en respuestas > 1 KB (≈60% menos ancho de banda en listados grandes).
- **Cliente API centralizado en frontend** con auto-logout en 401 y soporte de cancelación (`AbortController`).
- **Modelo Gemini dinámico**: el primer modelo `flash` con `generateContent` disponible se selecciona al arrancar.

---

## 2. Stack Tecnológico

### Backend

| Tecnología | Rol |
|---|---|
| Python ≥ 3.11 | Lenguaje principal |
| FastAPI | Framework web asíncrono |
| Uvicorn | Servidor ASGI |
| SQLAlchemy 2 | ORM |
| psycopg2-binary | Driver PostgreSQL |
| Pydantic v2 | Validación de esquemas (`field_validator`, `pattern`) |
| **PyJWT** | Emisión/verificación de tokens JWT |
| **bcrypt** | Hash de contraseñas |
| **slowapi** | Rate limiting basado en IP |
| **email-validator** | Validación de emails (Pydantic `EmailStr`) |
| google-genai | Cliente oficial de Google Gemini |
| pandas + openpyxl | Importación de Excel/CSV |
| python-dotenv | Variables de entorno |

### Frontend

| Tecnología | Versión | Rol |
|---|---|---|
| Next.js | 16.2.2 | Framework React (App Router, Turbopack en dev) |
| React | 19.2.4 | Librería de UI |
| TailwindCSS | ^4 | Estilos utilitarios |
| next-themes | ^0.4.6 | Sistema de temas Dark/Light |
| lucide-react | ^1.7.0 | Iconografía |
| recharts | ^3.8.1 | Gráficos (cargado en `dynamic import`) |

### Infraestructura

| Componente | Detalle |
|---|---|
| Base de datos | PostgreSQL · Base: `mocavi_db` · Índices optimizados (`sql/setup.sql`) |
| IA | Google Gemini Flash (selección automática del modelo activo) |
| Compresión HTTP | `GZipMiddleware` (umbral 1 KB) |
| Comunicación tiempo real | WebSocket FastAPI autenticado por JWT |

---

## 3. Estructura de Archivos

```
/Software
├── DOCUMENTACION_DETALLADA.md          ← Este archivo
├── examen matematicas-2.pdf            ← Archivo de prueba para el calificador IA
│
├── edu-grade-mocavi/                   ← BACKEND
│   ├── .env                            ← DB + Gemini + JWT_SECRET + ENVIRONMENT
│   ├── .env.example                    ← Plantilla
│   ├── requirements.txt                ← Dependencias Python
│   ├── .venv/                          ← Entorno virtual
│   ├── sql/
│   │   └── setup.sql                   ← Índices BD recomendados
│   └── app/
│       ├── __init__.py
│       ├── auth.py                     ← JWT + bcrypt + dependencias de rol
│       ├── database.py                 ← Engine + pool (echo gate por SQL_ECHO)
│       ├── models.py                   ← Modelos ORM con índices declarativos
│       ├── schemas.py                  ← Schemas Pydantic v2
│       └── main.py                     ← Endpoints REST + WS + middlewares
│
└── frontend/                           ← FRONTEND
    ├── .env.local                      ← NEXT_PUBLIC_API_URL
    ├── package.json
    ├── next.config.mjs
    ├── postcss.config.mjs
    └── src/
        ├── lib/
        │   └── api.js                  ← Cliente HTTP central (Bearer + 401 logout)
        ├── components/
        │   ├── ThemeProvider.jsx       ← Wrapper next-themes
        │   ├── ThemeToggle.jsx         ← Botón Sun/Moon
        │   └── ExamErrorChart.jsx      ← Gráfico recharts (dynamic import)
        └── app/
            ├── layout.js               ← Root layout (fonts + ThemeProvider)
            ├── globals.css             ← Keyframes + clases de animación
            ├── page.js                 ← Portal Docente (~2470 líneas)
            └── dashboard/
                └── estudiante/
                    ├── page.js         ← Dashboard del estudiante
                    ├── chat/page.js    ← Chatbot IA
                    ├── mensajes/page.js ← Mensajería estudiante ↔ docente
                    └── periodo/[id]/page.js ← Detalle de exámenes por periodo
```

---

## 4. Backend — API REST y WebSocket

### 4.1 Configuración y puesta en marcha

**`edu-grade-mocavi/app/database.py`** — engine con pool y `echo` controlado por `SQL_ECHO=1` (apagado por defecto, incluso en desarrollo, para no saturar la consola ni añadir latencia).

```python
SQL_ECHO = os.getenv("SQL_ECHO", "0") == "1"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    echo=SQL_ECHO,
    poolclass=QueuePool,
    pool_size=10, max_overflow=20,
    pool_recycle=3600,    # reciclar conexiones cada hora
    pool_pre_ping=True,   # verificar antes de usar
)
```

**`main.py`** monta los siguientes middlewares en orden:

```python
app.add_middleware(CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,        # configurable por .env
    allow_credentials=True,
    allow_methods=["GET","POST","PUT","DELETE","OPTIONS"],
    allow_headers=["Content-Type","Authorization"])

app.add_middleware(GZipMiddleware, minimum_size=1024)
```

**`auth.py`** — utilidades reutilizables:

```python
hash_password(password)          # bcrypt 12 rounds
verify_password(pwd, hashed)
create_access_token(data, ttl?)  # firma HS256, exp = JWT_EXPIRATION_MINUTES
verify_token(token)              # decodifica y valida exp

# Dependencias FastAPI:
get_current_user(creds: HTTPAuthorizationCredentials)
get_current_teacher(...)         # exige role == "teacher"
get_current_student(...)         # exige role == "student"
```

---

### 4.2 Modelos de base de datos

Todas las tablas están declaradas en `app/models.py`. **Los índices se declaran a nivel de modelo** y se replican en `sql/setup.sql` para tablas pre-existentes (que pertenecen al rol `postgres`).

#### `students`
| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID (PK) | Identificador único |
| `full_name` | String | Nombre completo |
| `document_id` | String (único, **indexado**) | Cédula |
| `email` | String (único, nullable) | Correo |
| `grade` | String (**indexado**) | Grado académico |
| `grupo` | String (**indexado**) | Grupo |

#### `users` (docentes)
| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID (PK) | Identificador único |
| `username` | String (único, **indexado**) | Nombre de usuario |
| `hashed_password` | String | **Hash bcrypt (60 caracteres)** — nunca texto plano |
| `full_name` | String | Nombre completo |

#### `grades`
| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID (PK) | Identificador único |
| `enrollment_id` | UUID (**indexado**) | Estudiante |
| `assignment_id` | UUID | Asignación |
| `period_id` | Integer (**indexado**) | Periodo (1-4) |
| `score_saber/hacer/ser` | Numeric(3,2) | Cada dimensión 1.0–5.0 |
| `final_period_score` | Numeric(3,2) | Promedio calculado |
| `performance_level` | String | SUPERIOR / ALTO / BÁSICO / BAJO |
| `updated_at` | DateTime | Última actualización |

> Índice compuesto: `(enrollment_id, period_id)` para acelerar el upsert de notas.

**Lógica de calificación:**
```
final = (saber + hacer + ser) / 3
SUPERIOR → final ≥ 4.6 · ALTO → ≥ 4.0 · BÁSICO → ≥ 3.0 · BAJO → < 3.0
```

#### `exams`
| Campo | Tipo |
|---|---|
| `id` | UUID (PK) |
| `title` | String |
| `subject` | String |
| `grade`, `grupo`, `period_id` | String / String / Integer (**todos indexados**) |
| `answer_key` | JSONB |
| `total_questions` | Integer |
| `created_at` | DateTime |

#### `exam_results`
| Campo | Tipo |
|---|---|
| `id` | UUID (PK) |
| `exam_id` | UUID (**indexado**) |
| `student_id` | UUID (**indexado**) |
| `answers` | JSONB |
| `score` | Numeric(3,2) |
| `ai_feedback` | Text |
| `ai_suggestions` | Text |
| `created_at` | DateTime |

> Índice compuesto: `(student_id, exam_id)`.

**Estructura del campo `answers` (JSONB):**
```json
[
  {"q": 1, "selected": "A", "correct": "D", "is_correct": false, "why_wrong": "..."},
  {"q": 2, "selected": "C", "correct": "C", "is_correct": true,  "why_wrong": null}
]
```

#### `messages`
| Campo | Tipo |
|---|---|
| `id` | UUID (PK) |
| `sender_type` | String (`teacher` / `student`) |
| `sender_id` | String (**indexado**) — UUID de docente o `document_id` de estudiante |
| `receiver_type` | String |
| `receiver_id` | String (**indexado**) |
| `content` | Text |
| `media_type` | String (`text` / `image` / `file`) |
| `media_url` | String (nullable) |
| `is_read` | Boolean |
| `created_at` | DateTime |

> Índices compuestos:
> - `(sender_id, receiver_id, created_at)` — listado ordenado de un hilo entre dos usuarios
> - `(receiver_id, is_read)` — contador de no-leídos

#### `calendar_events`
| Campo | Tipo |
|---|---|
| `id` | UUID (PK) |
| `title` | String |
| `description` | Text (nullable) |
| `event_date` | Date (**indexado**) |
| `event_type` | String (`evaluacion` / `actividad` / `evento` / `otro`) |
| `grade`, `grupo` | String (nullable, **indexados**) |
| `created_at` | DateTime |

---

### 4.3 Schemas Pydantic

Migrados a Pydantic v2 (`pattern=` en lugar de `regex=`, `@field_validator` en lugar de `@validator`).

| Schema | Uso |
|---|---|
| `TeacherLogin` | POST `/login/teacher` — `username` + `password` (≥ 8) |
| `StudentLogin` | POST `/login/student` — `document_id` (≥ 5) |
| `TokenResponse` | Respuesta de login: `access_token`, `token_type`, `role`, `user` |
| `StudentCreate` / `StudentResponse` | CRUD de estudiantes |
| `GradeCreate` / `GradeResponse` | Notas por periodo |
| `ExamCreate` / `ExamResponse` | Exámenes |
| `ExamResultResponse` | Resultados por estudiante |
| `MessageCreate` / `MessageResponse` | Mensajería |
| `CalendarEventCreate` / `CalendarEventResponse` | Eventos del calendario |
| `ChatbotRequest` / `ChatbotResponse` | Tutor IA |

---

### 4.4 Endpoints documentados

> **Convención:** todos los endpoints (excepto los login) requieren `Authorization: Bearer <token>`. El rol válido se valida en la dependencia.

#### Autenticación

| Método | Ruta | Auth | Rate-limit | Descripción |
|---|---|---|---|---|
| `POST` | `/login/teacher` | — | 5/min | Login docente con bcrypt |
| `POST` | `/login/student` | — | 10/min | Login estudiante con `document_id` |

**Body teacher:** `{"username": "...", "password": "..."}`
**Body student:** `{"document_id": "..."}`

**Respuesta** (`TokenResponse`):
```json
{
  "access_token": "eyJhbGciOi...",
  "token_type": "bearer",
  "role": "teacher",
  "user": {"id": "...", "username": "..."}
}
```

**Claims del JWT:**
- `sub`: para docentes es `user.id` (UUID); para estudiantes es `document_id`
- `role`: `"teacher"` o `"student"`
- `student_id` o `username`: claim auxiliar
- `exp`: timestamp UNIX

---

#### Estudiantes

| Método | Ruta | Auth | Rate-limit | Descripción |
|---|---|---|---|---|
| `GET` | `/students/` | teacher | — | Listar estudiantes (filtros: `grade`, `grupo`) |
| `POST` | `/students/` | teacher | — | Crear estudiante |
| `POST` | `/students/bulk` | teacher | 10/min | Importación masiva CSV/Excel |
| `DELETE` | `/students/{id}` | teacher | — | Eliminar estudiante y sus notas |
| `GET` | `/student/dashboard` | student | — | Dashboard del estudiante autenticado (sin params; lee `student_id` del JWT) |

**POST `/students/bulk`** — Importación inteligente:
- Validación de **MIME-type**: rechaza con 422 si el `Content-Type` no es CSV/Excel.
- Tamaño máximo 10 MB.
- Detecta columnas por keywords (sin requerir nombres exactos): `nombre`, `documento/cedula/identificacion`, `correo/email/mail`.
- Devuelve `{"created": N, "skipped": M}`.

---

#### Notas

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/grades/` | teacher | Listar notas (filtro opcional: `period_id`) |
| `POST` | `/grades/` | teacher | Upsert por `(enrollment_id, period_id)` |

`POST /grades/` calcula automáticamente `final_period_score` y `performance_level`.

---

#### Calificador IA

| Método | Ruta | Auth | Rate-limit | Descripción |
|---|---|---|---|---|
| `POST` | `/upload-exams` | teacher | 12/min | Calificación masiva con Gemini Vision |

**Form data:** `file` (PNG/JPG/WEBP/PDF, ≤ 20 MB), `answer_key` (JSON), `subject`, `grade`, `grupo`, `period_id`.

**Validación de MIME-type** explícita: solo `image/png`, `image/jpeg`, `image/webp`, `application/pdf`.

**Flujo interno:**
1. Envía imagen + prompt a Gemini Vision (timeout 30 s, 3 reintentos con backoff 2s/4s ante 503).
2. Extrae el JSON de la respuesta (maneja bloques ` ```json `).
3. Crea registro `Exam` y, por cada estudiante detectado, busca por nombre exacto y luego por primer nombre.
4. Inserta o actualiza `ExamResult`.

---

#### Estadísticas y consultas

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/exams/` | teacher | Listar exámenes (filtros) |
| `GET` | `/exams/{exam_id}/stats` | teacher | Estadísticas por pregunta |
| `GET` | `/students/{student_id}/exam-results` | teacher / student* | Resultados por estudiante |

(*) Un estudiante autenticado solo puede consultar **sus propios** resultados; la dependencia compara `student_id` del JWT con el path param.

**Respuesta de `/exams/{exam_id}/stats`:**
```json
{
  "exam_id": "...",
  "subject": "Matemáticas",
  "total_students": 15,
  "stats": [{"question": 3, "errors": 12, "error_rate": 80.0}],
  "hardest_questions": [...]
}
```

---

#### Mensajería

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/messages/` | usuario | Enviar mensaje (notifica por WS si receptor está conectado) |
| `GET` | `/messages/` | usuario | Hilo entre `user_id` y `other_id` (paginado: `skip`, `limit=50`) — marca leídos |
| `GET` | `/messages/unread-count` | usuario | Contador de no-leídos |
| `GET` | `/messages/conversations` | usuario | Lista de conversaciones con preview |

**Validaciones de seguridad:**
- `POST /messages/`: el backend verifica que `msg.sender_id == current_user.sub`. Un usuario no puede enviar suplantando.
- `GET /messages/*`: `user_id` debe coincidir con `sub` del JWT.

**`GET /messages/conversations`** está optimizado para evitar **N+1** queries: se ejecutan 4 consultas fijas (mensajes, conteo agrupado por sender, students en bulk, users en bulk) sin importar cuántas conversaciones haya. Para identificar al "otro" se consulta primero por `Student.document_id`; si su valor parece UUID se intenta también `User.id` (los IDs no-UUID se filtran para evitar `InvalidTextRepresentation` de PostgreSQL).

---

#### Docentes

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/teachers/default` | usuario | Devuelve el docente por defecto (primero registrado) — usado por el portal del estudiante para saber a quién enviar mensajes |

Respuesta: `{"id": "<uuid>", "username": "...", "full_name": "..."}`.

---

#### Calendario de eventos

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/events/` | usuario | Listar (filtros: `grade`, `grupo`, `month`, `year`) |
| `GET` | `/events/upcoming` | usuario | Próximos N días (default 7) |
| `POST` | `/events/` | teacher | Crear evento |
| `PUT` | `/events/{id}` | teacher | Actualizar |
| `DELETE` | `/events/{id}` | teacher | Eliminar |

---

#### Chatbot IA

| Método | Ruta | Auth | Rate-limit | Descripción |
|---|---|---|---|---|
| `POST` | `/chatbot` | student | 20/min | Tutor académico con historial |

**Body:**
```json
{
  "message": "¿Cómo se resuelve una ecuación cuadrática?",
  "history": [{"user": "...", "bot": "..."}],
  "subject": "Matemáticas"
}
```
Mantiene los últimos 6 intercambios como contexto. Reintentos ante 503 (igual que el calificador).

---

### 4.5 WebSocket de mensajería en tiempo real

**Ruta:** `ws://localhost:8000/ws/{token}` — el path-param es **el JWT**, no el `user_id`.

```python
@app.websocket("/ws/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str):
    payload = auth.verify_token(token)        # 401 si firma/exp inválido
    user_id = payload.get("sub")
    await websocket.accept()
    ws_connections[user_id] = websocket
    try:
        while True:
            await websocket.receive_text()    # mantener vivo
    except WebSocketDisconnect:
        ws_connections.pop(user_id, None)
```

**Notificación push:** cuando se inserta un mensaje vía `POST /messages/`, si el `receiver_id` tiene una conexión WS activa, se le envía el JSON inmediatamente.

**Respaldo:** los clientes hacen polling ligero cada **30 s** (antes 8/15 s) — basta para reconciliar tras desconexiones del WS.

---

### 4.6 Integración con Gemini AI

```python
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def get_active_model_name() -> str:
    for m in client.models.list():
        if 'generateContent' in (m.supported_actions or []) and 'flash' in m.name:
            return m.name
    return 'gemini-2.0-flash'  # fallback

MODEL_NAME = get_active_model_name()  # se fija al arrancar
GEMINI_TIMEOUT = 30  # segundos
```

**Estrategia de reintentos** (común a `/upload-exams` y `/chatbot`):
```python
for attempt in range(3):
    try:
        response = await asyncio.wait_for(
            asyncio.to_thread(client.models.generate_content, ...),
            timeout=GEMINI_TIMEOUT)
        break
    except asyncio.TimeoutError:
        if attempt < 2: await asyncio.sleep((attempt + 1) * 2); continue
        raise
    except Exception as e:
        if ("503" in str(e) or "UNAVAILABLE" in str(e)) and attempt < 2:
            await asyncio.sleep((attempt + 1) * 2); continue
        raise
```

---

### 4.7 Rate limiting

`slowapi` está montado al arranque:
```python
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
```

Todos los endpoints decorados con `@limiter.limit(...)` reciben el `Request` como primer argumento (requisito del paquete).

| Endpoint | Límite |
|---|---|
| `/login/teacher` | 5 / min |
| `/login/student` | 10 / min |
| `/students/bulk` | 10 / min |
| `/upload-exams` | 12 / min |
| `/chatbot` | 20 / min |

Al exceder el límite, slowapi devuelve `429 Too Many Requests`.

---

## 5. Frontend — Next.js

### 5.1 Configuración del proyecto

- **`next.config.mjs`:** configuración mínima (Turbopack en dev).
- **`postcss.config.mjs`:** integra `@tailwindcss/postcss`.
- **`jsconfig.json`:** alias `@/` → `./src/`.
- **Fuentes:** Geist Sans / Geist Mono cargadas con `next/font/google`.

---

### 5.2 Árbol de rutas (App Router)

```
/                                  → Login + Dashboard Docente (page.js)
/dashboard/estudiante              → Dashboard del Estudiante
/dashboard/estudiante/chat         → Chatbot Tutor IA
/dashboard/estudiante/mensajes     → Mensajería Estudiante ↔ Docente
/dashboard/estudiante/periodo/[id] → Detalle de exámenes de un periodo
```

---

### 5.3 Cliente API central (`lib/api.js`)

Toda comunicación con el backend pasa por `src/lib/api.js`:

```javascript
import { api, ApiError } from "@/lib/api";

const data = await api.get("/students/");
await api.post("/grades/", { ... });
await api.put(`/events/${id}`, body);
await api.del(`/events/${id}`);
await api.postForm("/upload-exams", formData);   // multipart
```

**Características:**

- **Inyecta automáticamente** `Authorization: Bearer <token>` desde `localStorage`.
- **Auto-logout en 401**: limpia `localStorage` y dispara el evento `mocavi:unauthorized` en `window`. Cada página escucha el evento y redirige a `/`.
- **Soporta `AbortController`**: `api.get(path, { signal })` cancela el fetch al desmontar.
- **Errores normalizados** en `ApiError` con `.status` y `.data` para que la UI pueda diferenciar 0 (error de red), 401 (sesión), 503 (Gemini saturado), etc.
- Conmuta automáticamente entre JSON y `multipart/form-data` (en `postForm` no fija `Content-Type`, deja que el navegador genere el boundary).

---

### 5.4 Páginas y componentes

#### `src/app/page.js` — Portal Docente

Archivo principal del docente (~2470 líneas). Tres vistas condicionales:

1. **Pantalla de carga** (`isLoading`): spinner centrado.
2. **Pantalla de login** (`!isAuthenticated`): selector docente/estudiante + formulario.
3. **Dashboard** (`isAuthenticated`): notas, calendario, mensajería, calificador IA.

**Estado destacado:**
```javascript
// Selección de clase
const [selectedGrade], [selectedGrupo], [selectedPeriodo]

// Datos
const [students]                // lista actual
const [aiResults]               // resultados del calificador IA
const [examStats]               // estadísticas por pregunta

// Calendario
const [calendarEvents], [upcomingEvents], [calendarMonth], [calendarYear]
const [showEventModal], [editingEvent], [eventForm]

// Mensajería
const [conversations], [activeConv], [convMessages], [unreadCount]
```

**Funciones principales** (todas pasan por `lib/api`):

| Función | Descripción |
|---|---|
| `handleLogin()` | `api.post("/login/teacher")` o `/login/student` |
| `fetchData(signal)` | Carga estudiantes + notas en paralelo. Indexa notas en `Map` para evitar O(N²). |
| `saveGrade(student)` | `api.post("/grades/", ...)` con upsert |
| `handleAddStudent()` / `handleBulkImport()` / `deleteStudent()` | CRUD básico |
| `handleBulkUpload()` | `api.postForm("/upload-exams", ...)` |
| `fetchUnread(signal)` / `fetchConversations()` / `openConversation()` / `sendReply()` | Mensajería |
| `fetchCalendarEvents/Upcoming` / `saveEvent` / `deleteEvent` | Calendario |
| `fetchExamStats(examId)` | Carga estadísticas → render con `<ExamErrorChart>` |

**Polling y AbortController:**
- Mensajes no leídos: cada **30 s** (antes 10 s).
- Próximos eventos: cada **5 min**.
- Cada `useEffect` crea su `AbortController` y aborta al desmontar/cambiar dependencia, evitando race conditions.

**Auto-logout:** un `useEffect` escucha `mocavi:unauthorized` y limpia el estado del docente.

---

#### `src/components/ExamErrorChart.jsx` — Gráfico recharts diferido

Aísla `recharts` (~120 KB) en un componente propio que se carga con `next/dynamic({ ssr: false })`. El bundle inicial del docente queda ~120 KB más liviano; la librería sólo se descarga al abrir el modal de estadísticas del calificador IA.

```javascript
// page.js
const ExamErrorChart = dynamic(() => import("@/components/ExamErrorChart"), { ssr: false });
// ... más adelante
<ExamErrorChart stats={examStats.stats} height={220} />
```

---

#### `src/app/dashboard/estudiante/page.js` — Dashboard Estudiante

- `api.get("/student/dashboard")` (sin query params; el backend lee el `student_id` del JWT).
- Hero card con nombre, promedio general y nivel.
- Grid de cards por periodo (clickeables → `/dashboard/estudiante/periodo/[id]`).
- Badge de mensajes no leídos (WebSocket + polling **30 s**).
- Botones flotantes: **Tutor IA** (violet) y **Mensajes** (indigo).
- Auto-logout en 401.

---

#### `src/app/dashboard/estudiante/chat/page.js` — Chatbot IA

- Componente `MarkdownText` (parser ligero local) — soporta `#`, `**`, `*`, listas numeradas y con viñetas.
- `api.post("/chatbot", { message, history })` — el cliente envía Bearer JWT automáticamente.
- Mensajes de error usan `ApiError.message` para distinguir saturación, sesión, etc.

---

#### `src/app/dashboard/estudiante/mensajes/page.js` — Mensajería

- Al montar:
  1. Resuelve el `teacher_id` real con `api.get("/teachers/default")` (antes hardcodeado a `"admin"`).
  2. Conecta WebSocket a `/ws/{token}` y arranca polling de 30 s como respaldo.
- `loadMessages(sid, tid, signal)` carga el hilo entre el estudiante y el docente.
- `send()` usa `api.post("/messages/", ...)`.
- Cancelación con `AbortController` al cambiar de página.

---

#### `src/app/dashboard/estudiante/periodo/[id]/page.js` — Detalle de Periodo

- `api.get(/students/${id}/exam-results?period_id=${periodId})` (el backend permite que el estudiante solo vea sus propios resultados).
- Accordion expandible por examen. Muestra: nota, correctas/incorrectas, feedback IA, sugerencias y explicación de errores.
- Reutiliza un `MarkdownText` local (duplicado con `/chat`; candidato a extracción).

---

#### `src/components/ThemeProvider.jsx`

```jsx
<NextThemesProvider attribute="class" defaultTheme="dark" enableSystem={false}>
  {children}
</NextThemesProvider>
```

Tema predeterminado: oscuro. Aplica clase `.dark` en `<html>`.

#### `src/components/ThemeToggle.jsx`

Alterna entre `Sun` y `Moon` (lucide-react). Usa `mounted` para evitar problemas de hidratación SSR.

---

### 5.5 Estado y flujos de datos

**Persistencia en `localStorage`:**

| Clave | Valor | Descripción |
|---|---|---|
| `mocavi_token` | JWT firmado | Token Bearer (todas las llamadas autenticadas lo usan) |
| `mocavi_session` | `"teacher"` / `"student"` | Tipo de sesión |
| `mocavi_user` | JSON | Datos del docente logueado (id + username) |
| `mocavi_student` | JSON | Datos del estudiante logueado |
| `mocavi_grade/grupo/periodo` | String | Última selección del docente |

**Flujo de autenticación:**
```
Login → POST /login/teacher | /login/student
  → response { access_token, role, user }
  → localStorage.setItem("mocavi_token", access_token)
  → role === "student" → router.push("/dashboard/estudiante")
  → role === "teacher" → setIsAuthenticated(true)
```

**Recuperación de sesión al recargar:**
```javascript
const sessionActive = localStorage.getItem("mocavi_session");
const token = localStorage.getItem("mocavi_token");
if (sessionActive === "teacher" && token) setIsAuthenticated(true);
else if (sessionActive === "student" && token) router.push("/dashboard/estudiante");
```

**Cierre de sesión** limpia las cuatro claves principales (`mocavi_token`, `mocavi_session`, `mocavi_user`, `mocavi_student`).

---

### 5.6 Sistema de temas (Dark/Light)

Tailwind v4 usa la variante `dark:` con el selector `.dark` en el padre:
```css
@variant dark (&:is(.dark *));
```

El `ThemeProvider` inyecta/remueve la clase `.dark` en `<html>`. Por defecto, oscuro.

---

## 6. Guía de Estilos y Animaciones

### Paleta principal

| Color | Clase Tailwind | Uso |
|---|---|---|
| Indigo | `indigo-600` | Portal docente, botones primarios, mensajes propios |
| Violet | `violet-600` | Portal estudiante, tutor IA |
| Emerald | `emerald-500` | Nivel SUPERIOR |
| Blue | `blue-500` | Nivel ALTO |
| Amber | `amber-500` | Nivel BÁSICO |
| Rose | `rose-500` | Nivel BAJO, badges, alertas |

### Niveles de desempeño

```javascript
const levelColor = (l) =>
  l === "SUPERIOR" ? "bg-emerald-500"
  : l === "ALTO"   ? "bg-blue-500"
  : l === "BÁSICO" ? "bg-amber-500"
  : "bg-rose-500";
```

### Keyframes (`globals.css`)

```css
@keyframes fadeIn / scaleIn / slideUp / slideInRight / springIn
@keyframes badgePop / overlayIn / drawerIn / drawerOut
@keyframes tabSwap / monthSlideLeft / monthSlideRight / popIn / softPulse
```

| Clase | Duración / Curva |
|---|---|
| `.animate-fadeIn` | 200 ms ease |
| `.animate-springIn` | 350 ms spring-bounce |
| `.animate-slideUp` | 300 ms spring |
| `.animate-badgePop` | 400 ms spring-bounce |
| `.animate-popIn` | 320 ms spring-bounce |
| `.modal-exit` | scaleIn reversa 200 ms |

**Curva spring usada:** `cubic-bezier(0.34, 1.2, 0.64, 1)`
**Curva spring-bounce:** `cubic-bezier(0.34, 1.56, 0.64, 1)`

### Animaciones escalonadas

```jsx
style={{ animationDelay: `${i * 80}ms` }}
className="animate-slideUp [animation-fill-mode:both]"
```

### Patrones de UI recurrentes

- **Card:** `bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700`
- **Botón primario:** `font-black py-3 px-5 rounded-2xl shadow-xl transition-all active:scale-95 hover:scale-[1.02]`
- **Input:** `bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500`
- **Badge notificación:** `bg-rose-500 text-white text-[10px] font-black rounded-full animate-badgePop`

---

## 7. Autenticación y Sesiones (JWT)

### Flujo del Docente

```
1. Selecciona "Docente" en login
2. Ingresa username + password
3. POST /login/teacher  (rate-limit 5/min)
4. Backend: bcrypt.checkpw(password, hashed_password)
5. Backend: JWT firmado HS256 con { sub: user.id, role: "teacher", username, exp }
6. Frontend: localStorage["mocavi_token"] = access_token
7. Cada petición posterior incluye Authorization: Bearer <token>
8. Logout: limpia localStorage y vuelve al formulario
```

### Flujo del Estudiante

```
1. Selecciona "Estudiante"
2. Ingresa document_id (sin contraseña — decisión de producto)
3. POST /login/student  (rate-limit 10/min)
4. Backend: busca document_id en tabla students
5. Backend: JWT con { sub: document_id, role: "student", student_id, exp }
6. Frontend guarda token + datos básicos del estudiante
7. router.push("/dashboard/estudiante")
```

### Validación en endpoints

```python
# Cualquier usuario autenticado
@app.get("/x")
def x(current_user: dict = Depends(auth.get_current_user)): ...

# Solo docentes
@app.post("/y")
def y(current_user: dict = Depends(auth.get_current_teacher)): ...

# Solo estudiantes
@app.post("/z")
def z(current_user: dict = Depends(auth.get_current_student)): ...
```

Errores estándar:
- **401** — token ausente, mal firmado o expirado.
- **403** — token válido pero rol incorrecto, o el usuario intenta acceder a recursos de otro.

### Auto-logout en frontend

`lib/api.js` detecta cualquier respuesta 401, limpia `localStorage` y dispara `window.dispatchEvent(new CustomEvent("mocavi:unauthorized"))`. Cada página escucha el evento y redirige al login. Esto cubre tokens expirados (`exp` vencido) y rotaciones de `JWT_SECRET_KEY`.

### Cifrado de contraseñas

```python
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")
```

Resultado: cadenas tipo `$2b$12$...` (60 caracteres). Verificación con `bcrypt.checkpw`.

### Cierre de sesión

```javascript
localStorage.removeItem("mocavi_session");
localStorage.removeItem("mocavi_token");
localStorage.removeItem("mocavi_user");
localStorage.removeItem("mocavi_student");
```

---

## 8. Flujos de Negocio Principales

### 8.1 Importación masiva de estudiantes

```
Docente → "Importar Excel"
→ Selecciona .xlsx / .csv
→ api.postForm("/students/bulk", formData)         # rate 10/min
→ Backend valida MIME + tamaño (≤ 10 MB)
→ pandas lee, detecta columnas por keywords
→ Por cada fila: si document_id no existe → INSERT; si existe → skip
→ {"created": N, "skipped": M}
→ Frontend refresca la lista
```

### 8.2 Calificación masiva IA

```
Docente sube imagen del examen + clave de respuestas
→ api.postForm("/upload-exams", ...)               # rate 12/min
→ Backend valida MIME (PNG/JPG/WEBP/PDF) + tamaño (≤ 20 MB)
→ Gemini Vision con timeout 30s y reintentos 503
→ Por cada estudiante detectado: crea/actualiza ExamResult
→ Frontend muestra resultados + estadísticas (recharts dynamic)
```

### 8.3 Mensajería en tiempo real

```
Estudiante → api.get("/teachers/default")  para obtener teacher_id real
→ api.post("/messages/", { sender_id: doc_id, receiver_id: teacher.id, ... })
→ Backend INSERT + push WebSocket si docente está conectado
→ Docente recibe notificación instantánea (o vía polling 30s)
→ Badge se actualiza
→ Docente abre widget → api.get("/messages/conversations?teacher_id=...")
   (consulta optimizada sin N+1)
→ Selecciona hilo → api.get("/messages/?user_id=teacher.id&other_id=doc_id")
   marca leídos automáticamente
→ Responde → api.post("/messages/", ...)
→ Estudiante recibe por WS o polling 30s
```

### 8.4 Edición de notas inline

```
Docente edita Saber/Hacer/Ser en la tabla
→ api.post("/grades/", { ... })   # upsert por (enrollment_id, period_id)
→ Backend calcula final_period_score y performance_level
→ Frontend actualiza solo la fila modificada (sin refetch)
```

---

## 9. Instalación y Despliegue

### Requisitos

- Python ≥ 3.11
- Node.js ≥ 18
- PostgreSQL ≥ 14
- API Key de Google Gemini

### 9.1 Configurar la base de datos

```sql
CREATE USER josemi WITH PASSWORD 'admin123';
CREATE DATABASE mocavi_db OWNER josemi;
GRANT ALL PRIVILEGES ON DATABASE mocavi_db TO josemi;
```

Las tablas se crean al iniciar el backend (`Base.metadata.create_all`).

**Aplicar índices de rendimiento** sobre tablas existentes que pertenezcan al rol `postgres`:
```bash
sudo -u postgres psql -d mocavi_db -f edu-grade-mocavi/sql/setup.sql
```

### 9.2 Configurar el backend

```bash
cd /home/josemi/Desktop/Software/edu-grade-mocavi
python3 -m venv .venv
source .venv/bin/activate

pip install -r requirements.txt
# Si una instalación previa quedó incompleta, asegurar:
# pip install "PyJWT>=2.8" "bcrypt>=4.1" "slowapi>=0.1.9" "email-validator>=2.0"

cp .env.example .env
```

**`.env` mínimo:**
```env
DATABASE_URL=postgresql://josemi:admin123@localhost/mocavi_db
GEMINI_API_KEY=tu_api_key
JWT_SECRET_KEY=clave_aleatoria_segura_minimo_32_bytes
JWT_EXPIRATION_MINUTES=1440
ENVIRONMENT=development
ALLOWED_ORIGINS=http://127.0.0.1:3000,http://localhost:3000
```

Generar un secret seguro:
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
```

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API disponible en `http://localhost:8000`. Swagger UI: `http://localhost:8000/docs`.

### 9.3 Configurar el frontend

```bash
cd /home/josemi/Desktop/Software/frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://127.0.0.1:8000" > .env.local
npm run dev
```

Frontend disponible en `http://localhost:3000`.

### 9.4 Crear usuario docente inicial

```python
# Desde una shell con el venv activo:
python -c "
from app.auth import hash_password
from app.database import SessionLocal
from app import models
db = SessionLocal()
db.add(models.User(username='admin', hashed_password=hash_password('admin1234'), full_name='Admin'))
db.commit()
"
```

> ⚠️ **Nunca insertar contraseñas en texto plano** directamente en SQL. La verificación usa `bcrypt.checkpw` y fallará silenciosamente.

### 9.5 Despliegue en producción

**Backend:**
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```
Recomendado tras un proxy reverso (nginx, Caddy) que termine TLS.

**Frontend:**
```bash
npm run build && npm run start
```
O Vercel apuntando `NEXT_PUBLIC_API_URL` al backend de producción.

**Checklist de producción:**
1. `ENVIRONMENT=production` y `ALLOWED_ORIGINS` con el dominio real (sin `*`).
2. `JWT_SECRET_KEY` rotado, ≥ 32 bytes, **fuera del repo**.
3. `GEMINI_API_KEY` igualmente fuera del repo y rotable.
4. HTTPS obligatorio (proxy reverso).
5. Aplicar `sql/setup.sql` para los índices BD.
6. Considerar `gunicorn -k uvicorn.workers.UvicornWorker` para mayor estabilidad.

---

## 10. Variables de Entorno

### Backend (`edu-grade-mocavi/.env`)

| Variable | Requerida | Default | Descripción |
|---|---|---|---|
| `DATABASE_URL` | sí | — | URL PostgreSQL |
| `GEMINI_API_KEY` | sí | — | API Key de Google Gemini |
| `JWT_SECRET_KEY` | sí | — | Secreto HS256 (≥ 32 bytes) |
| `JWT_EXPIRATION_MINUTES` | no | `1440` | Duración del token (24h por defecto) |
| `ENVIRONMENT` | no | `development` | `development` / `production` |
| `ALLOWED_ORIGINS` | no | `http://127.0.0.1:3000` | Lista CSV de orígenes CORS permitidos |
| `SQL_ECHO` | no | `0` | `1` para activar logs SQL detallados |

### Frontend (`frontend/.env.local`)

| Variable | Ejemplo | Descripción |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://127.0.0.1:8000` | URL base del backend (visible al navegador) |

> ⚠️ `NEXT_PUBLIC_*` se expone al cliente. Nunca colocar secretos con ese prefijo.

---

## 11. Decisiones de Diseño y Notas Técnicas

### JWT con `sub` distinto para docentes y estudiantes

- Docentes: `sub = user.id` (UUID).
- Estudiantes: `sub = document_id` (string).

Esto se eligió porque la mensajería identifica a los participantes por estos valores: el docente nunca tendrá un `document_id`, y el estudiante nunca tendrá un UUID en `User`. Mantener `sub` consistente con esos identificadores evita un mapeo extra en cada query y permite validar `msg.sender_id == current_user.sub` directamente.

### `get_conversations` rediseñado para evitar N+1

La versión anterior ejecutaba 3 queries por conversación (Student por document_id, User por id, count de no-leídos). Con N hilos eso eran 3·N + 1 queries. La versión actual usa 4 queries fijas: una por mensajes, una por unread agrupado por sender, una por students en bulk y una por users en bulk (sólo si hay UUIDs entre los "otros"). Beneficio práctico: el endpoint baja de cientos de ms con muchos hilos a tiempo casi constante.

Adicionalmente, antes lanzaba `User.id == "14141414"` y PostgreSQL devolvía `InvalidTextRepresentation` (UUID inválido). La nueva versión filtra los `other_id` que no parezcan UUID antes de consultar `users`.

### Cliente API central + auto-logout en 401

Antes había ≥ 20 llamadas `fetch()` distintas con headers manuales. Centralizar en `lib/api.js` da:

1. **Sin duplicación de headers** — `Authorization: Bearer <token>` se inyecta en un único punto.
2. **Auto-logout** ante token expirado o `JWT_SECRET_KEY` rotado — el evento `mocavi:unauthorized` lleva al login automáticamente.
3. **Cancelación uniforme** vía `AbortController` en todos los efectos.
4. **Errores tipados** (`ApiError`) que la UI puede inspeccionar (`status: 0` = red, `503` = Gemini saturado, etc.).

### `recharts` cargado con `next/dynamic`

`recharts` añade ~120 KB al bundle y solo se necesita en el modal de estadísticas del calificador IA. Se aisló en `components/ExamErrorChart.jsx` y se carga con `dynamic(() => import("..."), { ssr: false })`. Resultado: bundle inicial del docente más liviano sin perder funcionalidad.

> Nota: `next/dynamic` no funciona bien sobre subcomponentes individuales de recharts (como `<Bar/>` o `<XAxis/>`) porque la librería usa `React.Children.map` para detectar a sus hijos. Por eso el componente envolvente entero se carga dinámicamente.

### Polling reducido a 30s + WebSocket

Antes: 8 s en estudiante y 10 s en docente. Con WebSocket activo, el polling era redundante para latencia. Ahora 30 s sirve solo como respaldo si el WS se cae (proxies, suspensión del navegador). Reduce tráfico ~75% en sesiones inactivas.

### Apagar el `echo` de SQLAlchemy por defecto

La consola se llenaba de queries y la latencia perceptible aumentaba (~10–30 ms por request en local). Ahora `echo` se activa solo con `SQL_ECHO=1`, útil para depurar sin afectar el flujo normal.

### MarkdownText — por qué no `react-markdown`

Parser propio mínimo (encabezados, **negrita**, *cursiva*, listas) sin dependencias adicionales. Está duplicado en `chat/page.js` y `periodo/[id]/page.js` — candidato a extraer a `/components/MarkdownText.jsx`.

### Autenticación de estudiantes sin contraseña

Decisión de producto: el estudiante solo necesita ver sus notas. El `document_id` actúa como identificador único. En entornos con mayor exigencia de seguridad se debería añadir un PIN o fecha de nacimiento como segundo factor.

### `position: fixed` fuera del contenedor animado

Los elementos con `position: fixed` dentro de un contenedor que tiene un `transform` activo (como `animate-slideUp`) se anclan al contenedor transformado en vez del viewport. Por eso el widget de mensajes y el botón flotante del docente se renderizan **fuera** del `div` principal con animación.

### Modelo Gemini dinámico

El servidor selecciona el primer modelo `flash` con capacidad `generateContent` al arrancar. Si la detección falla, cae al fallback `gemini-2.0-flash`. Esto permite adaptar el sistema a cambios en la disponibilidad de modelos sin redeploy.

### Reintentos ante 503 de Gemini

Backoff de 2 s y 4 s, hasta 3 intentos. Tanto `/upload-exams` como `/chatbot` lo aplican. Hace el calificador IA significativamente más robusto en horas pico de la API.

---

## 12. Historial de Cambios (v2.0 → v2.1)

### Seguridad

- **JWT real** con HS256 (PyJWT). Reemplaza el token estático `"token-secreto"` y los headers `x-role`.
- **Bcrypt** para contraseñas (12 rounds). Detectado y reparado: la BD existente tenía la contraseña en texto plano.
- **Rate limiting** con `slowapi` en login (5–10/min), bulk import (10/min), upload-exams (12/min) y chatbot (20/min).
- **Validación MIME** explícita en uploads (CSV/Excel y PNG/JPG/WEBP/PDF).
- **WebSocket autenticado**: `/ws/{token}` valida JWT antes de aceptar la conexión.
- **CORS no-`*`**: `ALLOWED_ORIGINS` configurable; en `production` no se expanden los defaults.
- **Auto-logout en 401** desde el cliente API central.
- Mensajería: el backend valida que `sender_id == sub` y bloquea suplantación.
- Logout limpia las cuatro claves de `localStorage` (antes solo dos).

### Bugs corregidos

- `auth.py`: `HTTPAuthCredentials` → `HTTPAuthorizationCredentials` (no existía, fallaba el import).
- `schemas.py`: migración a Pydantic v2 (`pattern=` y `@field_validator`).
- `main.py`: `slowapi` requiere `request: Request` con tipo explícito.
- `get_conversations`: `User.id == "14141414"` reventaba PostgreSQL por UUID inválido — ahora se filtra.
- JWT teacher: `sub` unificado a `user.id` para evitar 403 en todas las llamadas a `/messages/*`.
- Mensajería estudiante: receptor era `"admin"` hardcodeado; ahora se resuelve con `/teachers/default`.
- `/students/{id}/exam-results` accesible para el propio estudiante (antes solo docentes).

### Rendimiento

- **GZipMiddleware** (umbral 1 KB) — comprobado: `/students/` baja de 1714 → 656 bytes (≈62%).
- **Índices BD** sobre columnas calientes y compuestos (`(enrollment_id, period_id)`, `(sender_id, receiver_id, created_at)`, `(receiver_id, is_read)`, etc.).
- **`get_conversations` sin N+1**: 4 queries fijas (antes 3·N+1).
- **`SQL_ECHO=0`** por defecto: consola limpia y menos latencia.
- **`fetchData` con `Map` indexado** en lugar de `Array.find()` por estudiante (O(N) en vez de O(N²)).
- **Polling 30 s** (antes 8/10 s) con WebSocket en paralelo.
- **`AbortController`** en todos los `useEffect` del frontend que disparan fetch.
- **`recharts` con dynamic import** — bundle inicial del docente más liviano.

### Frontend

- Nuevo `src/lib/api.js` (cliente HTTP central con `api.get/post/put/del/postForm`, `ApiError`, auto-logout en 401, soporte AbortController).
- Nuevo `src/components/ExamErrorChart.jsx`.
- Migración total: ya no quedan llamadas `fetch()` directas (excepto la propia en `lib/api.js`).
- Listener `mocavi:unauthorized` en docente y en cada página de estudiante.
- Nuevo endpoint `/teachers/default` para que el estudiante sepa con quién mensajearse.

### Variables de entorno nuevas

- `JWT_SECRET_KEY`, `JWT_EXPIRATION_MINUTES`, `ENVIRONMENT`, `ALLOWED_ORIGINS`, `SQL_ECHO`.

---

*Documentación KNOWTIFY Dev Studio © 2026 — actualizada tras la auditoría completa de seguridad, rendimiento y fluidez.*
