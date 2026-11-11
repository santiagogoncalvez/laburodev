// URL base de la API. En deploy se define con VITE_API_URL.
// En local cae a localhost para correr sin configurar nada.
export const API_URL =
   import.meta.env.VITE_API_URL ?? "http://localhost:3000";
