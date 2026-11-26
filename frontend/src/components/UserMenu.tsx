import { User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { authClient, useSession } from '@/lib/auth-client';
import { useFavoritesStore } from '@/store/favoritesStore';
import { getUserRole } from '@/types/api';
import { Link } from './Link';

export function UserMenu() {
  const { data: session, isPending } = useSession();
  const clearFavorites = useFavoritesStore((state) => state.clearFavorites);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const isRecruiter = session
    ? getUserRole(session.user) === 'recruiter'
    : false;

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  // Sin sesión definida aún: no mostramos el botón (evita el parpadeo).
  if (isPending) return null;

  // Sin sesión confirmada: acceso a login como hasta ahora.
  if (!session) {
    return (
      <Link href="/login" className="btn btn-ghost btn-sm">
        Iniciar sesión
      </Link>
    );
  }

  const handleLogout = async () => {
    setOpen(false);
    await authClient.signOut();
    clearFavorites();
  };

  const handleAccount = () => {
    setOpen(false);
    navigate('/profile');
  };

  const handlePublish = () => {
    setOpen(false);
    navigate('/jobs/new');
  };

  return (
    <div className="user-menu">
      <button
        type="button"
        className="theme-toggle"
        aria-label="Menú de cuenta"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <User size={18} />
      </button>

      {open && (
        <>
          <div
            className="user-menu-backdrop"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="user-menu-panel" role="menu">
            {isRecruiter && (
              <button type="button" role="menuitem" onClick={handlePublish}>
                Publicar empleo
              </button>
            )}
            <button type="button" role="menuitem" onClick={handleAccount}>
              Cuenta
            </button>
            <button type="button" role="menuitem" onClick={handleLogout}>
              Cerrar sesión
            </button>
          </div>
        </>
      )}
    </div>
  );
}
