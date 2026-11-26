import { fromNodeHeaders } from "better-auth/node";
import type { Request } from "express";

import { auth } from "@/auth.js";
import type { UserRole } from "@/types/index.js";

// Cualquier valor inesperado se trata como candidate: un rol desconocido
// nunca habilita permisos de escritura (fail-safe).
function normalizeRole(value: unknown): UserRole {
  return value === "recruiter" ? "recruiter" : "candidate";
}

/** Identidad completa de la sesión, con una sola consulta a Better Auth. */
export async function getSessionIdentity(
  req: Request,
): Promise<{ userId: string; role: UserRole } | null> {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  if (!session) return null;

  return {
    userId: session.user.id,
    role: normalizeRole(session.user.role),
  };
}

/** UserId de la sesión en la request, o null si no hay sesión válida. */
export async function getSessionUserId(req: Request): Promise<string | null> {
  const identity = await getSessionIdentity(req);
  return identity ? identity.userId : null;
}

/** Rol de la sesión (Etapa C), o null si no hay sesión válida. */
export async function getSessionUserRole(
  req: Request,
): Promise<UserRole | null> {
  const identity = await getSessionIdentity(req);
  return identity ? identity.role : null;
}
