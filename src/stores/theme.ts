import { create } from 'zustand'

export type Theme = 'light' | 'dark' | 'system'

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
  initTheme: () => void
}

export const useThemeStore = create<ThemeState>(() => ({
  theme: 'system',
  setTheme: (theme: Theme) => {
    localStorage.setItem('theme', theme)
    const isDark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.classList.toggle('dark', isDark)
    useThemeStore.setState({ theme })
  },
  initTheme: () => {
    const stored = localStorage.getItem('theme') as Theme | null
    const theme: Theme = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system'
    useThemeStore.getState().setTheme(theme)
  },
}))
