import { Heart, X } from 'lucide-react';
import { useEffect, useId } from 'react';
import { Link, useLocation } from 'react-router';

import { useFavoritesStore } from '@/store/favoritesStore';
import styles from './FavoriteLoginModal.module.css';

/**
 * Gate de favoritos: sin sesión, agregar un favorito abre este modal.
 * Los CTAs navegan a /register y /login; al volver a haber sesión el
 * favorito pendiente se guarda solo (ver useFavoritesSync).
 */
export function FavoriteLoginModal() {
  const titleId = useId();
  const location = useLocation();
  const open = useFavoritesStore((state) => state.loginModalOpen);
  const hideLoginModal = useFavoritesStore((state) => state.hideLoginModal);
  const dismissLoginModal = useFavoritesStore(
    (state) => state.dismissLoginModal,
  );

  // Navegar cierra el modal y deja el pendiente vivo para el auto-guardo.
  // biome-ignore lint/correctness/useExhaustiveDependencies: location es el disparador: el efecto corre en cada navegación
  useEffect(() => {
    hideLoginModal();
  }, [location, hideLoginModal]);

  // Escape descarta de verdad: cierra y olvida el pendiente.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismissLoginModal();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, dismissLoginModal]);

  if (!open) return null;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: el teclado cierra con Escape (listener global) y con el botón X; el click en el fondo es atajo extra
    <div
      className={styles.overlay}
      role="presentation"
      onClick={(event) => {
        // Click en el fondo (no en la card) = descartar.
        if (event.target === event.currentTarget) dismissLoginModal();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') dismissLoginModal();
      }}
    >
      <div
        className={styles.card}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <button
          type="button"
          className={`icon-btn ${styles.close}`}
          aria-label="Cerrar"
          onClick={dismissLoginModal}
        >
          <X size={18} />
        </button>

        <Heart size={24} className={styles.heart} aria-hidden="true" />
        <h2 id={titleId} className={styles.title}>
          Guarda tus favoritos en tu cuenta
        </h2>
        <p className={styles.text}>
          Crea una cuenta gratis para guardar empleos y volver a verlos desde
          cualquier dispositivo.
        </p>

        <div className={styles.actions}>
          <Link to="/register" className="btn btn-primary">
            Crear cuenta gratis
          </Link>
          <p className={styles.footer}>
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className={styles.link}>
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
