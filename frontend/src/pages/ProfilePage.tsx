import { User } from 'lucide-react';
import { authClient, useSession } from '@/lib/auth-client';
import { useFavoritesStore } from '@/store/favoritesStore';
import styles from './ProfilePage.module.css';

export default function Profile() {
  // ProtectedRoute solo deja renderizar con sesión cargada.
  const { data } = useSession();
  const user = data?.user;

  const numberOfFavorites = useFavoritesStore(
    (state) => state.favorites.length,
  );
  const clearFavorites = useFavoritesStore((state) => state.clearFavorites);

  const handleLogout = async () => {
    await authClient.signOut();
    clearFavorites();
    // ProtectedRoute detecta la sesión borrada y redirige a /login.
  };

  return (
    <div
      style={{
        maxWidth: '44rem',
        margin: '0 auto',
        padding: 'var(--space-5) var(--gutter)',
      }}
    >
      <title>Perfil · laburoDev</title>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.avatar}>
            <User />
          </div>
          <h1 className={styles.name}>{user?.name ?? ''}</h1>
          <p className={styles.email}>{user?.email ?? ''}</p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Cuenta</h2>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Nombre completo</span>
              <span className={styles.infoValue}>{user?.name ?? '—'}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Email</span>
              <span className={styles.infoValue}>{user?.email ?? '—'}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Favoritos</span>
              <span className={styles.infoValue}>{numberOfFavorites}</span>
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.logoutButton}
            onClick={handleLogout}
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  );
}
