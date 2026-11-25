# Flujo de Trabajo — laburoDev

Referencia rápida de cómo funciona el flujo completo: Git, Vercel, Turso y agentes.

---

## 🌿 Ramas de Git

| Rama | Qué es | Dónde vive |
|:--|:--|:--|
| **`development`** | Trabajo diario. Código nuevo, fixes, experimentación. | Local + GitHub |
| **`main`** | Producción. Solo se actualiza cuando todo está probado. | Local + GitHub |

**Regla:** Siempre estás en `development` a menos que se diga explícitamente lo contrario.

---

## 🖥️ Vercel (Hosting)

| Entorno | URL Frontend | URL Backend | Cuándo se despliega |
|:--|:--|:--|:--|
| **Preview** | `laburodev-dev.vercel.app` | `laburodev-api-dev.vercel.app` | Cada push a `development` (automático via CI) |
| **Producción** | `laburodev.vercel.app` | `laburodev-api.santiagogoncalvez.com` | Cada push a `main` (automático via CI) |

**Configuración:**
- Vercel Auth desactivado en Preview (ambos proyectos).
- `vercel.json` tiene `"git": { "deploymentEnabled": false }` — los deploys los maneja el CI, no Vercel Git.
- Alias de preview se crean via REST API en el CI (`POST /v2/deployments/{id}/aliases`).

---

## 🗄️ Turso (Base de datos)

| Entorno | Base de datos | Cuándo se usa |
|:--|:--|:--|
| **Local** | SQLite (`file:local.db`) | `npm run dev` en tu máquina |
| **Preview** | Rama `laburodev-dev` de Turso | URLs de preview en Vercel |
| **Producción** | Base `laburodev-prod` | URL de producción |

**Credenciales prod:** `TURSO_DATABASE_URL_PROD` / `TURSO_AUTH_TOKEN_PROD` en `backend/.env`. Nunca se cargan solas. Re-seedear prod con `npm run db:seed:prod`.

**Migraciones automáticas (T-004):** antes de cada deploy el CI corre `npm run db:migrate:dev` (preview) o `npm run db:migrate:prod` (producción). Solo agrega columnas/índices; **no borra datos**. Si el migrate falla, el job falla y **el deploy no se ejecuta**. Los secrets `TURSO_DATABASE_URL_DEV`, `TURSO_AUTH_TOKEN_DEV`, `TURSO_DATABASE_URL_PROD` y `TURSO_AUTH_TOKEN_PROD` se cargan en GitHub Actions (mismo valor que `backend/.env`). Seed y reset siguen siendo manuales: en producción **nunca** se ejecutan automáticamente.

---

## 🔄 Flujo completo

```
Vos modificás código en development
        │
        ▼
git push origin development
        │
        ▼
GitHub Actions corre:
  ├── lint ✅
  ├── typecheck ✅
  ├── tests ✅
  ├── build ✅
  ├── migrate esquema Turso DEV ✅  (antes del deploy, sin borrar datos)
  ├── deploy preview frontend → laburodev-dev.vercel.app ✅
  └── deploy preview backend  → laburodev-api-dev.vercel.app ✅
        │
        ▼
Vos probás en laburodev-dev.vercel.app
  (conecta a Turso preview, no a producción)
        │
        ▼
Si todo está bien:
git checkout main
git merge development
git push origin main
        │
        ▼
GitHub Actions corre todo de nuevo:
  ├── lint ✅
  ├── tests ✅
  ├── migrate esquema Turso PROD ✅  (antes del deploy, nunca seed/reset automático)
  ├── deploy producción frontend → laburodev.vercel.app 🚀
  └── deploy producción backend  → laburodev-api.santiagogoncalvez.com 🚀
```

---

## 🤖 Cómo trabajar con los agentes

| Situación | Qué decirle al agente |
|:--|:--|
| **Trabajo normal** | Trabajá en `development`. El agente hace cambios, vos verificás en preview, pusheás. |
| **¿Listo para producción?** | Vos decidís. Decile: "mergeá `development` a `main` y pusheá". |
| **Commit** | Usá `@super-commit` para commits limpios y con buen mensaje. |
| **¿En qué rama estoy?** | Siempre `development` a menos que digas lo contrario. |

---

## 📁 Archivos de control del proyecto

| Archivo | Ubicación | Qué contiene |
|:--|:--|:--|
| `ROADMAP.md` | Raíz del proyecto | Plan maestro por fases (Fase 1-4) |
| `PENDING_FIXES.md` | Raíz del proyecto | Bitácora de bugs de lógica pendientes |
| `FLUJO-TRABAJO.md` | Raíz del proyecto | Este archivo (referencia del flujo) |
| `AGENTS.md` | Raíz del proyecto | Reglas del proyecto para agentes |
| `PLAN-TYPESCRIPT.md` | `frontend/` | Plan de migración a TypeScript |

---

## 📋 Resumen en una línea

> **Vos trabajás en `development`, el CI despliega a preview automáticamente, probás todo ahí, y cuando estás listo decís "mergeá a main" para que llegue a producción.**
