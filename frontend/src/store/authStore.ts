import { create } from 'zustand';

interface AuthState {
  token: string | null;
  role: string | null;
  setAuth: (token: string, role?: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('token'),
  role: localStorage.getItem('role') || localStorage.getItem('userRole'),
  setAuth: (token, role) => {
    localStorage.setItem('token', token);
    if (role) {
      localStorage.setItem('role', role);
      localStorage.setItem('userRole', role);
    }
    set({ token, role: role ?? null });
  },
  clearAuth: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userRole');
    set({ token: null, role: null });
  },
}));
