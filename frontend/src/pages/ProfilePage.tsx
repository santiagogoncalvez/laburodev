import { User } from 'lucide-react';
import { useState } from 'react';
import { authClient, useSession } from '@/lib/auth-client';
import { useFavoritesStore } from '@/store/favoritesStore';
import { getUserRole } from '@/types/api';
import styles from './ProfilePage.module.css';

export default function Profile() {
  // ProtectedRoute solo deja renderizar con sesión cargada.
  const { data } = useSession();
  const user = data?.user;
  const isRecruiter = getUserRole(user) === 'recruiter';
  const [upgrading, setUpgrading] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);

  const handleUpgrade = async () => {
    setUpgrading(true);
    setRoleError(null);
    // name viaja con su valor actual: el cliente tipado exige un campo
    // conocido y el servidor acepta `role` como additionalField.
    const payload = { name: user?.name, role: 'recruiter' };
    const { error } = await authClient.updateUser(payload);
    setUpgrading(false);
    if (error) {
      setRoleError('No se pudo actualizar el rol. Intentá de nuevo.');
      return;
    }
    // Refresca la sesión para que el menú muestre "Publicar empleo" ya mismo.
    await authClient.getSession();
  };

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
              <span className={styles.infoLabel}>Rol</span>
              <span className={styles.infoValue}>
                {isRecruiter ? 'Recruiter' : 'Candidate'}
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Favoritos</span>
              <span className={styles.infoValue}>{numberOfFavorites}</span>
            </div>
          </div>
        </div>

        {roleError && (
          <p className={styles.roleError} role="alert">
            {roleError}
          </p>
        )}

        <div className={styles.actions}>
          {!isRecruiter && (
            <button
              type="button"
              className={styles.editButton}
              onClick={handleUpgrade}
              disabled={upgrading}
            >
              {upgrading ? 'Actualizando…' : 'Quiero publicar empleos'}
            </button>
          )}
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
