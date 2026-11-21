# EXPEDIENTE: [ID-TICKET] - [Título Corto]

- **Fecha:** [YYYY-MM-DD]
- **Categoría (Triage):** [FEATURE | BUGFIX | PERFORMANCE / REFACTOR | UI / CHORE]
- **Estado:** [EN_PLANIFICACION | ESPERANDO_APROBACION | EN_EJECUCION | COMPLETADO]

## 1. ¿PARA QUÉ SE HACE? (Contexto y Ruta de Trabajo)
<!-- Completado por el Coordinador en Modo Plan -->
- **Problema o Necesidad de Negocio:** [Qué ocurre hoy o qué se necesita construir]
- **Resultado Esperado:** [Qué logra el sistema una vez resuelto]
- **Pipeline de Agentes Asignado:**
  - [ ] Paso 1: [Agente] - [Tarea]
  - [ ] Paso 2: [Agente] - [Tarea]

## 2. CONTRATO TÉCNICO Y PLAN DE ARCHIVOS (La Especificación para el Implementador)
<!-- Completado por 01-investigador (si es Bug/Perf) o 02-arquitecto (si es Feature) -->
- **Archivos a crear/modificar:** [Lista exacta de rutas reales: `backend/...` o `frontend/src/...`]
- **Diagnóstico de Causa Raíz (Solo Bugs/Perf):** [Línea exacta, fallo lógico o cuello de botella]
- **Contrato de Datos y Firmas (Solo Features):** [Endpoints, Schemas Zod, DTOs, Tipos, Códigos HTTP]
- **Invariantes y Reglas de Negocio:** [Condiciones que nunca deben romperse]
- **Escenarios de Prueba (Gherkin):** [Lista Dado / Cuando / Entonces para el Tester]

## 3. REGISTRO DE PRUEBAS (QA Automation)
<!-- Completado por 03-tester -->
- **Archivos de test generados:** [Rutas reales]
- **Casos cubiertos:** [Resumen de pruebas creadas y confirmación de fallo inicial RED]

## 4. ¿POR QUÉ SE HIZO ASÍ? (Decisiones Técnicas de Implementación)
<!-- Completado por 04-implementador tras pasar los tests a VERDE -->
- **Enfoque elegido:** [Por qué se programó de esta manera]
- **Alternativas descartadas:** [Qué otra solución se evitó y por qué]
- **Notas para mantenimiento futuro:** [Advertencias o puntos clave para otros devs]

## 5. ¿CON QUÉ SE HIZO? (Inventario Técnico y Auditoría)
<!-- Completado por 05-reviewer -->
- **Resumen de cambios por archivo:** [Qué se tocó exactamente]
- **Patrones, herramientas o queries aplicadas:** [Detalle técnico]
- **Veredicto de Auditoría:** [APROBADO / RECHAZADO + validación de tests y tipos]

## 6. TARJETA DE ENTREGA PARA TRELLO
<!-- Completado por 05-reviewer en lenguaje claro para el equipo/QA funcional -->
- **Qué pasaba:** [Explicación clara del problema previo o necesidad funcional]
- **Qué se hizo:** [Explicación funcional de la solución sin jerga de código innecesaria]
- **Cómo probarlo (como usuario en la plataforma):**
  1. [Paso 1 en la pantalla/módulo correspondiente]
  2. [Paso 2 de acción del usuario]
  3. [Resultado esperado en la interfaz o respuesta del sistema]