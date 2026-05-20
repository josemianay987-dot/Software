# Desplegar KNOWTIFY en internet — gratis

Esta guía pone tu app online en aproximadamente **45 minutos** usando solo
servicios con tier gratuito perpetuo. El URL final será algo como
`https://knowtify-app.vercel.app` accesible desde cualquier dispositivo.

## Arquitectura final

```
Visitante (móvil/PC)
        ↓
  Vercel (Frontend Next.js)            ← https://tu-app.vercel.app
        ↓ (HTTPS)
  Render.com (Backend FastAPI)         ← https://tu-app.onrender.com
        ↓
  Neon.tech (PostgreSQL serverless)
        ↓
  Google AI Studio (Gemini)
```

**Coste:** $0/mes mientras estés dentro de los tiers gratuitos:
- Vercel: 100 GB/mes de bandwidth, builds ilimitados.
- Render: 750 horas/mes (todo el mes con un solo servicio).
- Neon: 0.5 GB PostgreSQL, sin caducidad.
- Gemini: 60 RPM, 1500 req/día.

**Limitación honesta:** el backend en Render free se **duerme tras 15 min sin
tráfico**. La primera petición tras dormirse tarda 30-60 s en despertar.
Después responde rápido. Para evitarlo: plan Render Starter ($7/mes).

---

## Pre-requisitos

1. Cuenta de **GitHub** (para conectar repos con Vercel/Render).
2. Cuenta de **Google** (para Gemini API y para login OAuth en los servicios).
3. El proyecto local con todo funcionando (lo tienes ✓).

---

## Paso 1 — Subir el código a GitHub (10 min)

Render y Vercel se conectan a un repo Git. Si tu proyecto **no está aún en
GitHub**, hazlo así:

```bash
cd ~/Desktop/Software

# (Si nunca lo hiciste): crear repo en github.com → "New repository"
#   Nombre: knowtify (o el que quieras)
#   Privado: sí (recomendado, no expone tu .env.example ni tus fotos)
#   No marques "Initialize this repository with README"

# Conectar y subir:
git remote add origin https://github.com/TU-USUARIO/knowtify.git
git branch -M main
git push -u origin main
```

> ⚠️ **Antes de pushear**, asegúrate de que tu `.env` real (con las claves)
> no se sube. El `.gitignore` raíz ya lo excluye, pero verifica con:
> ```bash
> git status | grep "\.env$"
> # No debe aparecer. Si aparece, NO hagas push.
> ```

---

## Paso 2 — PostgreSQL gratis en Neon (5 min)

1. Ve a [https://neon.tech](https://neon.tech) → **Sign up** con GitHub.
2. **Create a project**:
   - Project name: `knowtify`
   - PostgreSQL version: 16
   - Region: la más cercana (Europa Frankfurt si estás en España/LatAm).
3. Te dará un **connection string** parecido a:
   ```
   postgresql://user:pass@ep-xxxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```
   **Cópialo** — lo usarás en Render.

4. **Cargar el esquema y datos** desde tu BD local (en una terminal local):
   ```bash
   # 1) Dump de tu BD local
   PGPASSWORD=admin123 pg_dump -h localhost -U josemi -d mocavi_db \
     --no-owner --no-privileges --clean --if-exists \
     > /tmp/mocavi.sql

   # 2) Restaurar en Neon (sustituye el connection string)
   psql "postgresql://user:pass@ep-xxxx.../neondb?sslmode=require" -f /tmp/mocavi.sql
   ```
   También puedes usar el SQL Editor de Neon copiando el contenido de
   `/tmp/mocavi.sql` si prefieres web.

5. Crea un **docente inicial** con bcrypt (en local):
   ```bash
   cd ~/Desktop/Software/edu-grade-mocavi
   .venv/bin/python -c "
   from app.auth import hash_password
   pw = hash_password('admin1234')
   print(pw)
   "
   # Copia el hash y ejecuta en Neon SQL Editor:
   #   INSERT INTO users (id, username, hashed_password, full_name)
   #   VALUES (gen_random_uuid(), 'admin', '<PEGAR_HASH_AQUÍ>', 'Admin');
   ```

---

## Paso 3 — Backend en Render (15 min)

1. Ve a [https://render.com](https://render.com) → **Sign up** con GitHub.
2. **New +** → **Blueprint** → **Connect repository** (autoriza acceso a tu
   repo `knowtify`).
3. Render detecta el `render.yaml` en `edu-grade-mocavi/` y propone crear el
   servicio. Acepta.
4. **Variables de entorno** (te las pedirá en la creación):

   | Variable | Valor |
   |---|---|
   | `DATABASE_URL` | El connection string de Neon |
   | `GEMINI_API_KEY` | Tu API key de Google AI Studio |
   | `JWT_SECRET_KEY` | (Render genera uno automáticamente) |
   | `JWT_EXPIRATION_MINUTES` | `1440` |
   | `ENVIRONMENT` | `production` |
   | `ALLOWED_ORIGINS` | **Pendiente** — lo pondrás cuando tengas el URL de Vercel. Mientras tanto: `https://knowtify-frontend.vercel.app` |

5. **Deploy**. Tarda ~3-5 min. Cuando termine, copia el URL público (algo
   como `https://knowtify-backend.onrender.com`).

6. **Verifica** que responde:
   ```bash
   curl https://knowtify-backend.onrender.com/docs
   # → debe devolver el HTML de Swagger UI
   ```

---

## Paso 4 — Frontend en Vercel (10 min)

1. Ve a [https://vercel.com](https://vercel.com) → **Sign up** con GitHub.
2. **Add New...** → **Project** → selecciona el repo `knowtify`.
3. **Framework Preset**: Next.js (auto-detectado).
4. **Root Directory**: `frontend`
5. **Environment Variables**:

   | Variable | Valor |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | `https://knowtify-backend.onrender.com` (el de Render) |

6. **Deploy**. Tarda ~2 min. Cuando termine, te da una URL tipo
   `https://knowtify-XXX.vercel.app`.

---

## Paso 5 — Cerrar el círculo (CORS)

Ahora que tienes el URL de Vercel, vuelve a **Render** → tu servicio →
**Environment** → edita `ALLOWED_ORIGINS` y pon el URL real:

```
https://knowtify-XXX.vercel.app
```

(Sin barra final, sin espacios. Si tendrás dominio propio después, separa con coma:
`https://knowtify.vercel.app,https://www.tu-dominio.com`)

Render reinicia el servicio automáticamente (~30 s).

---

## Paso 6 — Probar online

1. Abre `https://knowtify-XXX.vercel.app` desde tu móvil.
2. Pulsa "Iniciar sesión".
3. Entra como `admin / admin1234` (o el docente que hayas insertado).
4. Verifica que carga el dashboard.

**Si ves errores de CORS** en la consola del navegador (F12 → Console):
- Re-revisa que `ALLOWED_ORIGINS` en Render coincide exacto con el URL de Vercel.
- Render tarda ~30 s en aplicar el cambio.

**Si ves un loader que nunca termina**:
- El backend de Render está **despertando del cold start** (primera petición tras 15 min). Espera 30-60 s y recarga.

---

## Dominio propio (opcional, $10/año)

1. Compra un dominio en [Namecheap](https://www.namecheap.com) (~$10/año).
2. En **Vercel** → tu proyecto → **Settings** → **Domains** → añadir
   `www.knowtify.app` (o el que sea). Vercel te da unos registros DNS.
3. En Namecheap → **Manage** → **Advanced DNS** → añade los registros que te
   pidió Vercel.
4. Espera 5-30 min a que propague.
5. En Render → CORS → añade el nuevo dominio a `ALLOWED_ORIGINS`.

---

## Mantenimiento mensual (5 minutos)

- **Cuotas**: revisar el dashboard de Vercel/Render/Neon una vez al mes.
  Si te acercas al límite, considera plan de pago.
- **Backups de la BD**: Neon tiene PITR (point-in-time recovery) gratis 7
  días. Para más, descarga manualmente con `pg_dump`.
- **Updates**: cuando hagas `git push origin main`, Vercel y Render
  redespliegan **automáticamente**. Si rompes algo, vuelve atrás con
  `git revert <hash> && git push`.

---

## Cuándo plantearte salir del free tier

| Síntoma | Plan recomendado |
|---|---|
| Tienes usuarios reales y el cold start molesta | Render Starter ($7/mes) |
| BD pasa de 0.5 GB | Neon Launch ($19/mes) o migrar a Supabase Pro ($25/mes) |
| Bandwidth > 100 GB/mes en frontend | Vercel Pro ($20/mes) |
| Necesitas más req/día a Gemini | Activar facturación en Google Cloud (pay-as-you-go) |

**Estimación con tráfico moderado** (≤ 1.000 visitantes/día, ≤ 100 usuarios
activos): puedes seguir en gratis **indefinidamente**.

---

## Checklist final antes de compartir el link

- [ ] Login docente funciona y guarda sesión
- [ ] Login estudiante funciona
- [ ] El calificador IA procesa una imagen real
- [ ] Tutor IA responde
- [ ] Mensajería envía y recibe
- [ ] Calendario crea y muestra eventos
- [ ] Las fotos del equipo cargan en /sobre-nosotros
- [ ] Funciona desde un móvil (no solo en tu PC)

¡Listo para compartir! 🚀
