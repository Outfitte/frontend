import { describe, it, expect, vi, beforeEach } from 'vitest'
import { toast } from '@/lib/toast'
import { toast as sonnerToast } from 'sonner'

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

  it('toast.error should call sonner toast.error with message when invoked', () => {
    toast.error('Something went wrong')

    expect(sonnerToast.error).toHaveBeenCalledWith('Something went wrong', undefined)
  })

  it('toast.success should call sonner toast.success with message when invoked', () => {
    toast.success('Operation completed')

    expect(sonnerToast.success).toHaveBeenCalledWith('Operation completed', undefined)
  })

  it('toast.info should call sonner toast.info with message when invoked', () => {
    toast.info('Here is some information')

    expect(sonnerToast.info).toHaveBeenCalledWith('Here is some information', undefined)
  })
})
