import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { RouteFallback } from '@/components/RouteFallback';
import { useSession } from '@/lib/auth-client';

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const { data, isPending } = useSession();

  // Cargando la sesión: no redirigimos todavía (evita el flash a /login).
  if (isPending) return <RouteFallback />;

  if (!data) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}
