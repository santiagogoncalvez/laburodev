# Planes de cambios directos

Espacio para **cambios chicos y bien definidos** que NO necesitan el flujo SDD completo. Si el cambio es una feature nueva o algo complejo, se usa el flujo de tickets (`tickets/todo/`, T-###).

## Cómo usarlo

1. Crear el plan en esta carpeta con nombre en **kebab-case** (`guard-edit-ownership.md`).
2. Pasarle la ruta al agente que aplica cambios: *"Aplicá `planes/guard-edit-ownership.md`"*.
3. El agente lee el plan, aplica lo indicado y verifica con la sección "Cómo verificar".
4. **Solo Santiago ejecuta `git commit` / `git push`** (misma regla que el flujo SDD).

## Estructura fija de un plan

```markdown
# Título del cambio

## Contexto
Por qué existe el cambio (el problema, en pocas líneas).

## Qué hay que cambiar
Lista concreta: archivos, comportamiento nuevo, patrón a seguir.

## Qué NO hacer
Límites explícitos para que el agente no se desborde.

## Casos borde
Situaciones raras que tienen que cubrirse.

## Cómo verificar
Pasos numerados de prueba (manual o test).
```

## Planes

- `guard-edit-ownership.md` — bloquear la carga del formulario de edición cuando el empleo no es del usuario.
