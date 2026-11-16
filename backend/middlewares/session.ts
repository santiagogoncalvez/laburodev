import { fromNodeHeaders } from "better-auth/node";
import type { Request } from "express";

import { auth } from "@/auth.js";

/**
 * UserId de la sesión en la request, o null si no hay sesión válida.
 * Las rutas protegidas responden 401 cuando devuelva null.
 */
export async function getSessionUserId(req: Request): Promise<string | null> {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  return session ? session.user.id : null;
}
