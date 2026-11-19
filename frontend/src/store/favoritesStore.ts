import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { deleteFavorite, postFavorite } from '@/lib/favoritesApi';

interface FavoritesState {
  // Estado
  favorites: string[];
  /** Con sesión activa, el toggle también sincroniza con el servidor. */
  loggedIn: boolean;
  /** La sesión ya resolvió (isPending terminó): habilita el gate de favoritos. */
  sessionReady: boolean;
  /** Modal "iniciá sesión para guardar favoritos". */
  loginModalOpen: boolean;
  /** jobId intentado sin sesión: se guarda solo al autenticarse. */
  pendingFavorite: string | null;

  // Acciones
  setFavorites: (favorites: string[]) => void;
  setLoggedIn: (loggedIn: boolean) => void;
  setSessionReady: (sessionReady: boolean) => void;
  /** Abrir el modal de login registrando el favorito pendiente. */
  showLoginModal: (jobId: string) => void;
  /** Cerrar manteniendo el pendiente (navegación: se guarda al volver a haber sesión). */
  hideLoginModal: () => void;
  /** Cerrar y descarta el pendiente (cancelación explícita del usuario). */
  dismissLoginModal: () => void;
  clearFavorites: () => void;
  addFavorite: (jobId: string) => void;
  removeFavorite: (jobId: string) => void;
  isFavorite: (jobId: string) => boolean;
  toggleFavorite: (jobId: string) => void;
  countFavorites: () => number;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      // Estado
      favorites: [],
      loggedIn: false,
      sessionReady: false,
      loginModalOpen: false,
      pendingFavorite: null,

      setFavorites: (favorites) => set({ favorites }),
      setLoggedIn: (loggedIn) => set({ loggedIn }),
      setSessionReady: (sessionReady) => set({ sessionReady }),
      showLoginModal: (jobId) =>
        set({ loginModalOpen: true, pendingFavorite: jobId }),
      hideLoginModal: () => set({ loginModalOpen: false }),
      dismissLoginModal: () =>
        set({ loginModalOpen: false, pendingFavorite: null }),

      clearFavorites: () => {
        set({ favorites: [] });
      },

      // Acciones
      addFavorite: (jobId) => {
        set((state) => ({
          favorites: state.favorites.includes(jobId)
            ? state.favorites
            : [...state.favorites, jobId],
        }));
      },

      removeFavorite: (jobId) => {
        set((state) => ({
          favorites: state.favorites.filter((id) => id !== jobId),
        }));
      },

      isFavorite: (jobId) => {
        return get().favorites.includes(jobId);
      },

      toggleFavorite: (jobId) => {
        const {
          addFavorite,
          removeFavorite,
          isFavorite,
          loggedIn,
          sessionReady,
          showLoginModal,
        } = get();

        // Sesión aún resolviendo: no adivinar (evita modal falso con sesión).
        if (!sessionReady) return;

        const isFav = isFavorite(jobId);

        if (!loggedIn) {
          // Legacy: lo heredado del flujo anterior se puede quitar localmente.
          // Agregar requiere cuenta: abre el modal de registro/login.
          if (isFav) {
            removeFavorite(jobId);
            return;
          }
          showLoginModal(jobId);
          return;
        }

        isFav ? removeFavorite(jobId) : addFavorite(jobId);
        // Optimista: si falla, el merge del próximo inicio de sesión corrige.
        void (isFav ? deleteFavorite(jobId) : postFavorite(jobId)).catch(() => {
          // Sin red o API caída: lo sincroniza useFavoritesSync.
        });
      },

      countFavorites: () => get().favorites.length,
    }),
    {
      name: 'laburodev-favorites',
      partialize: (state) => ({ favorites: state.favorites }),
    },
  ),
);
