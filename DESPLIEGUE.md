# 🚀 Guía de despliegue gratuito — KNOWTIFY

Esta guía publica KNOWTIFY en internet **gratis** para que tu docente entre con un link.

## Arquitectura del despliegue

| Pieza | Servicio gratuito | Resultado |
|------|-------------------|-----------|
| Frontend (Next.js) | **Vercel** | `https://knowtify.vercel.app` |
| Backend (FastAPI) | **Render** | `https://knowtify-backend.onrender.com` |
| Base de datos (PostgreSQL) | **Neon** | cadena de conexión `DATABASE_URL` |

> Ninguno pide tarjeta de crédito.

### Credenciales de demostración (se crean solas al desplegar)
- **Docente** → usuario: `docente` · contraseña: `Demo2026!`
- **Estudiante** → documento: `1001` (María Fernanda López)

---

## Paso 0 — Subir el código a GitHub

Desde la carpeta del proyecto (`/home/josemi/Desktop/Software`):

```bash
git add .
git commit -m "Preparar despliegue (seed, gitignore, env)"
# Crea un repositorio vacío en https://github.com/new (por ejemplo: knowtify)
git remote add origin https://github.com/TU_USUARIO/knowtify.git
git branch -M main
git push -u origin main
```

> El `.gitignore` ya evita subir secretos (`.env`, `.env.local`) y `node_modules`.

---

## Paso 1 — Base de datos en Neon (PostgreSQL)

1. Entra a **https://neon.tech** y crea una cuenta (con GitHub es más rápido).
2. **Create project** → nombre `knowtify` → región la más cercana.
3. En el panel, copia la **Connection string** (botón *Connect*). Se ve así:
   ```
   postgresql://usuario:password@ep-xxxx.neon.tech/neondb?sslmode=require
   ```
4. Guárdala: es tu `DATABASE_URL`.

---

## Paso 2 — Backend en Render (FastAPI)

1. Entra a **https://render.com** y crea cuenta con GitHub.
2. **New +** → **Blueprint** → elige tu repositorio. Render leerá el archivo
   `edu-grade-mocavi/render.yaml` automáticamente.
3. Cuando pida las variables de entorno (marcadas como *sync: false*), pega:
   - `DATABASE_URL` → la cadena de **Neon** del paso 1.
   - `GEMINI_API_KEY` → tu clave de Gemini (https://aistudio.google.com/apikey).
   - `ALLOWED_ORIGINS` → déjalo en blanco por ahora (lo pondrás en el paso 4).
   - `JWT_SECRET_KEY` → se genera solo (no hagas nada).
4. **Apply / Create**. El primer build tarda unos minutos (instala OpenCV, etc.).
5. Cuando termine, copia la URL del backend, p. ej.:
   `https://knowtify-backend.onrender.com`
6. Verifica que funciona abriendo esa URL + `/docs` (debe aparecer Swagger).

> 💡 Al arrancar con la base vacía, el sistema **crea solo** el docente y los
> estudiantes de demostración.

---

## Paso 3 — Frontend en Vercel (Next.js)

1. Entra a **https://vercel.com** y crea cuenta con GitHub.
2. **Add New… → Project** → importa tu repositorio.
3. **IMPORTANTE — Root Directory:** pulsa *Edit* y selecciona la carpeta **`frontend`**.
   (Vercel detectará Next.js automáticamente.)
4. En **Environment Variables** agrega:
   - `NEXT_PUBLIC_API_URL` = la URL de Render del paso 2
     (ej. `https://knowtify-backend.onrender.com`).
5. **Deploy**. Al terminar copia tu URL pública, p. ej.:
   `https://knowtify.vercel.app`

---

## Paso 4 — Conectar frontend y backend (CORS)

1. Vuelve a **Render** → tu servicio → **Environment**.
2. Edita `ALLOWED_ORIGINS` y pon la URL de Vercel (sin barra final):
   ```
   https://knowtify.vercel.app
   ```
3. Guarda. Render reinicia el backend solo.

✅ **Listo.** Comparte con tu docente el link de Vercel
(`https://knowtify.vercel.app`) y las credenciales del docente de demostración.

---

## Notas importantes

- **Primer acceso lento:** el backend gratis de Render se "duerme" tras 15 min
  sin uso; la primera petición tarda ~50 s y luego va normal. Tip: abre primero
  el `…onrender.com/docs` para "despertarlo" antes de mostrarlo.
- **No subas claves:** las variables sensibles van en los paneles de Render/Vercel,
  nunca en el código.
- **Cambiar la contraseña del docente:** una vez dentro, desde el portal del
  docente (icono de candado) puedes cambiar `Demo2026!` por otra.
- **Reset de datos:** si quieres empezar de cero, borra las tablas en Neon; al
  reiniciar el backend se vuelven a crear los datos de demostración.
