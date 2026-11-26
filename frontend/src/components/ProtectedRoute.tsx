import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { RouteFallback } from '@/components/RouteFallback';
import { useSession } from '@/lib/auth-client';
import { getUserRole, type UserRole } from '@/types/api';

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
  /** Etapa C: si se pide un rol y el usuario no lo tiene, vuelve a /search.
   *  Se llama requiredRole y no role para no chocar con el atributo ARIA. */
  requiredRole?: UserRole;
}

export function ProtectedRoute({
  children,
  redirectTo = '/login',
  requiredRole,
}: ProtectedRouteProps) {
  const { data, isPending } = useSession();

  // Cargando la sesión: no redirigimos todavía (evita el flash a /login).
  if (isPending) return <RouteFallback />;

  if (!data) {
    return <Navigate to={redirectTo} replace />;
  }

  // Hay sesión pero no el rol pedido → "/search", no "/login".
  if (requiredRole && getUserRole(data.user) !== requiredRole) {
    return <Navigate to="/search" replace />;
  }

  return children;
}
