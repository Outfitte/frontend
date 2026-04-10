import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}))

describe('toast', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('toast.error should call sonner toast.error with message when invoked', async () => {
    const { toast } = await import('@/lib/toast')
    const { toast: sonnerToast } = await import('sonner')

    toast.error('Something went wrong')

    expect(sonnerToast.error).toHaveBeenCalledWith('Something went wrong')
  })

  it('toast.success should call sonner toast.success with message when invoked', async () => {
    const { toast } = await import('@/lib/toast')
    const { toast: sonnerToast } = await import('sonner')

    toast.success('Operation completed')

    expect(sonnerToast.success).toHaveBeenCalledWith('Operation completed')
  })

  it('toast.info should call sonner toast.info with message when invoked', async () => {
    const { toast } = await import('@/lib/toast')
    const { toast: sonnerToast } = await import('sonner')

    toast.info('Here is some information')

    expect(sonnerToast.info).toHaveBeenCalledWith('Here is some information')
  })
})
