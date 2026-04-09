import { create } from 'zustand'

interface AuthState {
  token: string | null
  refreshToken: string | null
  setAuth: (token: string, refreshToken: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  refreshToken: null,
  setAuth: (token, refreshToken) => set({ token, refreshToken }),
  clearAuth: () => set({ token: null, refreshToken: null }),
}))
