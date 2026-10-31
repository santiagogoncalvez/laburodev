# laburoDev · Sistema de diseño

Fuente única de verdad visual del frontend. Todo cambio de estilo debe respetar este documento.

## Marca

- Nombre: `laburoDev` (camelCase, solo texto en color normal, sin logo ni acento).
- Favicon: cuadrado verde dark con `lD` en color de texto (inline SVG en `index.html`).

## Tipografía

- Una sola font: **Bricolage Grotesque Variable** (bundled vía `@fontsource-variable/bricolage-grotesque`, funciona offline).
- Pesos permitidos: **400 y 500**. Nada de 600/700/bold en `src`.
- Escala: `display 2.5rem` (hero search) · `h1 2rem` · `h2 1.5rem` · `h3 1.125rem` · `body 1rem` · `small 0.875rem`. Headings con `line-height 1.25`, cuerpo `1.6`.

## Color

Dark (default), negro verdoso + brasa:

| Token      | Valor     | Uso                                    |
| ---------- | --------- | -------------------------------------- |
| `--bg`     | `#0d1310` | fondo página, header                   |
| `--bg-soft`| `#141c17` | botones ghost/icon, inputs, badges     |
| `--surface`| `#1a231d` | cards, search-bar                      |
| `--text`   | `#ece7d8` | texto principal, íconos (`currentColor`)|
| `--text-2` | `#a9b29b` | secundario, placeholders               |
| `--accent` | `#ea5f31` | CTA, links, nav activa, marca Dev       |
| `--accent-ink` | `#160d08` | texto sobre CTA                    |
| `--green`  | `#3e7d5c` | estado aplicado                        |
| `--danger` | `#e0705c` | errores                                |

Light (misma familia, en claro): papel verdoso `bg #f3f6f0` · `soft #e4eae0` · `surface #fafcf7` (nunca blanco puro) · tinta verde `text #121a15` · `text2 #4f6156` · misma brasa `accent #b33a17` · `ink #fafcf7` · `green #20603f` · `danger #a8321f`. Sombra XS mínima en ambos temas (separación, no estilo).

Contrastes verificados (mínimo 4.5): dark text 15.2/13.0 · text2 8.5/7.3 · accent 5.5/4.8 · ink/accent 5.6 · blanco/green 4.9 · danger 5.9. Light text 16.2/17.1 · text2 6.0/6.6 · accent 5.4/5.9 · ink/accent 5.7 · ink/green 7.2 · danger 6.1.

Mapa de uso: textos sobre `bg`/`surface` · CTA sólido `accent` + `ink`, hover solo brillo · links `accent` con subrayado solo en hover · pills solo tecnologías (`bg-soft` + `text2`) · foco visible anillo `accent` en todo.

## Espaciado

Escala cerrada: `--space-1 0.25` · `--space-2 0.5` · `--space-3 0.75` · `--space-4 1` · `--space-5 1.5` · `--space-6 2.5` · `--space-7 4` (rem). Nada fuera de escala salvo tamaños fijos de componente (paddings internos de botón, alto de icon-button).

Mapa: micro (meta, detalles) `space-1` · elementos chicos y filas de botones/links `space-2`/`space-3` · título→contenido `space-2`, título→bloque `space-3` · en cards, entre grupos `space-3` · entre cards y bloques `space-4` · secciones de página `space-5`/`space-6` · aire de página especial (404) `space-7`.

Layout: `--page 70rem` + `--gutter 1.25rem` compartidos por header, footer, home, search, resultados y detalle (todos con el mismo lateral). Perfil mantiene 44rem de lectura con el mismo gutter. Detalle: contenedor flex en columna con `gap space-5` y todo el aire en su `padding` — breadcrumb, header y secciones sin margins de flujo.

## Componentes

- Botones: `btn` + `btn-primary` / `btn-ghost` / `btn-sm`. Icon-buttons circulares ghost (transparentes, fondo suave en hover) de 2.5rem (`icon-btn`, activo en acento). Sin transforms en hover.
- Cards: fondo sólido sutil, sin bordes, radius `--r-lg`. Card de empleo entera link (stretched-link en el título, fav por encima con `z-index`, sin anidado).
- Separador de meta: `·` en card y detalle.
- Paginación circular, activa en acento sólido.
- Theme: `useTheme` + `ThemeToggle`, default del sistema, persiste `laburodev-theme`, script anti-flash en `index.html`.
- Favoritos: zustand + `persist` (`laburodev-favorites`). Sin puerta de login hasta auth real. Aplicar eliminado hasta backend real.
- Carga: `Skeleton` base (pulso igual al `animate-pulse` de tailwind: opacidad 1↔0.5, 2s) + skeletons de layout por página: `RouteFallback` elige según ruta (`HomePageSkeleton` con hero + filas, `SearchPageSkeleton` con buscador + resultados, `JobDetailPageSkeleton` con la forma del detalle, `PageSkeleton` neutro y alto para el resto) · en datos: `SearchResultsSkeleton` (conteo + N `JobCardSkeleton` con fav + paginación) y `JobDetailSkeleton` (breadcrumb, título, meta, 4 secciones) · `Spinner` (lucide) reservado para acciones puntuales (botones), no para páginas. Todo con `role="status"` y sin animación si `prefers-reduced-motion`.

## Íconos

Solo **lucide-react** (Search, ChevronLeft/Right, Sun, Moon, User, Heart, X, Building2, MapPin, Signal). Cero emojis y cero SVG manuales en `src`. Los íconos heredan `currentColor`.

## Textos

Parseos de valores API→UI en `src/constants/` (mapa + función con fallback al valor original).

## Prohibido (patrones IA)

Blanco puro (`#fff`) y negro puro (`#000`) en cualquier token · Guiones largos `—` en cualquier copy · Gradientes violeta/azul · glassmorphism/blur · 3 cards iguales en fila · sans genéricas (Inter) · hero centrado título+subtítulo+botón · itálicas en títulos · labels en mayúsculas con letter-spacing · sobrecarga de etiquetas · bordes fuertes (solo fondos sólidos sutiles) · pesos fuera de 400/500.
