import { describe, it, expect, vi } from 'vitest'
import { queryClient } from '../query-client'

describe('queryClient', () => {
  it('queryClient should disable retries when in test environment', () => {
    const defaultOptions = queryClient.getDefaultOptions()
    expect(defaultOptions.queries?.retry).toBe(false)
    expect(defaultOptions.mutations?.retry).toBe(false)
  })

  it('queryClient should use 3 retries for queries when not in test environment', async () => {
    vi.stubEnv('MODE', 'production')
    vi.resetModules()
    const { queryClient: prodClient } = await import('../query-client')
    const defaultOptions = prodClient.getDefaultOptions()
    expect(defaultOptions.queries?.retry).toBe(3)
    vi.unstubAllEnvs()
    vi.resetModules()
  })
})
