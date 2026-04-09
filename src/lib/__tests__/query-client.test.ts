import { describe, it, expect } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { queryClient } from '../query-client'

describe('queryClient', () => {
  it('should disable retries when in test environment', () => {
    const defaultOptions = queryClient.getDefaultOptions()
    expect(defaultOptions.queries?.retry).toBe(false)
    expect(defaultOptions.mutations?.retry).toBe(false)
  })

  it('should be an instance of QueryClient', () => {
    expect(queryClient).toBeInstanceOf(QueryClient)
  })
})
