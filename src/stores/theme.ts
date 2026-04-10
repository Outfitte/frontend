import { create } from 'zustand'

export type Theme = 'light' | 'dark' | 'system'

const THEME_KEY = 'theme'

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
  initTheme: () => void
}

export const useThemeStore = create<ThemeState>(() => ({
  theme: 'system',
  setTheme: (theme: Theme) => {
    localStorage.setItem(THEME_KEY, theme)
    const isDark =
      theme === 'dark' ||
      (theme === 'system' && (window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false))
    document.documentElement.classList.toggle('dark', isDark)
    useThemeStore.setState({ theme })
  },
  initTheme: () => {
    const stored = localStorage.getItem(THEME_KEY)
    const theme: Theme = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system'
    useThemeStore.getState().setTheme(theme)
  },
}))
