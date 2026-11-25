# EXPEDIENTE: T-004 - Migración automática de esquema en CI y separación migrate/seed

- **Fecha:** 2026-11-24
- **Categoría (Triage):** FEATURE (incluye bugfix inmediato)
- **Estado:** EN_PLANIFICACION

## 1. ¿PARA QUÉ SE HACE? (Contexto y Ruta de Trabajo)
<!-- Completado por el Coordinador en Modo Plan -->
- **Problema o Necesidad de Negocio:** El CI despliega código sin migrar la base remota. La preview quedó con 500 al publicar empleo (`table jobs has no column named user_id`) porque ningún paso del workflow toca Turso: lo que había quedado planeado ("el deploy de la rama actualiza la base remota") nunca se implementó. Además, migrar esquema y sembrar datos están mezclados en un solo comando (`db:seed` hace `DELETE FROM jobs`), lo que hace imposible automatizar el esquema en producción sin riesgo de borrar datos reales.
- **Resultado Esperado:** Cada deploy (preview y producción) migra el esquema automáticamente **antes** de desplegar el código nuevo; si el migrate falla, no se despliega nada. Regla clara por ambiente: dev = migrate automático + seed/reset manual; prod = solo migrate automático, jamás seed/reset. La preview vuelve a funcionar (fix inmediato).
- **Pipeline de Agentes Asignado:**
  - [ ] Paso 1: 02-arquitecto - Contrato técnico y plan de archivos (Sección 2)
  - [ ] Paso 2: 03-tester - Escenarios de prueba del flag `--schema-only` (RED)
  - [ ] Paso 3: 04-implementador - Fix inmediato (`db:migrate:dev`) + flag + scripts + CI + docs
  - [ ] Paso 4: 05-reviewer - Auditoría, validación y cierre

## 2. CONTRATO TÉCNICO Y PLAN DE ARCHIVOS (La Especificación para el Implementador)
<!-- Completado por 01-investigador (si es Bug/Perf) o 02-arquitecto (si es Feature) -->
<!-- Contrato Técnico Inmutable — 02-arquitecto (2026-11-24) -->

### 2.1 Archivos a crear/modificar

| Archivo | Acción | Qué se toca |
|---|---|---|
| `backend/db/seed.ts` | **Modificar** | Agregar flag `--schema-only` (`process.argv.includes("--schema-only")`). Early return después de índices y ANTES de leer `jobs.json` / `DELETE FROM jobs`. Rechazar combinación `--schema-only --reset` (exit 1). |
| `backend/db/seed-dev.ts` | **Sin cambios** | Ya reenvía `process.argv` completo (import dinámico de `seed.js` comparte `process.argv`); el flag llega solo. |
| `backend/db/seed-prod.ts` | **Sin cambios** | Igual que `seed-dev.ts`. |
| `backend/package.json` | **Modificar** | Agregar 3 scripts en `scripts` (ver 2.2). No tocar los existentes (`db:seed`, `db:reset`, `db:seed:dev`, `db:seed:prod` quedan idénticos). |
| `.github/workflows/ci.yml` | **Modificar** | En `preview-backend` y `deploy-backend`: agregar `actions/setup-node@v4` + `npm ci` (working-directory `backend`) + paso de migrate ANTES de cualquier paso de Vercel/deploy (ver 2.3). El job `backend-test` NO se toca (su `db:seed` local sigue igual). |
| `AGENTS.md` | **Modificar** | Sección de comandos backend: sumar `db:migrate*` + reglas dev/prod (ver 2.6). |
| `FLUJO-TRABAJO.md` | **Modificar** | Flujo de deploy: documentar "migrate antes del deploy" y reglas por ambiente (ver 2.6). |
| GitHub Secrets (fuera del repo) | **Configurar** | 4 repository secrets (ver 2.5). Valores desde `backend/.env`; nunca commiteados. |

### 2.2 Contrato de comportamiento

**A. Flag `--schema-only` en `backend/db/seed.ts`**

- Sintaxis: `tsx db/seed.ts --schema-only` (solo o vía wrappers `seed-dev.ts` / `seed-prod.ts`).
- **SÍ hace** (en este orden, misma lógica actual):
  1. Lee `db/schema.sql` y lo ejecuta con `db.executeMultiple` (tablas con `IF NOT EXISTS`).
  2. `PRAGMA table_info(jobs)` → por cada columna faltante (`modality`, `technology`, `user_id`) ejecuta `ALTER TABLE ... ADD COLUMN ...` (aditivo).
  3. `CREATE INDEX IF NOT EXISTS` de los 3 índices (`idx_jobs_level`, `idx_jobs_title`, `idx_jobs_modality`).
  4. **Exit 0.**
- **NO hace:**
  - No ejecuta `DROP TABLE` (aunque se pase `--reset` junto: combinación inválida → error + `process.exit(1)`).
  - No ejecuta `DELETE FROM jobs`.
  - No lee ni inserta `jobs.json`.
- **Semántica idempotente:** correrlo N veces sobre la misma DB produce exactamente el mismo estado final; la 2ª corrida no altera filas ni falla (todo `IF NOT EXISTS` / chequeo previo por `PRAGMA`).
- **Errores:** cualquier fallo → mensaje en `console.error` + `process.exit(1)` (catch actual). Código de salida ≠ 0 = fallo de migración.
- Comportamiento **sin flag**: idéntico al actual (`db:seed` y `db:reset` no cambian).

**B. Scripts nuevos en `backend/package.json`**

```json
"db:migrate": "tsx db/seed.ts --schema-only",
"db:migrate:dev": "tsx db/seed-dev.ts --schema-only",
"db:migrate:prod": "tsx db/seed-prod.ts --schema-only"
```

- `db:migrate`: local/SQLite (o `TURSO_*` ya en el entorno).
- `db:migrate:dev` / `db:migrate:prod`: reutilizan los wrappers, que inyectan `TURSO_DATABASE_URL_DEV/_PROD` y `TURSO_AUTH_TOKEN_DEV/_PROD` (`.env` local con `loadEnvFile` que **no pisa** vars ya presentes en el entorno → en CI llegan desde secrets y sin `.env` el `existsSync` lo salta).

**C. Pasos de CI en `.github/workflows/ci.yml`**

- `preview-backend` (push a `development`): después de `actions/checkout@v4` y **antes** de "Instalar Vercel CLI":
  1. `actions/setup-node@v4` (node 24, `cache: npm`, `cache-dependency-path: backend/package-lock.json`).
  2. `npm ci` con `working-directory: backend`.
  3. Paso **"Migrate schema (Turso DEV)"**: `run: npm run db:migrate:dev`, `working-directory: backend`, `env:` `TURSO_DATABASE_URL_DEV: ${{ secrets.TURSO_DATABASE_URL_DEV }}` y `TURSO_AUTH_TOKEN_DEV: ${{ secrets.TURSO_AUTH_TOKEN_DEV }}`.
- `deploy-backend` (push a `main`): idéntico pero con `npm run db:migrate:prod` y secrets `_PROD`, colocado **antes** de "Validar token contra el proyecto" (es decir, antes de cualquier paso de deploy).
- **Semántica de fallo:** en GitHub Actions, si un paso sale con código ≠ 0 el job falla y los pasos siguientes **no se ejecutan** → no hay deploy. Sin `continue-on-error` en el paso de migrate.
- `backend-test` y `backend-smoke-test`: sin cambios.

**D. Secrets requeridos en GitHub (fuera del repo)**

`TURSO_DATABASE_URL_DEV`, `TURSO_AUTH_TOKEN_DEV`, `TURSO_DATABASE_URL_PROD`, `TURSO_AUTH_TOKEN_PROD` — repository secrets; valores copiados de `backend/.env`. Los configura Santiago; el repo no los contiene.

**E. Fix inmediato (paso 0, previo a todo lo demás)**

Desde `backend/`: `npm run db:migrate:dev` una vez contra la Turso dev. Agrega `user_id` (y lo que falte) sin borrar filas → desbloquea `POST /api/jobs` en la preview ya desplegada.

**F. Documentación**

- `AGENTS.md` (comandos backend): agregar los 3 scripts + regla: *"dev = migrate automático en CI + seed/reset manual; prod = solo migrate automático, jamás seed/reset; destructivos: directos en dev, script planeado en prod"*.
- `FLUJO-TRABAJO.md`: agregar al flujo de deploy que el paso de migrate corre antes del deploy y que un fallo de migrate bloquea el deploy; mencionar los 4 secrets.

### 2.3 Invariantes y reglas de negocio

1. **Migrate jamás borra datos:** `--schema-only` no contiene ni ejecuta `DELETE`, `DROP` ni `TRUNCATE`.
2. **Seed jamás automático en prod:** `db:seed` / `db:reset` / `db:seed:prod` no se agregan a ningún job de CI.
3. **Migrate corre siempre ANTES del deploy** en `preview-backend` y `deploy-backend`; fallo de migrate ⇒ job falla ⇒ nada se despliega.
4. **Cambios destructivos de esquema:** en dev se aplican a mano (SQL directo o `db:reset`); en prod requieren script planeado con respaldo, ejecutado una vez y documentado. El migrate automático solo cubre aditivos.
5. **El seed normal (`db:seed`) conserva su comportamiento actual** (`DELETE FROM jobs` + insert desde `jobs.json`) para uso local/dev manual; ningún test o script existente cambia de significado.
6. `--schema-only` es idempotente; `--schema-only --reset` es error explícito (exit 1).
7. Los secrets viven solo en GitHub/repo local, nunca en el código.

### 2.4 Escenarios de Prueba (Gherkin)

**Escenario 1 — `--schema-only` no borra empleos y agrega columnas faltantes**
```gherkin
Dado que la base dev contiene 100 empleos en la tabla "jobs" sin la columna "user_id"
Cuando ejecuto "npm run db:migrate:dev" desde "backend/"
Entonces la tabla "jobs" tiene la columna "user_id"
Y la tabla "jobs" sigue teniendo exactamente 100 empleos
Y el comando termina con código de salida 0
```

**Escenario 2 — migrate falla ⇒ no se ejecuta el deploy**
```gherkin
Dado que los secrets "TURSO_DATABASE_URL_DEV" y "TURSO_AUTH_TOKEN_DEV" no están configurados en GitHub
Cuando se hace push a la rama "development"
Entonces el job "preview-backend" falla en el paso "Migrate schema (Turso DEV)"
Y el paso "Deploy a preview" no se ejecuta
Y no se crea ningún deployment nuevo en Vercel
```

**Escenario 3 — el comando normal "db:seed" sigue borrando y reinsertando**
```gherkin
Dado que la base local contiene 100 empleos y existe el archivo "jobs.json"
Cuando ejecuto "npm run db:seed" desde "backend/" sin flags
Entonces el comando ejecuta "DELETE FROM jobs"
Y reinserta los empleos de "jobs.json"
Y no se detecta ningún cambio de comportamiento respecto de la versión anterior
```

**Escenario 4 — fix inmediato desbloquea el POST /api/jobs en preview**
```gherkin
Dado que la preview responde 500 con "table jobs has no column named user_id" al publicar un empleo
Cuando ejecuto "npm run db:migrate:dev" una vez desde "backend/" contra la Turso dev
Y envío "POST /api/jobs" con una sesión válida a "laburodev-api-dev.vercel.app/api/jobs"
Entonces la respuesta es 201 y el empleo se persiste con "user_id"
Y los empleos existentes en la base dev no fueron eliminados
```

## 3. REGISTRO DE PRUEBAS (QA Automation)
<!-- Completado por 03-tester -->
**Fecha:** 2026-11-24 · **Estado inicial: RED (4 tests en fallo, esperado)**

### 3.1 Archivos de test creados

| Archivo (`backend/`) | Escenario(s) Gherkin | Qué verifica |
|---|---|---|
| `migrate-schema.test.js` | 1, 3 y 4 (parte local) | Comportamiento del flag `--schema-only` vs `db:seed` normal, contra SQLite local (`file:local.db`) |
| `ci-workflow.test.js` | 2 (parte local) | Aserción estática sobre `.github/workflows/ci.yml`: el paso de migrate aparece **antes** del paso `vercel deploy` en `preview-backend` (`db:migrate:dev`) y `deploy-backend` (`db:migrate:prod`) |

Framework: `node:test` + `node:assert` (mismo estilo que `app.test.js` / `favorites.test.js`), corriendo con el script `test` existente (`node --import tsx --test --test-concurrency=1`).

### 3.2 Casos cubiertos

- **Escenario 1** (`--schema-only` agrega columnas sin borrar): elimina la columna `user_id` de la tabla local, inserta un empleo marcador (`t004-s1-marker`), ejecuta `node --import tsx db/seed.ts --schema-only` en un proceso hijo (sin `TURSO_*` en el entorno → siempre SQLite local) y asierte: exit 0 + columna `user_id` presente + conteo de filas intacto + marcador sobrevive.
- **Escenario 3** (regresión `db:seed` sin flags): inserta marcador (`t004-s3-marker`), corre `db/seed.ts` sin flags y asierte que ejecuta `DELETE FROM jobs` y deja exactamente los N empleos de `jobs.json` (marcador eliminado). **Nace en verde** y debe seguirlo.
- **Escenario 4 parte local** (migrate jamás borra filas): inserta marcador (`t004-s4-marker`), corre `--schema-only` y asierte que el marcador y el conteo de filas sobreviven intactos.
- **Escenario 2 parte local** (estático, sin deps nuevas): lee `ci.yml`, extrae el bloque de cada job por indentación y asierte que `db:migrate:dev` / `db:migrate:prod` existe y su índice es menor que el de `vercel deploy`. No se testea el comportamiento real de GitHub Actions/secrets (requiere red y secrets) — queda para verificación manual del reviewer.
- **No testeado (por diseño):** combinación `--schema-only --reset` → exit 1, e idempotencia de 2ª corrida. Ambos quedan como verificación manual del 05-reviewer salvo que el Coordinador pida sumarlos (serían tests locales y offline, viables).

### 3.3 Comando de ejecución

```powershell
# desde backend/
$env:NODE_ENV='test'; npm.cmd test                          # suite completa
$env:NODE_ENV='test'; npm.cmd test -- migrate-schema.test.js # un archivo
$env:NODE_ENV='test'; npm.cmd test -- ci-workflow.test.js
```

### 3.4 Resultado de la corrida inicial (RED) — suite completa

`tests 58 · pass 54 · fail 4` (los **53 tests existentes siguen en verde** + Escenario 3 en verde). Faltan 4 para el verde total:

1. **`Escenario 1: --schema-only agrega user_id sin borrar empleos y sale con 0`** → `AssertionError: --schema-only no debe borrar ni reinsertar filas (esperadas 59) — 58 !== 59`. **Por qué:** `seed.ts` todavía no reconoce `--schema-only`, hace el seed completo con `DELETE FROM jobs` y reinserta `jobs.json` (el marcador desaparece y el conteo vuelve a 58).
2. **`Escenario 4: --schema-only no elimina filas existentes`** → `AssertionError: El empleo marcador t004-s4-marker debe seguir existiendo tras --schema-only`. **Por qué:** mismo motivo — el `DELETE FROM jobs` del seed completo elimina el marcador.
3. **`Escenario 2 — preview-backend: db:migrate:dev corre antes del deploy`** → `AssertionError: El job "preview-backend" debe incluir el paso de migrate (db:migrate:dev)`. **Por qué:** `ci.yml` no tiene ningún paso de migrate todavía.
4. **`Escenario 2 — deploy-backend: db:migrate:prod corre antes del deploy`** → `AssertionError: El job "deploy-backend" debe incluir el paso de migrate (db:migrate:prod)`. **Por qué:** ídem.

### 3.5 Notas de higiene de la suite

- Los tests corren el comando en un **proceso hijo** con `cwd=backend/` y sin `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN` → jamás tocan Turso (offline y sin secrets, cumple la restricción).
- `migrate-schema.test.js` tiene un hook `after()` que re-corre `db:seed` completo: restaura el estado canónico (58 empleos de `jobs.json`, columna `user_id` presente, sin markers) aunque el test falle, para no romper `app.test.js`/`favorites.test.js` que comparten `local.db`.
- Verificado post-corrida: `jobs 58 | user_id? true | markers 0`.
- **No se modificó código fuente** (`seed.ts`, `package.json`, `ci.yml` intactos): todo el rojo se debe a la ausencia del flag/pasos, como corresponde en Fase RED.

### 3.6 Actualización del registro (Coordinador, 2026-11-24)
- Se unificó el juego de tests: se descartó `backend/seed.test.js` (duplicado) y se sumaron 2 invariantes a `backend/migrate-schema.test.js`: `--schema-only --reset` se rechaza y `--schema-only` es idempotente.
- RED final verificado: **tests 60 · pass 54 · fail 6** (53 existentes + regresion Escenario 3 en verde; 6 fallos esperados: Escenario 1, Escenario 4, 2 de CI, combinacion invalida, idempotencia).
## 4. ¿POR QUÉ SE HIZO ASÍ? (Decisiones Técnicas de Implementación)
<!-- Completado por 04-implementador tras pasar los tests a VERDE -->
**Fecha:** 2026-11-24 · **Estado: GREEN (60/60 tests)**

### 4.1 Decisiones
1. **`backend/db/seed.ts`**: flag `--schema-only` leído de `process.argv`. Si se combina con `--reset`, escribe el error y `process.exit(1)` **antes** de tocar la DB. El flag corre esquema + PRAGMA de columnas + índices y hace `return` antes de leer `jobs.json` y del `DELETE FROM jobs`. Se reutiliza la variable `reset` para el modo de borrado.
2. **`backend/package.json`**: nuevos scripts `db:migrate`, `db:migrate:dev`, `db:migrate:prod`. Los wrappers `seed-dev.ts` / `seed-prod.ts` no se tocan: el flag viaja en `process.argv`.
3. **`.github/workflows/ci.yml`**: en `preview-backend` y `deploy-backend` se agregó `setup-node@v4` (Node 24, cache de `backend/package-lock.json`), `npm ci` y el migrate correspondiente con los secrets `_DEV` / `_PROD`, **antes** de `vercel pull` / `vercel deploy`. Sin `continue-on-error`: si falla, el job falla y no hay deploy. No se agregó seed ni reset a ningún deploy.
4. **Documentación**: `AGENTS.md` y `FLUJO-TRABAJO.md` explican la doble regla (migrate automático / seed manual; en prod nunca seed ni reset automáticos).
5. **Fix inmediato**: se corrió `npm run db:migrate:dev` en cuanto el flag existió (no antes, para no correr un seed completo sobre Turso). Agregó `user_id`, verificó índices y no borró datos.

### 4.2 Verificación
- `npm test` (NODE_ENV=test): **tests 60 · pass 60 · fail 0** (antes: 54/6 en RED).
- `npm run typecheck` (backend): sin errores.
- `npm run lint` (raíz): 0 errores; 1 warning **preexistente** en `frontend/src/pages/Home.module.css:32` (`noDescendingSpecificity`), fuera del alcance de T-004.
- Preview real: `GET /health` → `{"status":"ok"}` y `GET /jobs` → HTTP 200 (el 500 original ya no se reproduce).

### 4.3 Cambios deliberadamente NO hechos
- No se tocó `db/schema.sql`, `db/index.ts`, los wrappers `seed-*.ts` ni `jobs.json`.
- No se agregó seed/reset a CI (los datos de prod quedan intactos).
- No se modificaron aserciones de tests para forzar el verde: solo se sumaron 2 invariantes nuevas.

## 5. ¿CON QUÉ SE HIZO? (Inventario Técnico y Auditoría)
<!-- Completado por 05-reviewer -->
**Resultado: APROBADO** · Auditoría 2026-11-24 con el mismo modelo (Santiago lo confirmó explícitamente antes de auditar).

### 5.1 Inventario exacto
| Archivo | Cambio |
|---|---|
| `backend/db/seed.ts` | Flag `--schema-only`: corre esquema + PRAGMA de columnas + índices y vuelve antes de leer `jobs.json` / `DELETE`. Rechaza `--schema-only --reset` con `exit 1`. |
| `backend/package.json` | 3 scripts nuevos: `db:migrate`, `db:migrate:dev`, `db:migrate:prod`. Los existentes quedan intactos. |
| `.github/workflows/ci.yml` | `preview-backend` y `deploy-backend`: setup-node 24 + `npm ci` + paso `Migrate schema (Turso DEV/PROD)` con secrets, antes de cualquier paso de Vercel. Sin `continue-on-error`. |
| `backend/migrate-schema.test.js` | 5 tests: columna agregada sin borrar, regresión del seed normal, no borrar filas, rechazo de flags contradictorios e idempotencia. |
| `backend/ci-workflow.test.js` | 2 aserciones estáticas: migrate antes del deploy en ambos jobs. |
| `AGENTS.md` / `FLUJO-TRABAJO.md` | Regla migrate automático vs seed manual, fallo que bloquea el deploy, 4 secrets y cambios destructivos. |
| `memory/T-004-...md` / `.ai/state.md` | Expediente SDD completo y estado del pipeline. |

### 5.2 Checklist del auditor
1. **Capas y contrato:** OK. Separación `routes → controllers → services → models → db` intacta; Sección 2 cumplida. Los nombres de los pasos de CI se ajustaron a `Migrate schema (Turso DEV/PROD)` durante la auditoría.
2. **Código limpio y seguro:** sin `any`, `@ts-ignore`, código muerto ni secretos en el repo. Los `console.log` / `console.error` son salida intencional del script CLI. Los wrappers `seed-*.ts` no se tocaron.
3. **Verde:** backend `NODE_ENV=test` → **60/60** (RED inicial 54/6); `tsc --noEmit` → 0 errores; lint raíz → 0 errores (1 warning CSS preexistente en `Home.module.css:32`); frontend `npm run build` → exit 0.
4. **Sección 4:** completa y clara.
5. **Escenario 4 real en preview:** `GET /health` OK, `GET /jobs` 200 y `POST /api/jobs` con sesión → **201** con `userId`; empleo temporal eliminado (204). El error `table jobs has no column named user_id` ya no se reproduce.

### 5.3 Observaciones para Santiago
- **Antes de pushear:** cargar los 4 repository secrets en GitHub (`TURSO_DATABASE_URL_DEV`, `TURSO_AUTH_TOKEN_DEV`, `TURSO_DATABASE_URL_PROD`, `TURSO_AUTH_TOKEN_PROD`) con los valores de `backend/.env`. Si faltan, el migrate falla y bloquea el deploy (comportamiento seguro, pero la preview deja de actualizarse).
- Quedó el usuario de QA `t004-reviewer@laburodev.dev` en la DB dev (no hay endpoint para borrar usuarios). No afecta producción.
- El warning de Biome en CSS es preexistente y queda fuera de este ticket.

## 6. TARJETA DE ENTREGA PARA TRELLO
**Título:** Preview arreglada: la base se actualiza sola antes de cada publicación

**Qué pasaba:** Publicar un empleo en la preview daba error 500. La base de datos ya no tenía una columna que el código esperaba (`user_id`). Al publicar, el sistema cambiaba el código pero nunca actualizaba la estructura de la base. Los tests pasaban porque usaban otra base, local, que sí estaba al día.

**Qué se hizo:** Se separaron dos cosas que antes estaban juntas. Ahora, antes de cada publicación, el sistema revisa y agrega lo que falte en la base sin borrar nada: eso es el "migrate". El "seed" (que sí reemplaza los empleos de ejemplo) queda como una acción manual, y en producción nunca se hace automáticamente. Si el migrate falla, la publicación se detiene y no se sube código nuevo.

**Cómo probarlo (paso a paso):**
1. Abrir `https://laburodev-api-dev.vercel.app/health` → debe mostrar `{"status":"ok"}`.
2. Abrir `https://laburodev-api-dev.vercel.app/jobs` → debe listar empleos, sin error 500.
3. Entrar a `https://laburodev-dev.vercel.app`, iniciar sesión, ir a publicar un empleo, completar título, empresa y tecnología, y enviarlo → debe crearse el empleo (antes daba 500).
4. En GitHub → Actions, al pushear a `development`, el job `preview-backend` debe mostrar `Migrate schema (Turso DEV)` antes de `Deploy a preview`.
5. Al pushear a `main`, el job `deploy-backend` debe mostrar `Migrate schema (Turso PROD)` antes del deploy. En ningún caso se borran empleos existentes.

**Ojo antes de publicar:** en GitHub → Settings → Secrets and variables → Actions cargar `TURSO_DATABASE_URL_DEV`, `TURSO_AUTH_TOKEN_DEV`, `TURSO_DATABASE_URL_PROD` y `TURSO_AUTH_TOKEN_PROD` (los valores están en `backend/.env` de Santiago). Si faltan, el migrate falla y no se despliega.