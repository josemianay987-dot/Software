# RESTORE.md — Cómo revertir cambios

Este proyecto tiene **tres niveles de respaldo** activos. Si algo sale mal con cualquiera
de las 32 mejoras planeadas (o cualquier futuro cambio), puedes volver atrás con
seguridad usando alguno de los métodos aquí descritos.

---

## Nivel 1 · Snapshot completo (red de seguridad nuclear)

**Ubicación:** `~/Desktop/Software-backup-2026-04-30/`

Es una copia 1-a-1 del proyecto en el estado del 30 de abril de 2026, antes de
empezar las 32 mejoras. Excluye solo lo regenerable (`.next/`, `node_modules/`,
`.venv/`, `__pycache__/`).

### Cuándo usarlo
- Algo se rompió a un nivel que ni Git resuelve.
- Quieres volver al punto exacto sin tocar Git.
- Acceso "para humanos": puedes abrir cualquier archivo y leerlo.

### Cómo restaurar TODO el proyecto
```bash
# (Detener procesos antes)
pkill -f "uvicorn app.main" 2>/dev/null
pkill -f "next dev" 2>/dev/null

# Reemplazar el directorio actual
mv ~/Desktop/Software ~/Desktop/Software-broken-$(date +%Y%m%d)
cp -r ~/Desktop/Software-backup-2026-04-30 ~/Desktop/Software

# Reinstalar dependencias
cd ~/Desktop/Software/edu-grade-mocavi && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
cd ~/Desktop/Software/frontend && npm install
```

### Cómo restaurar solo un archivo específico
```bash
cp ~/Desktop/Software-backup-2026-04-30/frontend/src/app/page.js \
   ~/Desktop/Software/frontend/src/app/page.js
```

---

## Nivel 2 · Git (control granular)

**Tag base:** `baseline-v2.1` (commit `64d12a4`)

### Ver historial
```bash
cd ~/Desktop/Software
git log --oneline --decorate
git tag -l -n2
```

### Revertir TODOS los cambios y volver al baseline
```bash
git reset --hard baseline-v2.1
```
Te lleva al estado exacto del 30 de abril de 2026, descartando todo lo nuevo.

### Revertir UNA mejora concreta sin perder las demás
Cada mejora futura quedará en un commit independiente con prefijo `feat: NN -`.
Para deshacer la mejora número 14 (por ejemplo), sin tocar las demás:
```bash
git log --oneline | grep "feat: 14"
# Supongamos que el hash es a1b2c3d
git revert a1b2c3d
```
Se crea un commit nuevo que deshace ese cambio. Las mejoras anteriores y
posteriores quedan intactas.

### Volver hasta una mejora intermedia
Si llegamos a la mejora #20 y prefieres quedarte como estaba al terminar la #12:
```bash
git log --oneline | grep "feat: 12"
# Supongamos que el hash es f5e6d7c
git reset --hard f5e6d7c
```

### Comparar estados
```bash
# Ver qué cambió entre baseline y HEAD
git diff baseline-v2.1 HEAD --stat

# Ver el contenido de un archivo en el baseline
git show baseline-v2.1:frontend/src/app/page.js
```

### Recuperar un commit que ya borraste
```bash
git reflog          # lista de TODOS los movimientos del HEAD
git reset --hard <hash-del-reflog>
```

---

## Nivel 3 · Base de datos

**Ubicación:** `~/Desktop/Software-backup-2026-04-30/db-snapshot/`

Dos formatos del mismo dump:
- `mocavi_db.sql` (plain SQL, legible)
- `mocavi_db.dump` (formato comprimido, restauración más rápida)

### Restaurar la BD desde plain SQL
```bash
# Resetear la BD (⚠ borra TODO lo actual)
PGPASSWORD=admin123 psql -h localhost -U josemi -d postgres -c "DROP DATABASE mocavi_db;"
PGPASSWORD=admin123 psql -h localhost -U josemi -d postgres -c "CREATE DATABASE mocavi_db;"

# Restaurar el dump
PGPASSWORD=admin123 psql -h localhost -U josemi -d mocavi_db \
  < ~/Desktop/Software-backup-2026-04-30/db-snapshot/mocavi_db.sql
```

### Restaurar la BD desde dump comprimido
```bash
PGPASSWORD=admin123 pg_restore -h localhost -U josemi -d mocavi_db \
  --clean --if-exists --no-owner \
  ~/Desktop/Software-backup-2026-04-30/db-snapshot/mocavi_db.dump
```

### Hacer un dump nuevo (recomendado antes de cada mejora con cambios de schema)
```bash
PGPASSWORD=admin123 pg_dump -h localhost -U josemi -d mocavi_db \
  --no-owner --no-privileges \
  -f ~/Desktop/Software-backup-$(date +%Y-%m-%d-%H%M)/mocavi_db.sql
```

---

## Tabla rápida — ¿qué método uso?

| Necesito | Mejor opción |
|---|---|
| Volver al baseline completo (código + BD) | Nivel 1 (snapshot) o `git reset --hard baseline-v2.1` + restaurar BD |
| Deshacer solo la mejora #14 | Nivel 2 — `git revert <hash-14>` |
| Recuperar un solo archivo | Nivel 1 — `cp` desde el snapshot |
| Ver qué cambió entre dos puntos | Nivel 2 — `git diff baseline-v2.1 HEAD` |
| La BD se corrompió o un schema migration salió mal | Nivel 3 — `pg_restore` |

---

## Convenciones de los commits

A partir del baseline, cada cambio futuro seguirá este patrón:

```
feat: NN - <descripción corta>

[explicación]
```

Donde `NN` es el número de la mejora (01–32). Esto permite:
- Filtrar fácilmente: `git log --oneline | grep "feat: 03"`
- Revertir individualmente: `git revert <hash>`
- Auditar: cada commit toca lo mínimo posible.

Migraciones de BD viven en `edu-grade-mocavi/sql/migrations/NN_descripcion.sql`
con su correspondiente `NN_descripcion.down.sql` para deshacerlas.

---

## Verificar que los respaldos están intactos

```bash
# Snapshot
ls -la ~/Desktop/Software-backup-2026-04-30/
du -sh ~/Desktop/Software-backup-2026-04-30/

# Git
cd ~/Desktop/Software && git tag -l -n2 && git log --oneline -1

# DB dumps
ls -lh ~/Desktop/Software-backup-2026-04-30/db-snapshot/
```

Si los tres devuelven contenido, el sistema de reversión está sano.

---

*Generado el 30 de abril de 2026 · KNOWTIFY Dev Studio*
