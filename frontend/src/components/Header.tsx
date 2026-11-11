import { NavLink } from 'react-router'
import { Link } from './Link'
import { ThemeToggle } from './ThemeToggle'
import { useAuthStore } from '../store/authStore'
import { useFavoritesStore } from '../store/favoritesStore'

export function Header () {
  // Selectores por valor: re-render solo cuando cambia lo que se usa en render
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn)
  const numberOfFavorites = useFavoritesStore((state) => state.favorites.length)

  return (
    <header>
      <div className="header-inner">
        <div className="header-left">
          <Link href='/' className="brand">
            laburoDev
          </Link>

          <nav>
            <NavLink
              className={({ isActive }) => isActive ? 'nav-link-active' : ''}
              to="/search">Empleos</NavLink>
              {
                isLoggedIn && (
                  <NavLink
                    className={({ isActive }) => isActive ? 'nav-link-active' : ''}
                    to="/profile">
                      Perfil {numberOfFavorites > 0 && `(${numberOfFavorites})`}
                  </NavLink>
                )
              }
          </nav>
        </div>

        <div className="header-actions">
          <ThemeToggle />
          <HeaderUserButton />
        </div>
      </div>

    </header>
  )
}

const HeaderUserButton = () => {
  // Selectores: acciones estables (referencias fijas) no disparan renders
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn)
  const logout = useAuthStore((state) => state.logout)
  const clearFavorites = useFavoritesStore((state) => state.clearFavorites)

  const handleLogout = () => {
    logout()
    clearFavorites()
  }

  if (!isLoggedIn) return null

  return <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Cerrar sesión</button>
}
