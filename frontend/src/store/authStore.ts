import { create } from 'zustand';

interface AuthState {
  // Estado
  isLoggedIn: boolean;

  // Acciones
  login: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  // Estado
  isLoggedIn: false,

  // Acciones
  login: () => set({ isLoggedIn: true }),
  logout: () => set({ isLoggedIn: false }),
}));
