# laburoDev · Frontend

Bolsa de trabajo para desarrolladores. React + Vite + react-router + zustand.

## Correr

```bash
npm install
npm run dev
```

La app consume la API en `VITE_API_URL` (ver `.env.example`). Sin configurar nada usa `http://localhost:3000`.

## Rutas

- `/` home + buscador
- `/search` resultados con filtros y paginación
- `/jobs/:jobId` detalle
- `/login`, `/register`, `/profile` (mock local con zustand, sin backend todavía)
