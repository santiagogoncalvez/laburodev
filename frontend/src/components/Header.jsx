import { NavLink } from 'react-router'
import { Link } from './Link'
import { ThemeToggle } from './ThemeToggle'
import { useAuthStore } from '../store/authStore'
import { useFavoritesStore } from '../store/favoritesStore'

export function Header () {
  const { isLoggedIn } = useAuthStore()
  const { countFavorites } = useFavoritesStore()

  const numberOfFavorites = countFavorites()

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
  const { isLoggedIn, logout } = useAuthStore()
  const { clearFavorites } = useFavoritesStore()

  const handleLogout = () => {
    logout()
    clearFavorites()
  }

  if (!isLoggedIn) return null

  return <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Cerrar sesión</button>
}
