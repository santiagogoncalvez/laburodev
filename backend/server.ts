// Punto de entrada para el contenedor (Docker punto 2 — Fase 0).
// app.js exporta la app y NO hace listen() si NODE_ENV=production (guard serverless
// de Vercel). Este archivo importa esa app y la deja escuchando siempre, que es lo
// que un contenedor necesita. En serverless (Vercel sin Docker) sigue usándose app.js.
import app from "./app.js";
import { DEFAULTS } from "./config.js";

const PORT = process.env.PORT ?? DEFAULTS.PORT;

app.listen(PORT, () => {
  console.log(`Server is running on port http://localhost:${PORT}`);
});
