import rateLimit from "express-rate-limit";

const generalLimiter = rateLimit({
   windowMs: 15 * 60 * 1000, // 15 minutos
   limit: 100, // 100 peticiones por IP cada 15 min
   message: { error: "Demasiadas peticiones, por favor intenta de nuevo más tarde." },
   legacyHeaders: false,
   standardHeaders: "draft-8",
});

const createSpecificLimiter = ({ windowMs, limit, message }) =>
   rateLimit({
      windowMs,
      limit,
      message: { error: message },
      legacyHeaders: false,
      standardHeaders: "draft-8",
   });

export const aiRateLimiter = createSpecificLimiter({
   windowMs: 60 * 1000, // 1 minuto
   limit: 5, // 5 peticiones por IP por minuto
   message: "Demasiadas solicitudes de IA, por favor intenta de nuevo más tarde.",
});

export { generalLimiter, createSpecificLimiter };