import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useAuthStore } from '@/store/authStore';

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);

  if (!isLoggedIn) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}
