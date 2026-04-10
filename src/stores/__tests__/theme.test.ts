import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useThemeStore } from '@/stores/theme'

describe('theme store', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
    useThemeStore.setState({ theme: 'system' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('theme store should default to system when no localStorage value exists', () => {
    expect(useThemeStore.getState().theme).toBe('system')
  })

  it('setTheme should add dark class to documentElement and persist to localStorage when called with dark', () => {
    useThemeStore.getState().setTheme('dark')

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('theme')).toBe('dark')
    expect(useThemeStore.getState().theme).toBe('dark')
  })

  it('setTheme should remove dark class from documentElement and persist to localStorage when called with light', () => {
    document.documentElement.classList.add('dark')

    useThemeStore.getState().setTheme('light')

    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(localStorage.getItem('theme')).toBe('light')
    expect(useThemeStore.getState().theme).toBe('light')
  })

  it('setTheme should add dark class when called with system and prefers-color-scheme is dark', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))

    useThemeStore.getState().setTheme('system')

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('theme')).toBe('system')
    expect(useThemeStore.getState().theme).toBe('system')
  })

  it('setTheme should remove dark class when called with system and prefers-color-scheme is light', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))

    document.documentElement.classList.add('dark')

    useThemeStore.getState().setTheme('system')

    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(localStorage.getItem('theme')).toBe('system')
    expect(useThemeStore.getState().theme).toBe('system')
  })

  it('initTheme should restore dark theme and apply dark class when localStorage has dark', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    localStorage.setItem('theme', 'dark')
    useThemeStore.setState({ theme: 'system' })

    useThemeStore.getState().initTheme()

    expect(useThemeStore.getState().theme).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('initTheme should restore light theme and remove dark class when localStorage has light', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    document.documentElement.classList.add('dark')
    localStorage.setItem('theme', 'light')
    useThemeStore.setState({ theme: 'system' })

    useThemeStore.getState().initTheme()

    expect(useThemeStore.getState().theme).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('initTheme should default to system when localStorage has no theme', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))

    useThemeStore.getState().initTheme()

    expect(useThemeStore.getState().theme).toBe('system')
  })
})
