import { NavLink } from 'react-router';
import { Link } from './Link';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

export function Header() {
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
          </nav>
        </div>

        <div className="header-actions">
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
