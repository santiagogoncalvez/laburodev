import { NavLink } from 'react-router';
import { authClient, useSession } from '@/lib/auth-client';
import { useFavoritesStore } from '@/store/favoritesStore';
import { Link } from './Link';
import { ThemeToggle } from './ThemeToggle';

export function Header() {
  const { data: session } = useSession();
  const numberOfFavorites = useFavoritesStore(
    (state) => state.favorites.length,
  );

  return (
    <header>
      <div className="header-inner">
        <div className="header-left">
          <Link href="/" className="brand">
            laburoDev
          </Link>

          <nav>
            <NavLink
              className={({ isActive }) => (isActive ? 'nav-link-active' : '')}
              to="/search"
            >
              Empleos
            </NavLink>
            {session && (
              <NavLink
                className={({ isActive }) =>
                  isActive ? 'nav-link-active' : ''
                }
                to="/profile"
              >
                Perfil {numberOfFavorites > 0 && `(${numberOfFavorites})`}
              </NavLink>
            )}
          </nav>
        </div>

        <div className="header-actions">
          <ThemeToggle />
          <HeaderUserButton />
        </div>
      </div>
    </header>
  );
}

const HeaderUserButton = () => {
  const { data: session, isPending } = useSession();
  const clearFavorites = useFavoritesStore((state) => state.clearFavorites);

  // Sin sesión definida aún: no mostramos botones (evita el parpadeo).
  if (isPending) return null;

  if (!session) {
    return (
      <Link href="/login" className="btn btn-ghost btn-sm">
        Iniciar sesión
      </Link>
    );
  }

  const handleLogout = async () => {
    await authClient.signOut();
    clearFavorites();
  };

  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      onClick={handleLogout}
    >
      Cerrar sesión
    </button>
  );
};
